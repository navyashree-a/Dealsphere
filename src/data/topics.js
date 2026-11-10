// Topics group offers by what people shop for ("Shoes", "Laptops"...). Each
// homepage card is a topic; opening it lists every coupon, deal, bank offer
// and cashback for that topic. Feed offers name their topic by `id`.

export const topics = [
  {
    id: "shoes",
    name: "Shoes & sneakers",
    category: "Fashion",
    icon: "👟",
    description: "Sneakers, sports and formal shoes.",
    // Photo by Luis Felipe Lins on Unsplash (free Unsplash License):
    // https://unsplash.com/photos/white-and-orange-athletic-sneaker-LG88A2XgIXY
    image: "/topics/shoes.webp",
  },
  {
    id: "watches",
    name: "Watches",
    category: "Fashion",
    icon: "⌚",
    description: "Analog, digital and smart watches.",
    // Photo by Fabian Heimann on Unsplash (free Unsplash License), cropped:
    // https://unsplash.com/photos/round-silver-colored-fossil-chronograph-watch-at-922-with-brown-leather-band-4R_WEmhx8og
    image: "/topics/watches.webp",
  },
  // Photos below are CC0 from StockSnap (https://stocksnap.io), cropped. IDs, in
  // list order: 2G3VPGYPBQ, KJ9ZK1L8WS, 53ZHDXTL23, 1Y69ONYCCZ, 4O4FZUVSIU,
  // O4V3KXZI1T, K1I6IIHM5M, 34MSYVUYS0, 47E77904CB, HIH67XC5G0, 0UTZ00FWC6,
  // 7YY0E14ENJ, XVTMPEYKEE.
  { id: "ethnic-wear", name: "Kurtas & ethnic wear", category: "Fashion", icon: "👘", description: "Kurtas, kurta sets and festive wear.", image: "/topics/ethnic-wear.webp" },
  { id: "clothing", name: "Clothing & fashion", category: "Fashion", icon: "👕", description: "Sales across clothing and accessories.", image: "/topics/clothing.webp" },
  { id: "smartphones", name: "Smartphones", category: "Electronics", icon: "📱", description: "5G phones from every major brand.", image: "/topics/smartphones.webp" },
  { id: "audio", name: "Headphones & earbuds", category: "Electronics", icon: "🎧", description: "Wireless earbuds and headphones.", image: "/topics/audio.webp" },
  { id: "laptops", name: "Laptops", category: "Electronics", icon: "💻", description: "Laptops for work, study and gaming.", image: "/topics/laptops.webp" },
  { id: "electronics", name: "Electronics & gadgets", category: "Electronics", icon: "🔌", description: "Gadgets, accessories and more.", image: "/topics/electronics.webp" },
  { id: "skincare", name: "Skincare & haircare", category: "Beauty", icon: "🧴", description: "Serums, sunscreen and haircare.", image: "/topics/skincare.webp" },
  { id: "makeup", name: "Makeup & fragrances", category: "Beauty", icon: "💄", description: "Lipsticks, makeup kits and perfumes.", image: "/topics/makeup.webp" },
  { id: "food", name: "Food delivery & dining", category: "Food & Dining", icon: "🍔", description: "Food delivery and table bookings.", image: "/topics/food.webp" },
  { id: "furniture", name: "Furniture & decor", category: "Home & Living", icon: "🛋️", description: "Sofas, tables, decor and furnishings.", image: "/topics/furniture.webp" },
  { id: "kitchen", name: "Kitchen appliances", category: "Home & Living", icon: "🍳", description: "Air fryers, mixers and microwaves.", image: "/topics/kitchen.webp" },
  { id: "flights", name: "Flights", category: "Travel", icon: "✈️", description: "Domestic and international flights.", image: "/topics/flights.webp" },
  { id: "hotels", name: "Hotels & stays", category: "Travel", icon: "🏨", description: "Hotels, resorts and weekend getaways.", image: "/topics/hotels.webp" },
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
