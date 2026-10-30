// DealSphere backend: deals API + "View Deal" redirect. No database yet.
//
// The data comes from buildCatalog() in src/data/deals.js: the curated deals
// plus the DUMMY coupon feed (test data). Going live later means changing
// buildCatalog to read a real feed or a database - these endpoints and the
// website stay the same.
//
// Runs on Cloudflare Pages Functions (functions/ folder) in production and
// inside the Vite dev/preview server (vite.config.js) locally. It uses only
// standard Request/Response, so it can move to any hosting platform's
// serverless functions later without changes.
//
//   GET /api/topics             homepage topics with offer counts
//   GET /api/deals              all live deals
//                               (?topic=shoes&type=bank_offer&store=Amazon&category=Travel)
//   GET /api/deals/:id          one live deal
//   GET /go/:id                 302 to that offer's merchant page
import { buildCatalog } from "../src/data/deals.js";
import { summarizeTopics } from "../src/data/topics.js";
import { resolveDealLink } from "../src/utils/dealLink.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

// Adds the redirect URL the website uses for "View Deal".
const toPublicDeal = (deal) => ({ ...deal, goUrl: `/go/${deal.id}` });

const liveDeals = () => buildCatalog(Date.now()).deals;

const findDeal = (id) => {
  const wanted = Number(id);
  return Number.isInteger(wanted) ? liveDeals().find((deal) => deal.id === wanted) || null : null;
};

export function listDeals(request) {
  const params = new URL(request.url).searchParams;
  const category = params.get("category");
  const topic = params.get("topic");
  const type = params.get("type");
  const store = params.get("store")?.toLowerCase();

  const deals = liveDeals()
    .filter((deal) => !category || deal.category === category)
    .filter((deal) => !topic || deal.topic === topic)
    .filter((deal) => !type || deal.type === type)
    .filter((deal) => !store || deal.store.toLowerCase() === store)
    .map(toPublicDeal);

  return json({ source: "dummy", count: deals.length, deals });
}

export function listTopics() {
  return json({ topics: summarizeTopics(liveDeals()) });
}

export function getDeal(id) {
  const deal = findDeal(id);
  return deal ? json({ deal: toPublicDeal(deal) }) : json({ error: "Deal not found or no longer available." }, 404);
}

const unavailablePage = () =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offer unavailable | DealSphere</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#171717;color:#F5F5F0;font-family:system-ui,sans-serif;text-align:center;padding:16px}
p{color:#A6A6A0}a{display:inline-block;margin-top:12px;padding:12px 22px;border-radius:999px;background:#B7E531;color:#171717;font-weight:700;text-decoration:none}</style></head>
<body><main><h1>This offer is no longer available</h1><p>It may have expired or been removed.</p><a href="/">Browse current deals</a></main></body></html>`,
    { status: 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );

// "View Deal": looks up the offer by id and redirects to its own merchant page.
// The destination is checked against the merchant allowlist (resolveDealLink),
// so this can never be used to send people to an arbitrary site.
export function goToDeal(id) {
  const deal = findDeal(id);
  const link = deal ? resolveDealLink(deal) : null;
  if (!link?.ok) return unavailablePage();

  // Click log (shown in the server terminal). Swap for real analytics or a
  // database insert later.
  console.log(JSON.stringify({ event: "deal_click", dealId: deal.id, store: deal.store, at: new Date().toISOString() }));

  return new Response(null, {
    status: 302,
    headers: {
      location: link.href,
      "cache-control": "no-store",
      "referrer-policy": "strict-origin-when-cross-origin",
      "x-robots-tag": "noindex",
    },
  });
}

// Routes a request to the right handler; null when the path isn't ours.
export function routeRequest(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const { pathname } = new URL(request.url);
  if (/^\/api\/topics\/?$/.test(pathname)) return listTopics();
  if (/^\/api\/deals\/?$/.test(pathname)) return listDeals(request);
  let match = pathname.match(/^\/api\/deals\/([^/]+)\/?$/);
  if (match) return getDeal(decodeURIComponent(match[1]));
  match = pathname.match(/^\/go\/([^/]+)\/?$/);
  if (match) return goToDeal(decodeURIComponent(match[1]));
  return null;
}
