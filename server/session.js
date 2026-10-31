// Signed-in sessions for customers who proved their number with a WhatsApp
// code. The browser gets a random token in an HttpOnly cookie (page scripts
// can't read it); the server keeps only a SHA-256 hash of the token, mapped to
// the phone number, for 30 days or until sign-out.
//
// Only WhatsApp sign-in creates sessions: it is the one option the server
// verifies today. Email sign-in is still a demo, and Google's token isn't
// checked by the server yet, so neither can be trusted to open stored data.

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

// Starts a session for a verified phone number; returns the Set-Cookie value.
export async function startSession(request, store, phone) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  await store.put(await sessionKey(token), { phone, createdAt: Date.now() }, SESSION_SECONDS);
  return cookie(request, token, SESSION_SECONDS);
}

// The signed-in phone number for this request, or "".
export async function sessionPhone(request, store) {
  const token = readToken(request);
  if (!token) return "";
  const session = await store.get(await sessionKey(token));
  return session?.phone || "";
}

// Ends the session (if any); returns the Set-Cookie value that clears it.
export async function endSession(request, store) {
  const token = readToken(request);
  if (token) await store.delete(await sessionKey(token));
  return cookie(request, "", 0);
}
