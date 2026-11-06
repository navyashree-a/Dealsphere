// Signed-in sessions for customers the server has verified: a WhatsApp code
// (server/whatsappOtp.js) or a Google ID token (server/googleAuth.js). The
// browser gets a random token in an HttpOnly cookie (page scripts can't read
// it); the server keeps only a SHA-256 hash of the token, mapped to the
// account, for 30 days or until sign-out.
//
// Email sign-in is still a demo and never creates a session, so it can't open
// stored data.

export const SESSION_COOKIE = "ds_session";
export const SESSION_DAYS = 30;
const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60;

const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
const sha256Hex = async (text) => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))));
const sessionKey = async (token) => `session:${await sha256Hex(token)}`;

const cookie = (request, value, maxAge) => {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
};

const readToken = (request) => {
  const header = request.headers.get("cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([a-f0-9]{64})(?:;|$)`));
  return match ? match[1] : "";
};

// Starts a session; returns the Set-Cookie value. `who` is a verified phone
// number (WhatsApp) or { account, provider, email, name, picture } (Google).
export async function startSession(request, store, who) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  const data = typeof who === "string" ? { phone: who } : who;
  await store.put(await sessionKey(token), { ...data, createdAt: Date.now() }, SESSION_SECONDS);
  return cookie(request, token, SESSION_SECONDS);
}

// The signed-in session for this request, or null. `account` is the key the
// customer's saved data is stored under: the phone number for WhatsApp
// (unchanged from before Google sign-in existed) or "google:<id>".
export async function sessionAccount(request, store) {
  const token = readToken(request);
  if (!token) return null;
  const session = await store.get(await sessionKey(token));
  if (session?.phone) return { account: session.phone, provider: "whatsapp", phone: session.phone };
  if (session?.account) return { ...session, provider: session.provider || "google" };
  return null;
}

// Ends the session (if any); returns the Set-Cookie value that clears it.
export async function endSession(request, store) {
  const token = readToken(request);
  if (token) await store.delete(await sessionKey(token));
  return cookie(request, "", 0);
}
