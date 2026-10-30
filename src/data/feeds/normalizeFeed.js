import { resolveDealLink, merchantForStore } from "../../utils/dealLink.js";

// Feed adapter: converts a coupon feed (see dummyCouponFeed.js) into the deal
// shape the site uses, and rejects anything a customer shouldn't see.
// To switch to a real provider later, map its fields to the same feed entry
// shape and pass them through here - the UI doesn't need to change.
//
// An offer is rejected when it:
//   - is missing an id, title, discount or topic
//   - uses a topic DealSphere doesn't list (the topic sets the category)
//   - has an unknown type (coupon | deal | bank_offer | cashback)
//   - is from a store that isn't on the merchant allowlist
//   - is a "coupon" without a code
//   - is a bank offer or cashback without the bank / wallet (partner)
//   - hasn't started yet, or has already expired (ARD §6.2)
//   - has no valid "View Deal" link for its own store (resolveDealLink)

const DAY_MS = 24 * 60 * 60 * 1000;

// Offer days run on India time (IST, UTC+5:30, no daylight saving), so the
// browser and the backend (which runs in UTC) agree on when an offer ends.
const IST_OFFSET_MS = 330 * 60 * 1000;
export const OFFER_TIME_ZONE = "Asia/Kolkata";

const startOfDay = (time) => Math.floor((time + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;

// "DF-204" -> 204. Numeric ids keep wishlist/alerts/history working unchanged.
const numericId = (offerId) => Number(String(offerId).replace(/\D/g, "")) || null;

const TYPES = new Set(["coupon", "deal", "bank_offer", "cashback"]);

export function normalizeFeed(feed, { topics = [], source = "", now = Date.now() } = {}) {
  const today = startOfDay(now);
  const topicsById = new Map(topics.map((topic) => [topic.id, topic]));
  const seen = new Set();
  const deals = [];
  const rejected = [];

  feed.forEach((offer) => {
    const reject = (reason) => rejected.push({ offerId: offer.offer_id, reason });
    const id = numericId(offer.offer_id);
    const code = String(offer.code || "").trim().toUpperCase();

    const topic = topicsById.get(offer.topic);
    const partner = String(offer.partner || "").trim();

    if (!id || !offer.title || !offer.discount_text || !offer.topic) return reject("missing required fields");
    if (seen.has(id)) return reject("duplicate offer id");
    if (!topic) return reject(`unknown topic "${offer.topic}"`);
    if (!TYPES.has(offer.type)) return reject(`unknown offer type "${offer.type}"`);
    if (!merchantForStore(offer.merchant)) return reject(`store "${offer.merchant}" is not on the allowlist`);
    if (offer.type === "coupon" && !code) return reject("coupon has no code");
    if ((offer.type === "bank_offer" || offer.type === "cashback") && !partner) return reject(`${offer.type} has no bank or wallet`);
    if (offer.starts_in_days > 0) return reject("not started yet");
    if (offer.ends_in_days != null && offer.ends_in_days < 0) return reject("expired");

    const deal = {
      id,
      topic: topic.id,
      topicName: topic.name,
      category: topic.category,
      type: offer.type,
      partner,
      store: offer.merchant,
      title: offer.title,
      description: offer.description || "",
      discount: offer.discount_text,
      code: offer.type === "coupon" ? code : "",
      icon: offer.icon || "🏷️",
      productUrl: offer.landing_url || "",
      affiliateUrl: offer.affiliate_url || "",
      terms: Array.isArray(offer.terms) ? offer.terms : [],
      minOrder: offer.min_order || null,
      // Last valid moment is the end of the expiry day.
      expiresAt: offer.ends_in_days == null ? null : new Date(today + (offer.ends_in_days + 1) * DAY_MS - 1).toISOString(),
      daysLeft: offer.ends_in_days ?? null,
      featured: Boolean(offer.featured),
      source,
    };

    if (!resolveDealLink(deal).ok) return reject("no valid View Deal link for this store");

    seen.add(id);
    deals.push(deal);
  });

  return { deals, rejected };
}

// Short label for cards: "Ends today", "Ends tomorrow", "3 days left".
export const expiryLabel = (deal) => {
  if (deal.daysLeft == null) return "";
  if (deal.daysLeft === 0) return "Ends today";
  if (deal.daysLeft === 1) return "Ends tomorrow";
  return `${deal.daysLeft} days left`;
};

export const isEndingSoon = (deal) => deal.daysLeft != null && deal.daysLeft <= 2;
