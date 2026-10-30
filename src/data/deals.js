// Demo content only. Stores, discounts and codes are sample data and have
// not been verified with any retailer.
//
// Merchant links ("View Deal"):
//   productUrl   - the merchant's product or offer page for THIS deal.
//   affiliateUrl - the tracked link from an approved affiliate program/network.
//                  Used instead of productUrl when valid; its tracking
//                  parameters are kept exactly as supplied.
// Both must be https and on a trusted domain in src/data/merchants.js, and
// must belong to the deal's store.
//
// productUrl values below are genuine merchant category/search/offer pages,
// checked in a browser on 17 Oct 2026 - not specific products, because these
// sample deals don't name one. affiliateUrl is empty: no affiliate program is
// configured, so these links do not earn commission. Replace them with
// specific product pages and approved affiliate links when available.

export const deals = [
  {
    id: 1,
    category: "Fashion",
    store: "Myntra",
    title: "Shoes and accessories",
    description: "Explore fashion offers.",
    discount: "30% OFF",
    code: "STYLE30",
    icon: "👟",
    productUrl: "https://www.myntra.com/shoes",
    affiliateUrl: "",
  },
  {
    id: 2,
    category: "Electronics",
    store: "Amazon",
    title: "Headphones and gadgets",
    description: "Explore electronics offers.",
    discount: "20% OFF",
    code: "TECH20",
    icon: "🎧",
    productUrl: "https://www.amazon.in/s?k=headphones",
    affiliateUrl: "",
  },
  {
    id: 3,
    category: "Beauty",
    store: "Nykaa",
    title: "Skincare and makeup",
    description: "Explore beauty offers.",
    discount: "15% OFF",
    code: "GLOW15",
    icon: "💄",
    productUrl: "https://www.nykaa.com/skin/c/8377",
    affiliateUrl: "",
  },
  {
    id: 4,
    category: "Food & Dining",
    store: "Food Store",
    title: "Food and restaurant offers",
    description: "Explore dining offers.",
    discount: "25% OFF",
    code: "FOOD25",
    icon: "🍕",
    productUrl: "https://www.swiggy.com/offers-near-me",
    affiliateUrl: "",
  },
  {
    id: 5,
    category: "Home & Living",
    store: "Home Store",
    title: "Furniture and home essentials",
    description: "Explore home offers.",
    discount: "20% OFF",
    code: "HOME20",
    icon: "🏠",
    productUrl: "https://www.pepperfry.com/category/furniture.html",
    affiliateUrl: "",
  },
  {
    id: 6,
    category: "Travel",
    store: "Travel Store",
    title: "Flights and hotel bookings",
    description: "Explore travel offers.",
    discount: "15% OFF",
    code: "TRAVEL15",
    icon: "✈️",
    productUrl: "https://www.makemytrip.com/",
    affiliateUrl: "",
  },
];

export const categories = [
  { name: "Fashion", icon: "👗", description: "Clothing, shoes & accessories" },
  { name: "Electronics", icon: "📱", description: "Phones, gadgets & more" },
  { name: "Beauty", icon: "💄", description: "Skincare & makeup" },
  { name: "Food & Dining", icon: "🍔", description: "Restaurants & food delivery" },
  { name: "Home & Living", icon: "🏠", description: "Furniture & home essentials" },
  { name: "Travel", icon: "✈️", description: "Flights, hotels & holidays" },
];

// Store logos are each merchant's own official site icon, loaded from the
// merchant's servers (as listed in their site's <link rel="icon"> tags on
// 22 Oct 2026). Brand logos are trademarks: ARD §6.5 requires they be used
// only where authorized, so confirm permission before going live. If a logo
// fails to load, the card shows the `letter` tile instead.
export const stores = [
  {
    name: "Amazon",
    letter: "a",
    logo: "https://www.amazon.in/favicon.ico",
    tagline: "Electronics & more",
    category: "Electronics",
    tone: "amber",
  },
  {
    name: "Myntra",
    letter: "M",
    logo: "https://constant.myntassets.com/pwa/assets/img/Icon-App-60x60@3x_2021.png",
    tagline: "Fashion & lifestyle",
    category: "Fashion",
    tone: "rose",
  },
  {
    name: "Flipkart",
    letter: "F",
    logo: "https://static-assets-web.flixcart.com/batman-returns/batman-returns/p/images/logo_lite-cbb357.png",
    tagline: "Shopping & electronics",
    category: "Electronics",
    tone: "sky",
  },
  {
    name: "Nykaa",
    letter: "N",
    logo: "https://images-static.naikaa.com/media/wysiwyg/uiTools/2024-3/beauty.png",
    tagline: "Beauty & skincare",
    category: "Beauty",
    tone: "berry",
  },
];

// Maps each category to a colour tone used by cards and tiles.
const categoryTones = {
  Fashion: "rose",
  Electronics: "sky",
  Beauty: "berry",
  "Food & Dining": "amber",
  "Home & Living": "sage",
  Travel: "aqua",
};

export const toneFor = (category) => categoryTones[category] || "lime";
