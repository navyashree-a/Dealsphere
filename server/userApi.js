// Customer data that follows a signed-in customer across visits: the wishlist
// (saved deals) and price alerts, stored per verified phone number. No
// database yet - Cloudflare KV (USERS_KV) in production, memory locally.
//
//   GET  /api/session            -> 200 { phone } | 401   who is signed in (restores sign-in on reload)
//   POST /api/session/logout     -> 200                   ends the session, clears the cookie
//   GET  /api/me/saved           -> 200 { ids } | 401     saved deal ids
//   PUT  /api/me/saved { ids }   -> 200 { ids } | 401     replaces the saved deal ids
//   GET  /api/me/alerts          -> 200 { alerts } | 401  price alerts: [{ dealId, targetPrice }]
//   PUT  /api/me/alerts { alerts } -> 200 { alerts } | 401 replaces the price alerts
//
// Only deal ids (and target prices) are stored; the website looks the deals up
// in the live catalog, so expired deals simply drop out.
import { endSession, sessionPhone } from "./session.js";

const MAX_SAVED = 200;
const MAX_ALERTS = 200;
const MAX_TARGET_PRICE = 10_000_000;

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

export async function getAlerts(request, store) {
  const phone = await sessionPhone(request, store);
  if (!phone) return signedOut();
  const saved = await store.get(`alerts:${phone}`);
  return json({ alerts: saved?.alerts || [] });
}

export async function putAlerts(request, store) {
  const phone = await sessionPhone(request, store);
  if (!phone) return signedOut();
  let body = {};
  try {
    body = await request.json();
  } catch {
    /* handled below */
  }
  if (!Array.isArray(body.alerts)) return json({ error: "Expected { alerts: [...] }." }, 400);
  // One alert per deal (the last one wins), with a sensible positive price.
  const byDeal = new Map();
  body.alerts.forEach((alert) => {
    const dealId = Number(alert?.dealId);
    const targetPrice = Number(alert?.targetPrice);
    if (Number.isInteger(dealId) && dealId > 0 && targetPrice > 0 && targetPrice <= MAX_TARGET_PRICE) {
      byDeal.set(dealId, { dealId, targetPrice: Math.round(targetPrice * 100) / 100 });
    }
  });
  const alerts = [...byDeal.values()].slice(0, MAX_ALERTS);
  await store.put(`alerts:${phone}`, { alerts, updatedAt: Date.now() });
  return json({ alerts });
}

// Routes the endpoints above; null when the path isn't ours.
export function routeUserRequest(request, store) {
  const { pathname } = new URL(request.url);
  if (pathname === "/api/session" && request.method === "GET") return getSession(request, store);
  if (pathname === "/api/session/logout" && request.method === "POST") return logout(request, store);
  if (pathname === "/api/me/saved" && request.method === "GET") return getSaved(request, store);
  if (pathname === "/api/me/saved" && request.method === "PUT") return putSaved(request, store);
  if (pathname === "/api/me/alerts" && request.method === "GET") return getAlerts(request, store);
  if (pathname === "/api/me/alerts" && request.method === "PUT") return putAlerts(request, store);
  return null;
}
