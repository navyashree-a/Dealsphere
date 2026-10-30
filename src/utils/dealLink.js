import { AFFILIATE_NETWORK_DOMAINS, MERCHANTS } from "../data/merchants.js";

// Resolves where "View Deal" should send a customer.
//
//   1. affiliateUrl, if it is valid           (tracking parameters kept exactly)
//   2. otherwise productUrl, if it is valid
//   3. otherwise no link - the button is disabled with a reason
//
// A URL is valid only if it is https, has no embedded credentials, and its
// hostname is on the trusted allowlist in src/data/merchants.js. When the
// deal's store is a known merchant, the URL must also belong to THAT merchant,
// so an Amazon deal can never send someone to another site.

const normalise = (value) => String(value || "").trim().toLowerCase();

const hostMatches = (hostname, domain) => hostname === domain || hostname.endsWith(`.${domain}`);

export const merchantForStore = (store) =>
  MERCHANTS.find((m) => m.aliases.includes(normalise(store)) || normalise(m.name) === normalise(store)) || null;

export const merchantForHost = (hostname) =>
  MERCHANTS.find((m) => m.domains.some((d) => hostMatches(hostname, d))) || null;

const isIpAddress = (hostname) => /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");

// Returns { ok: true, url, merchant } or { ok: false, reason }.
export const checkDestination = (raw, expectedMerchant, { affiliate = false } = {}) => {
  if (!raw || !String(raw).trim()) return { ok: false, reason: "missing" };

  let url;
  try {
    url = new URL(String(raw).trim());
  } catch {
    return { ok: false, reason: "not a valid URL" };
  }

  if (url.protocol !== "https:") return { ok: false, reason: "must use https" };
  if (url.username || url.password) return { ok: false, reason: "must not contain credentials" };

  const hostname = url.hostname.toLowerCase();
  if (isIpAddress(hostname)) return { ok: false, reason: "IP addresses are not allowed" };

  const hostMerchant = merchantForHost(hostname);
  if (hostMerchant) {
    if (expectedMerchant && hostMerchant.id !== expectedMerchant.id) {
      return { ok: false, reason: `points to ${hostMerchant.name}, not ${expectedMerchant.name}` };
    }
    return { ok: true, url, merchant: hostMerchant };
  }

  if (affiliate && AFFILIATE_NETWORK_DOMAINS.some((d) => hostMatches(hostname, d))) {
    return { ok: true, url, merchant: expectedMerchant };
  }

  return { ok: false, reason: `${hostname} is not a trusted merchant domain` };
};

export const resolveDealLink = (deal) => {
  const expected = merchantForStore(deal.merchant || deal.store);
  const affiliate = checkDestination(deal.affiliateUrl, expected, { affiliate: true });
  const product = checkDestination(deal.productUrl, expected);

  // Warn developers about configured-but-rejected URLs (never shown to customers).
  if (import.meta.env?.DEV) {
    [["affiliateUrl", affiliate], ["productUrl", product]].forEach(([field, result]) => {
      if (!result.ok && result.reason !== "missing") {
        console.warn(`[DealSphere] Deal ${deal.id} ${field} rejected: ${result.reason}`);
      }
    });
  }

  const chosen = affiliate.ok ? affiliate : product.ok ? product : null;
  if (!chosen) {
    const configured = Boolean(String(deal.affiliateUrl || "").trim() || String(deal.productUrl || "").trim());
    return {
      ok: false,
      merchantName: expected?.name || deal.store,
      reason: configured ? "invalid" : "missing",
    };
  }

  return {
    ok: true,
    // url.href keeps every query parameter (affiliate tags, sub-IDs) as supplied.
    href: chosen.url.href,
    merchantName: chosen.merchant?.name || expected?.name || deal.store,
    viaAffiliate: chosen === affiliate,
  };
};
