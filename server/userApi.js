// Customer data that follows a signed-in customer across visits. For now: the
// wishlist (saved deals), stored per verified phone number. No database yet -
// Cloudflare KV (USERS_KV) in production, memory locally.
//
//   GET  /api/session            -> 200 { phone } | 401   who is signed in (restores sign-in on reload)
//   POST /api/session/logout     -> 200                   ends the session, clears the cookie
//   GET  /api/me/saved           -> 200 { ids } | 401     saved deal ids
//   PUT  /api/me/saved { ids }   -> 200 { ids } | 401     replaces the saved deal ids
//
// Only deal ids are stored; the website looks the deals up in the live catalog,
// so expired deals simply drop out.
import { endSession, sessionPhone } from "./session.js";

const MAX_SAVED = 200;

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

const signedOut = () => json({ error: "Please sign in." }, 401);

export async function getSession(request, store) {
  const phone = await sessionPhone(request, store);
  return phone ? json({ phone }) : signedOut();
}

export async function logout(request, store) {
  return json({ ok: true }, 200, { "set-cookie": await endSession(request, store) });
}

export async function getSaved(request, store) {
  const phone = await sessionPhone(request, store);
  if (!phone) return signedOut();
  const saved = await store.get(`saved:${phone}`);
  return json({ ids: saved?.ids || [] });
}

export async function putSaved(request, store) {
  const phone = await sessionPhone(request, store);
  if (!phone) return signedOut();
  let body = {};
  try {
    body = await request.json();
  } catch {
    /* handled below */
  }
  if (!Array.isArray(body.ids)) return json({ error: "Expected { ids: [...] }." }, 400);
  const ids = [...new Set(body.ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))].slice(0, MAX_SAVED);
  await store.put(`saved:${phone}`, { ids, updatedAt: Date.now() });
  return json({ ids });
}

// Routes the endpoints above; null when the path isn't ours.
export function routeUserRequest(request, store) {
  const { pathname } = new URL(request.url);
  if (pathname === "/api/session" && request.method === "GET") return getSession(request, store);
  if (pathname === "/api/session/logout" && request.method === "POST") return logout(request, store);
  if (pathname === "/api/me/saved" && request.method === "GET") return getSaved(request, store);
  if (pathname === "/api/me/saved" && request.method === "PUT") return putSaved(request, store);
  return null;
}
