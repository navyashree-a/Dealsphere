// Trusted merchants and the ONLY domains "View Deal" may send customers to.
// A destination is allowed when its hostname equals one of these domains or is
// a subdomain of it (e.g. www.amazon.in). Everything else is refused.
//
// To add a merchant later: add an entry with its official domains, then set
// productUrl / affiliateUrl on its deals in src/data/deals.js.

export const MERCHANTS = [
  {
    id: "amazon",
    name: "Amazon India",
    aliases: ["amazon", "amazon india", "amazon.in"],
    // amzn.to / amzn.in are Amazon's own short-link domains (Associates SiteStripe).
    domains: ["amazon.in", "amzn.to", "amzn.in"],
  },
  { id: "myntra", name: "Myntra", aliases: ["myntra"], domains: ["myntra.com"] },
  { id: "flipkart", name: "Flipkart", aliases: ["flipkart"], domains: ["flipkart.com"] },
  { id: "ajio", name: "AJIO", aliases: ["ajio"], domains: ["ajio.com"] },
  { id: "nykaa", name: "Nykaa", aliases: ["nykaa", "nykaa fashion"], domains: ["nykaa.com", "nykaafashion.com"] },
  { id: "croma", name: "Croma", aliases: ["croma"], domains: ["croma.com"] },
  { id: "makemytrip", name: "MakeMyTrip", aliases: ["makemytrip", "make my trip", "mmt"], domains: ["makemytrip.com"] },
  { id: "swiggy", name: "Swiggy", aliases: ["swiggy"], domains: ["swiggy.com"] },
  { id: "pepperfry", name: "Pepperfry", aliases: ["pepperfry"], domains: ["pepperfry.com"] },
];

// Tracking/redirect domains of affiliate networks DealSphere has an approved
// account with (e.g. a network's click-tracking host). Empty on purpose: no
// network partnership is confirmed yet (ARD §10). Add a network's exact
// tracking domain here only after approval; until then affiliate links must
// point directly at a merchant domain (e.g. an Amazon Associates link with ?tag=).
export const AFFILIATE_NETWORK_DOMAINS = [];
