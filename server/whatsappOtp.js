// WhatsApp sign-in codes, sent through Pinnacle (Pinbot) using the approved
// Authentication template. Same contract as src/auth/whatsappOtp.js:
//
//   POST /api/otp/whatsapp/send    { phone }        -> 200 { expiresIn }
//   POST /api/otp/whatsapp/verify  { phone, code }  -> 200 { phone, name } | 4xx { error }
//
// The code is made here, never in the browser. Only a salted SHA-256 hash of it
// is stored (Cloudflare KV binding OTP_KV in production, memory locally), with
// a 5-minute expiry, at most 5 wrong tries, and limits on how often a number
// can request codes.
//
// Settings (Cloudflare: wrangler.toml [vars] + the PINNACLE_API_KEY secret;
// local: .env.local):
//   PINNACLE_API_URL          host (https://partnersv1.pinbot.ai) or full /v3/<id>/messages URL
//   PINNACLE_WABA_NUMBER_ID   the WhatsApp phone-number ID (not the phone number)
//   PINNACLE_API_KEY          SECRET - sent in the `apikey` header; never in code or git
//   PINNACLE_OTP_TEMPLATE     approved Authentication template name
//   PINNACLE_OTP_LANGUAGE     template language code (default "en")
//   PINNACLE_OTP_BUTTON       "1" when the template has a Copy-code button (default "1")
// Request format matches Tamada's working Pinnacle integration (Meta Cloud API
// style, `apikey` header).
//
// Without these settings: local development returns the code on screen
// (clearly labelled demo); the live site answers "not set up" - it never
// pretends to have sent a message.

export const OTP_TTL_SECONDS = 300;
const MAX_ATTEMPTS = 5;
const RESEND_SECONDS = 30;
const MAX_SENDS_PER_HOUR = 5;
const PHONE_RE = /^\+[1-9]\d{7,14}$/;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

// Pasted settings often carry stray spaces or line breaks - trim everything.
const setting = (env, name) => String(env?.[name] ?? "").trim();

const pinnacleEndpoint = (env) => {
  const base = setting(env, "PINNACLE_API_URL");
  const id = setting(env, "PINNACLE_WABA_NUMBER_ID");
  if (!base) return "";
  if (/\/v\d+\//.test(base)) return base; // a full URL is used as is
  return id ? `${base.replace(/\/+$/, "")}/v3/${encodeURIComponent(id)}/messages` : "";
};

export const isPinnacleConfigured = (env) =>
  Boolean(pinnacleEndpoint(env) && setting(env, "PINNACLE_API_KEY") && setting(env, "PINNACLE_OTP_TEMPLATE"));

// "+919876543210" -> "+91******3210" for logs; never log full numbers or codes.
const maskPhone = (phone) => `${phone.slice(0, 3)}${"*".repeat(Math.max(0, phone.length - 7))}${phone.slice(-4)}`;

const randomCode = () => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(values[0] % 1_000_000).padStart(6, "0");
};

const randomHex = (bytes = 16) => [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");

const sha256Hex = async (text) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

// Compares two equal-length hex strings without stopping at the first difference.
const sameHex = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

// ---------- storage: Cloudflare KV in production, memory locally ----------
export const kvStore = (kv) => ({
  get: async (key) => {
    const value = await kv.get(key);
    return value ? JSON.parse(value) : null;
  },
  // KV needs an expiry at least 60 seconds ahead.
  put: (key, value, ttlSeconds) => kv.put(key, JSON.stringify(value), { expirationTtl: Math.max(60, Math.ceil(ttlSeconds)) }),
  delete: (key) => kv.delete(key),
});

export const memoryStore = () => {
  const map = new Map();
  return {
    get: async (key) => {
      const item = map.get(key);
      if (!item || item.until < Date.now()) return null;
      return item.value;
    },
    put: async (key, value, ttlSeconds) => {
      map.set(key, { value, until: Date.now() + Math.max(60, ttlSeconds) * 1000 });
    },
    delete: async (key) => {
      map.delete(key);
    },
  };
};

// ---------- Pinnacle ----------
const templateBody = (env, to, code) => {
  const components = [{ type: "body", parameters: [{ type: "text", text: code }] }];
  // Authentication templates with a Copy-code button need the code again, for the button.
  if ((setting(env, "PINNACLE_OTP_BUTTON") || "1") === "1") {
    components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] });
  }
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to.replace(/\D/g, ""),
    type: "template",
    template: {
      name: setting(env, "PINNACLE_OTP_TEMPLATE"),
      language: { code: setting(env, "PINNACLE_OTP_LANGUAGE") || "en" },
      components,
    },
  };
};

// Reads Pinnacle's reply. Only short status/error text is kept - the raw body
// can echo the phone number or code.
const readReply = async (response) => {
  const text = await response.text().catch(() => "");
  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  const pick = (v) => (typeof v === "string" || typeof v === "number" ? String(v).replace(/\d{6,}/g, "#").slice(0, 160) : "");
  const reason = pick(body.message) || pick(body.error_message) || pick(body.error?.message) || pick(body.error) || pick(body.status);
  const accepted = Boolean(body.messages?.[0]?.id || body.messageId || body.message_id || body.success === true);
  const rejected = !response.ok || body.success === false || body.status === "failed" || Boolean(body.error) || (!accepted && typeof body.message === "string");
  return { status: response.status, rejected, reason };
};

const sendViaPinnacle = async (env, phone, code, fetchImpl) => {
  const response = await fetchImpl(pinnacleEndpoint(env), {
    method: "POST",
    headers: { "content-type": "application/json", apikey: setting(env, "PINNACLE_API_KEY") },
    body: JSON.stringify(templateBody(env, phone, code)),
    signal: AbortSignal.timeout(10_000),
  });
  const reply = await readReply(response);
  console.log(JSON.stringify({ event: "whatsapp_otp_send", to: maskPhone(phone), status: reply.status, result: reply.rejected ? "rejected" : "accepted", reason: reply.reason || undefined }));
  if (reply.rejected) throw new Error(`Pinnacle ${reply.status}${reply.reason ? `: ${reply.reason}` : ""}`);
};

// ---------- handlers ----------
const readJson = async (request) => {
  try {
    return await request.json();
  } catch {
    return {};
  }
};

const normalisePhone = (value) => {
  const phone = `+${String(value || "").replace(/\D/g, "")}`;
  return PHONE_RE.test(phone) ? phone : "";
};

// deps: { store, fetch, devFallback } - injectable so tests and the local
// server can run without Cloudflare or Pinnacle.
export async function sendOtp(request, env = {}, deps = {}) {
  const store = deps.store;
  const { phone: rawPhone } = await readJson(request);
  const phone = normalisePhone(rawPhone);
  if (!phone) return json({ error: "Enter a valid WhatsApp number." }, 400);

  const configured = isPinnacleConfigured(env);
  if (!configured && !deps.devFallback) {
    return json({ error: "WhatsApp sign-in isn't set up yet. Please use another sign-in option." }, 503);
  }

  // Rate limits: one code per 30 seconds, and a few per hour, per number.
  const now = Date.now();
  const limitKey = `otp-limit:${phone}`;
  const limit = (await store.get(limitKey)) || { sends: [], lastAt: 0 };
  const recent = limit.sends.filter((t) => now - t < 3_600_000);
  if (now - limit.lastAt < RESEND_SECONDS * 1000) {
    return json({ error: `Please wait ${RESEND_SECONDS} seconds before asking for another code.` }, 429);
  }
  if (recent.length >= MAX_SENDS_PER_HOUR) {
    return json({ error: "Too many codes requested for this number. Please try again later." }, 429);
  }

  const code = randomCode();
  const salt = randomHex();
  const record = { hash: await sha256Hex(`${salt}:${phone}:${code}`), salt, expiresAt: now + OTP_TTL_SECONDS * 1000, attempts: 0 };

  if (configured) {
    try {
      await sendViaPinnacle(env, phone, code, deps.fetch || fetch);
    } catch (error) {
      console.warn(JSON.stringify({ event: "whatsapp_otp_error", to: maskPhone(phone), error: String(error.message || error) }));
      return json({ error: "We couldn't send the WhatsApp code. Please try again in a moment." }, 502);
    }
  }

  await store.put(`otp:${phone}`, record, OTP_TTL_SECONDS);
  await store.put(limitKey, { sends: [...recent, now], lastAt: now }, 3600);

  // Local development without Pinnacle: show the code on screen, labelled demo.
  return json(configured ? { expiresIn: OTP_TTL_SECONDS } : { expiresIn: OTP_TTL_SECONDS, demoCode: code });
}

export async function verifyOtp(request, _env, deps = {}) {
  const store = deps.store;
  const body = await readJson(request);
  const phone = normalisePhone(body.phone);
  const code = String(body.code || "").replace(/\D/g, "");
  if (!phone || code.length !== 6) return json({ error: "Enter the 6-digit code." }, 400);

  const key = `otp:${phone}`;
  const record = await store.get(key);
  if (!record) return json({ error: "Please request a new code." }, 400);
  if (Date.now() > record.expiresAt) {
    await store.delete(key);
    return json({ error: "This code has expired. Please request a new one." }, 400);
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    await store.delete(key);
    return json({ error: "Too many incorrect attempts. Please request a new code." }, 429);
  }

  const matches = sameHex(await sha256Hex(`${record.salt}:${phone}:${code}`), record.hash);
  if (!matches) {
    const attempts = record.attempts + 1;
    const left = MAX_ATTEMPTS - attempts;
    if (left <= 0) {
      await store.delete(key);
      return json({ error: "Too many incorrect attempts. Please request a new code." }, 429);
    }
    await store.put(key, { ...record, attempts }, (record.expiresAt - Date.now()) / 1000);
    return json({ error: `That code isn't right. ${left} attempt(s) left.` }, 400);
  }

  await store.delete(key); // a code works once
  console.log(JSON.stringify({ event: "whatsapp_otp_verified", phone: maskPhone(phone) }));
  return json({ phone, name: "" });
}

// Routes POST /api/otp/whatsapp/{send,verify}; null when the path isn't ours.
export function routeOtpRequest(request, env, deps) {
  if (request.method !== "POST") return null;
  const { pathname } = new URL(request.url);
  if (pathname === "/api/otp/whatsapp/send") return sendOtp(request, env, deps);
  if (pathname === "/api/otp/whatsapp/verify") return verifyOtp(request, env, deps);
  return null;
}
