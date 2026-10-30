// Topics group offers by what people shop for ("Shoes", "Laptops"...). Each
// homepage card is a topic; opening it lists every coupon, deal, bank offer
// and cashback for that topic. Feed offers name their topic by `id`.

export const topics = [
  { id: "shoes", name: "Shoes & sneakers", category: "Fashion", icon: "👟", description: "Sneakers, sports and formal shoes." },
  { id: "watches", name: "Watches", category: "Fashion", icon: "⌚", description: "Analog, digital and smart watches." },
  { id: "ethnic-wear", name: "Kurtas & ethnic wear", category: "Fashion", icon: "👘", description: "Kurtas, kurta sets and festive wear." },
  { id: "smartphones", name: "Smartphones", category: "Electronics", icon: "📱", description: "5G phones from every major brand." },
  { id: "audio", name: "Headphones & earbuds", category: "Electronics", icon: "🎧", description: "Wireless earbuds and headphones." },
  { id: "laptops", name: "Laptops", category: "Electronics", icon: "💻", description: "Laptops for work, study and gaming." },
  { id: "skincare", name: "Skincare & haircare", category: "Beauty", icon: "🧴", description: "Serums, sunscreen and haircare." },
  { id: "makeup", name: "Makeup & fragrances", category: "Beauty", icon: "💄", description: "Lipsticks, makeup kits and perfumes." },
  { id: "food", name: "Food delivery & dining", category: "Food & Dining", icon: "🍔", description: "Food delivery and table bookings." },
  { id: "furniture", name: "Furniture & decor", category: "Home & Living", icon: "🛋️", description: "Sofas, tables, decor and furnishings." },
  { id: "kitchen", name: "Kitchen appliances", category: "Home & Living", icon: "🍳", description: "Air fryers, mixers and microwaves." },
  { id: "flights", name: "Flights", category: "Travel", icon: "✈️", description: "Domestic and international flights." },
  { id: "hotels", name: "Hotels & stays", category: "Travel", icon: "🏨", description: "Hotels, resorts and weekend getaways." },
];

export const OFFER_TYPES = [
  { id: "coupon", label: "Coupons", single: "Coupon" },
  { id: "deal", label: "Deals", single: "Deal" },
  { id: "bank_offer", label: "Bank offers", single: "Bank offer" },
  { id: "cashback", label: "Cashback", single: "Cashback" },
];

export const offerTypeLabel = (type) => OFFER_TYPES.find((t) => t.id === type)?.single || "";

// Highest percentage in a discount text ("Up to 50% OFF" -> 50), else 0.
export const discountPercent = (text) =>
  Math.max(0, ...[...String(text).matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map((m) => Number(m[1])));

// Topic cards for the homepage: only topics that have live offers, with counts.
export const summarizeTopics = (deals) =>
  topics
    .map((topic) => {
      const offers = deals.filter((deal) => deal.topic === topic.id);
      const best = Math.max(0, ...offers.map((deal) => discountPercent(deal.discount)));
      return {
        ...topic,
        offerCount: offers.length,
        typeCounts: Object.fromEntries(OFFER_TYPES.map((t) => [t.id, offers.filter((d) => d.type === t.id).length])),
        stores: [...new Set(offers.map((deal) => deal.store))],
        bestDiscount: best ? `Up to ${best}% OFF` : `${offers.length} offers`,
      };
    })
    .filter((topic) => topic.offerCount > 0);
