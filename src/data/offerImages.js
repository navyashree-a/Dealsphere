import { topics } from "./topics.js";

// Picks the photo for an offer card. Bank offers and cashback get a payment
// photo; other offers match a word in their title, else take one of their
// topic's photos. Offers with no photo fall back to the emoji on the card.
//
// Photos in public/offers are CC0 from StockSnap (https://stocksnap.io),
// cropped. Rules are per topic so a word like "delivery" on a fashion offer
// can't pull in a food photo.

const photo = (name) => `/offers/${name}.webp`;

const OFFER_PHOTOS = {
  shoes: { rules: [[/running|sports/i, "running"]], extras: ["running"] },
  watches: { rules: [[/smart\s?watch/i, "smartwatch"]], extras: ["smartwatch"] },
  "ethnic-wear": { extras: ["ethnic-2", "ethnic-3"] },
  clothing: { extras: ["clothing-2", "clothing-3", "clothing-4"] },
  smartphones: { extras: ["smartphones-2"] },
  audio: { rules: [[/earbud|airdopes|\btws\b/i, "earbuds"]], extras: ["headphones-2"] },
  laptops: { rules: [[/gaming/i, "gaming"]], extras: ["laptops-2"] },
  electronics: { extras: ["electronics-2"] },
  skincare: {
    rules: [
      [/serum/i, "serum"],
      [/hair/i, "hair"],
    ],
    extras: ["skincare-2"],
  },
  makeup: {
    rules: [
      [/lip/i, "lipstick"],
      [/perfume|deodorant|fragrance/i, "perfume"],
      [/brush/i, "makeup-brushes"],
    ],
    extras: ["makeup-brushes"],
  },
  food: {
    rules: [
      [/pizza|food and restaurant/i, "pizza"],
      [/burger|restaurant orders/i, "burger"],
      [/delivery/i, "food-spread"],
    ],
    extras: ["food-spread"],
  },
  furniture: {
    rules: [
      [/sofa|recliner/i, "sofa"],
      [/decor/i, "decor"],
      [/bedsheet|furnishing|bedding/i, "bedding"],
      [/table|chair|desk/i, "desk"],
    ],
    extras: ["sofa", "decor"],
  },
  kitchen: {
    rules: [
      [/air\s?fryer/i, "air-fryer"],
      [/microwave|oven/i, "microwave"],
      [/mixer|grinder|blender|juicer/i, "mixer"],
    ],
    extras: ["kitchen-2"],
  },
  flights: {
    rules: [
      [/international/i, "international"],
      [/domestic/i, "flights-2"],
    ],
    extras: ["flights-3"],
  },
  hotels: {
    rules: [
      [/getaway|resort/i, "getaway"],
      [/cancellation/i, "hotels-2"],
    ],
    extras: ["hotels-2"],
  },
};

const topicImages = new Map(topics.map((topic) => [topic.id, topic.image]));

export function offerImage(deal) {
  if (deal.type === "bank_offer") return photo("bank-card");
  if (deal.type === "cashback") return photo("cashback");

  const { rules = [], extras = [] } = OFFER_PHOTOS[deal.topic] || {};
  const match = rules.find(([words]) => words.test(deal.title));
  if (match) return photo(match[1]);

  const pool = [topicImages.get(deal.topic), ...extras.map(photo)].filter(Boolean);
  // By id, so an offer keeps the same photo on every visit.
  return pool.length ? pool[(Number(deal.id) || 0) % pool.length] : null;
}
