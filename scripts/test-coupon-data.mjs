// Checks the dummy coupon feed, the feed adapter, topics and the backend.
// Run: npm run test:data   (Node's built-in test runner - no extra dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import { dummyCouponFeed } from "../src/data/feeds/dummyCouponFeed.js";
import { normalizeFeed, expiryLabel } from "../src/data/feeds/normalizeFeed.js";
import { topics, summarizeTopics, discountPercent } from "../src/data/topics.js";
import { resolveDealLink } from "../src/utils/dealLink.js";
import { routeRequest } from "../server/dealsApi.js";

const CATEGORIES = ["Fashion", "Electronics", "Beauty", "Food & Dining", "Home & Living", "Travel"];
const TYPES = ["coupon", "deal", "bank_offer", "cashback"];
const run = (feed = dummyCouponFeed) => normalizeFeed(feed, { topics, source: "test" });
const offer = (fields) => ({ topic: "audio", merchant: "Amazon", type: "deal", title: "t", discount_text: "d", landing_url: "https://www.amazon.in/s?k=a", ends_in_days: 3, ...fields });

// ---------- Feed + adapter ----------
test("every valid dummy offer is accepted", () => {
  const { deals, rejected } = run();
  const testEntries = dummyCouponFeed.filter((o) => o.title.startsWith("TEST"));
  assert.equal(deals.length, dummyCouponFeed.length - testEntries.length);
  assert.deepEqual(rejected.map((r) => r.offerId).sort(), testEntries.map((o) => o.offer_id).sort());
});

test("each intentionally invalid offer is rejected for the right reason", () => {
  const reasons = Object.fromEntries(run().rejected.map((r) => [r.offerId, r.reason]));
  assert.equal(reasons["DF-9901"], "expired");
  assert.equal(reasons["DF-9902"], "not started yet");
  assert.equal(reasons["DF-9903"], "no valid View Deal link for this store");
  assert.match(reasons["DF-9904"], /unknown topic/);
  assert.equal(reasons["DF-9905"], "coupon has no code");
  assert.equal(reasons["DF-9906"], "bank_offer has no bank or wallet");
  assert.match(reasons["DF-9907"], /unknown offer type/);
});

test("every topic has all four offer types and every deal links safely to its own store", () => {
  const { deals } = run();
  topics.forEach((topic) => {
    const offers = deals.filter((d) => d.topic === topic.id);
    TYPES.forEach((type) => assert.ok(offers.some((d) => d.type === type), `${topic.id} has no ${type}`));
    offers.forEach((d) => assert.equal(d.category, topic.category));
  });
  CATEGORIES.forEach((c) => assert.ok(deals.some((d) => d.category === c), `no deals for ${c}`));
  deals.forEach((deal) => {
    const link = resolveDealLink(deal);
    assert.ok(link.ok, `deal ${deal.id} has no valid link`);
    assert.ok(link.href.startsWith("https://"));
  });
});

test("ids are unique; coupons have codes; bank offers and cashback name a partner", () => {
  const { deals } = run();
  assert.equal(new Set(deals.map((d) => d.id)).size, deals.length);
  deals.forEach((d) => {
    if (d.type === "coupon") assert.match(d.code, /^[A-Z0-9]+$/);
    else assert.equal(d.code, "");
    if (d.type === "bank_offer" || d.type === "cashback") assert.ok(d.partner, `deal ${d.id} has no partner`);
  });
});

test("expiry dates and labels (India time)", () => {
  const now = Date.parse("2026-10-30T15:00:00+05:30"); // 3 pm IST
  const feed = [0, 1, 5, null].map((days, i) => offer({ offer_id: `X-${i + 1}`, ends_in_days: days }));
  const { deals } = normalizeFeed(feed, { topics, now });
  assert.deepEqual(deals.map(expiryLabel), ["Ends today", "Ends tomorrow", "5 days left", ""]);
  // An offer ending today is valid until 23:59:59.999 IST today.
  assert.equal(deals[0].expiresAt, "2026-10-30T18:29:59.999Z");
  assert.equal(deals[3].expiresAt, null);
});

test("rejects unsafe links, unknown stores and duplicates", () => {
  const { deals, rejected } = run([
    offer({ offer_id: "Y-1", landing_url: "http://www.amazon.in/s?k=a" }),
    offer({ offer_id: "Y-2", landing_url: "https://amazon.in.evil.example/s" }),
    offer({ offer_id: "Y-3", landing_url: "javascript:alert(1)" }),
    offer({ offer_id: "Y-4", merchant: "Unknown Shop" }),
    offer({ offer_id: "Y-5" }),
    offer({ offer_id: "Y-5" }),
  ]);
  assert.deepEqual(deals.map((d) => d.id), [5]);
  assert.deepEqual(rejected.map((r) => r.offerId), ["Y-1", "Y-2", "Y-3", "Y-4", "Y-5"]);
});

// ---------- Topics ----------
test("topic summaries count offers by type and find the best % off", () => {
  const { deals } = run();
  const summaries = summarizeTopics(deals);
  assert.equal(summaries.length, topics.length);
  const shoes = summaries.find((t) => t.id === "shoes");
  assert.equal(shoes.offerCount, deals.filter((d) => d.topic === "shoes").length);
  assert.equal(Object.values(shoes.typeCounts).reduce((a, b) => a + b, 0), shoes.offerCount);
  assert.equal(shoes.bestDiscount, "Up to 50% OFF");
  assert.deepEqual(shoes.stores.sort(), ["AJIO", "Amazon", "Flipkart", "Myntra"]);
  assert.equal(discountPercent("Flat ₹400 OFF"), 0);
  assert.equal(discountPercent("7.5% Instant discount"), 7.5);
});

// ---------- Backend (server/dealsApi.js) ----------
const get = (path) => routeRequest(new Request(`http://localhost${path}`));

test("GET /api/deals lists live deals with a redirect URL", async () => {
  const response = get("/api/deals");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.count, body.deals.length);
  assert.ok(body.deals.length > 50);
  body.deals.forEach((d) => assert.equal(d.goUrl, `/go/${d.id}`));
  assert.ok(!body.deals.some((d) => d.title.startsWith("TEST")));
});

test("GET /api/deals filters by topic, type, category and store", async () => {
  const bank = await get("/api/deals?topic=shoes&type=bank_offer").json();
  assert.ok(bank.count > 0 && bank.deals.every((d) => d.topic === "shoes" && d.type === "bank_offer"));
  const travel = await get("/api/deals?category=Travel").json();
  assert.ok(travel.count > 0 && travel.deals.every((d) => d.category === "Travel"));
  const ajio = await get("/api/deals?store=ajio").json();
  assert.ok(ajio.count > 0 && ajio.deals.every((d) => d.store === "AJIO"));
});

test("GET /api/topics returns every topic with counts", async () => {
  const body = await get("/api/topics").json();
  assert.equal(body.topics.length, topics.length);
  body.topics.forEach((t) => assert.ok(t.offerCount > 0));
});

test("GET /api/deals/:id returns one deal, 404 otherwise", async () => {
  assert.equal((await get("/api/deals/401").json()).deal.code, "PHONE1000");
  assert.equal(get("/api/deals/9901").status, 404); // expired test offer
  assert.equal(get("/api/deals/abc").status, 404);
});

test("GET /go/:id redirects to that offer's own products on the store", () => {
  const cases = {
    101: "https://www.myntra.com/casual-shoes/neemans/neemans-max-cush-slip-ons-for-men/31739187/buy",
    103: "https://www.amazon.in/dp/B0CPVQ59FP",
    104: "https://www.ajio.com/nike-court-borough-colourblock-low-top-sneakers/p/460205783_white",
    105: "https://www.flipkart.com/campus-mike-n-running-shoes-men/p/itm27c989f1e20c6?pid=SHOG4G3XXA5GHCY7",
    106: "https://www.myntra.com/shoes", // store-wide bank offer stays on the listing
    401: "https://www.flipkart.com/search?q=smartphones",
    601: "https://www.croma.com/searchB?q=laptop%3Arelevance&text=laptop",
    1301: "https://www.makemytrip.com/hotels/",
  };
  Object.entries(cases).forEach(([id, href]) => {
    const response = get(`/go/${id}`);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), href);
  });
});

test("GET /go/:id refuses expired, invalid and unknown offers", () => {
  ["9901", "9903", "99999", "x"].forEach((id) => {
    const response = get(`/go/${id}`);
    assert.equal(response.status, 404, id);
    assert.equal(response.headers.get("location"), null);
  });
});

test("unrelated paths and methods fall through", () => {
  assert.equal(get("/"), null);
  assert.equal(routeRequest(new Request("http://localhost/api/deals", { method: "POST" })), null);
});
