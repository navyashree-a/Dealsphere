// WhatsApp OTP sign-in service.
//
// REAL MODE (VITE_OTP_API_URL is set): the browser only talks to YOUR backend,
// which must:
//   POST {API}/otp/whatsapp/send    { phone }        -> 200 { expiresIn }
//   POST {API}/otp/whatsapp/verify  { phone, code }  -> 200 { name? } | 4xx { error }
// The backend generates the code, stores only a hash with an expiry, sends it
// through the WhatsApp Business Platform (Cloud API) using an approved
// "authentication" message template, rate-limits requests, and creates the
// session. The WhatsApp access token must stay on the server - never put it
// in this frontend.
//
// DEMO MODE (no VITE_OTP_API_URL): no WhatsApp message is sent. A code is
// generated in the browser and shown on screen, clearly labelled as a demo,
// matching the site's existing demo email login. It is not real verification.

export const OTP_API_URL = (import.meta.env.VITE_OTP_API_URL || "").trim().replace(/\/$/, "");
export const isOtpDemo = () => !OTP_API_URL;

export const OTP_LENGTH = 6;
export const RESEND_SECONDS = 30;
const DEMO_EXPIRY_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

// Country codes offered in the phone step. Validation is a basic length check;
// a production backend should validate with a full phone-number library.
export const COUNTRIES = [
  { code: "+91", label: "India (+91)", pattern: /^[6-9]\d{9}$/, hint: "10-digit mobile number" },
  { code: "+971", label: "UAE (+971)", pattern: /^5\d{8}$/, hint: "9-digit mobile number starting with 5" },
  { code: "+1", label: "US / Canada (+1)", pattern: /^\d{10}$/, hint: "10-digit number" },
  { code: "+44", label: "UK (+44)", pattern: /^7\d{9}$/, hint: "10-digit mobile number starting with 7" },
];

export const normalisePhone = (countryCode, number) => `${countryCode}${String(number).replace(/\D/g, "")}`;

// "+919876543210" -> "+91 ••••••3210". Matches the longest known country code
// first, so "+91" isn't confused with "+971" or misread as "+919".
export const maskPhone = (phone) => {
  const country = [...COUNTRIES]
    .sort((a, b) => b.code.length - a.code.length)
    .find((c) => phone.startsWith(c.code));
  const countryCode = country ? country.code : "";
  const rest = phone.slice(countryCode.length);
  return `${countryCode} ${"•".repeat(Math.max(0, rest.length - 4))}${rest.slice(-4)}`.trim();
};

// ---------- demo store (browser memory only) ----------
let demo = null; // { phone, code, expiresAt, attempts }

const randomCode = () => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(values[0] % 10 ** OTP_LENGTH).padStart(OTP_LENGTH, "0");
};

const post = async (path, body) => {
  let response;
  try {
    response = await fetch(`${OTP_API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Couldn't reach the sign-in service. Check your connection and try again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
};

// Resolves with { demoCode? }. In demo mode the code is returned for display.
export async function sendWhatsAppOtp(phone) {
  if (!isOtpDemo()) {
    await post("/otp/whatsapp/send", { phone });
    return {};
  }
  demo = { phone, code: randomCode(), expiresAt: Date.now() + DEMO_EXPIRY_MS, attempts: 0 };
  return { demoCode: demo.code };
}

// Resolves with { phone, name } on success; rejects with a friendly message.
export async function verifyWhatsAppOtp(phone, code) {
  if (!isOtpDemo()) {
    const data = await post("/otp/whatsapp/verify", { phone, code });
    return { phone, name: data.name || "" };
  }
  if (!demo || demo.phone !== phone) throw new Error("Please request a new code.");
  if (Date.now() > demo.expiresAt) {
    demo = null;
    throw new Error("This code has expired. Please request a new one.");
  }
  if (demo.attempts >= MAX_ATTEMPTS) {
    demo = null;
    throw new Error("Too many incorrect attempts. Please request a new code.");
  }
  if (code !== demo.code) {
    demo.attempts += 1;
    const left = MAX_ATTEMPTS - demo.attempts;
    throw new Error(left > 0 ? `That code isn't right. ${left} attempt(s) left.` : "Too many incorrect attempts. Please request a new code.");
  }
  demo = null;
  return { phone, name: "" };
}
