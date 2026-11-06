// "Sign in with Google", checked on the server.
//
//   POST /api/session/google { credential } -> 200 { provider, email, name, picture } + session cookie
//                                           -> 400 / 401 / 503 { error }
//
// Google's button gives the browser an ID token (a signed JWT). The browser
// sends it here, and the server only trusts it after checking that:
//   - Google signed it (RS256, against Google's published public keys),
//   - it was issued by accounts.google.com for DealSphere's Client ID,
//   - it hasn't expired, and the email address is verified by Google.
// Then it starts the same HttpOnly session as WhatsApp sign-in, so saved deals
// and price alerts are stored per Google account (keyed by Google's account id,
// "sub", which never changes even if the email does).
//
// The Client ID is public configuration (GOOGLE_CLIENT_ID in wrangler.toml).
// No Client Secret is needed or used.
import { startSession } from "./session.js";

export const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);
const CLOCK_SKEW_SECONDS = 60;
const MAX_CREDENTIAL_LENGTH = 4096;

export const googleClientId = (env = {}) => String(env.GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID || "").trim();

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

const base64UrlBytes = (text) => {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
};
const base64UrlJson = (text) => JSON.parse(new TextDecoder().decode(base64UrlBytes(text)));

// Google's public keys, cached for as long as Google says (Cache-Control max-age).
let cachedKeys = { keys: [], until: 0, fetchedAt: 0 };

export const googleKeyFetcher = (fetchImpl = fetch) => async ({ refresh = false } = {}) => {
  const now = Date.now();
  // A refresh (unknown key id) is allowed at most once a minute.
  if (cachedKeys.until > now && !(refresh && now - cachedKeys.fetchedAt > 60_000)) return cachedKeys.keys;
  const response = await fetchImpl(GOOGLE_CERTS_URL);
  if (!response.ok) throw new Error(`Google keys request failed (${response.status})`);
  const { keys = [] } = await response.json();
  const maxAge = Number((response.headers.get("cache-control") || "").match(/max-age=(\d+)/)?.[1] || 3600);
  cachedKeys = { keys, until: now + maxAge * 1000, fetchedAt: now };
  return keys;
};

const fail = (reason) => Object.assign(new Error(reason), { invalidToken: true });

// Verifies a Google ID token and returns its claims, or throws.
// getKeys({ refresh }) returns Google's JWKs; now is in milliseconds.
export async function verifyGoogleIdToken(credential, { clientId, getKeys, now = Date.now() }) {
  if (!clientId) throw new Error("Google Client ID is not configured");
  if (typeof credential !== "string" || credential.length > MAX_CREDENTIAL_LENGTH) throw fail("malformed token");
  const parts = credential.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) throw fail("malformed token");

  let header;
  let claims;
  try {
    header = base64UrlJson(parts[0]);
    claims = base64UrlJson(parts[1]);
  } catch {
    throw fail("malformed token");
  }
  if (header.alg !== "RS256" || !header.kid) throw fail("unexpected signing algorithm");

  let jwk = (await getKeys()).find((key) => key.kid === header.kid);
  if (!jwk) jwk = (await getKeys({ refresh: true })).find((key) => key.kid === header.kid);
  if (!jwk || jwk.kty !== "RSA") throw fail("unknown signing key");

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "RSA", n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, base64UrlBytes(parts[2]), signed);
  if (!valid) throw fail("bad signature");

  const seconds = now / 1000;
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!ISSUERS.has(claims.iss)) throw fail("wrong issuer");
  if (!audiences.includes(clientId)) throw fail("token is for a different app");
  if (!(Number(claims.exp) > seconds - CLOCK_SKEW_SECONDS)) throw fail("token expired");
  if (Number(claims.iat) > seconds + CLOCK_SKEW_SECONDS) throw fail("token issued in the future");
  if (typeof claims.sub !== "string" || !claims.sub) throw fail("no account id");
  if (!claims.email || !(claims.email_verified === true || claims.email_verified === "true")) throw fail("email not verified");
  return claims;
}

const text = (value, max) => (typeof value === "string" ? value.slice(0, max) : "");
const safePicture = (value) => (typeof value === "string" && /^https:\/\/[a-z0-9.-]+\.googleusercontent\.com\//i.test(value) ? value.slice(0, 500) : "");

// deps: { sessionStore, getKeys?, now? }
export async function signInWithGoogle(request, env = {}, deps = {}) {
  const clientId = googleClientId(env);
  if (!clientId || !deps.sessionStore) return json({ error: "Sign in with Google isn't set up yet." }, 503);

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* handled below */
  }
  if (typeof body.credential !== "string" || !body.credential) return json({ error: "Missing Google sign-in details." }, 400);

  let claims;
  try {
    claims = await verifyGoogleIdToken(body.credential, {
      clientId,
      getKeys: deps.getKeys || googleKeyFetcher(),
      now: deps.now ?? Date.now(),
    });
  } catch (error) {
    if (error.invalidToken) return json({ error: "Google sign-in couldn't be verified. Please try again." }, 401);
    return json({ error: "Couldn't reach Google to check your sign-in. Please try again." }, 502);
  }

  const profile = {
    provider: "google",
    email: text(claims.email, 254),
    name: text(claims.name || claims.given_name, 100),
    picture: safePicture(claims.picture),
  };
  const cookie = await startSession(request, deps.sessionStore, { account: `google:${claims.sub}`, ...profile });
  return json(profile, 200, { "set-cookie": cookie });
}

export function routeGoogleRequest(request, env, deps) {
  const { pathname } = new URL(request.url);
  if (pathname === "/api/session/google" && request.method === "POST") return signInWithGoogle(request, env, deps);
  return null;
}
