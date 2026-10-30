// DEMO METRICS. Deterministic sample analytics and conversion data so the
// admin charts are stable between reloads. None of this is collected from real
// visitors or partners: ARD §16 says analytics and partner reporting depend on
// an agreed analytics approach and approved partner integrations.

import { MERCHANTS, SAMPLE_NETWORKS } from "./adminData";
import { addDays, seeded } from "./adminUtils";

export const RANGES = [
  { id: 7, label: "Last 7 days" },
  { id: 30, label: "Last 30 days" },
  { id: 90, label: "Last 90 days" },
];

export const CATEGORY_SHARE = {
  Fashion: 0.24,
  Electronics: 0.27,
  Beauty: 0.14,
  "Food & Dining": 0.12,
  "Home & Living": 0.1,
  Travel: 0.13,
};

export const STORE_SHARE = {
  Amazon: 0.26,
  Myntra: 0.2,
  Flipkart: 0.17,
  Nykaa: 0.13,
  "Food Store": 0.09,
  "Home Store": 0.07,
  "Travel Store": 0.08,
};

export const CAMPAIGN_SHARE = { "C-1": 0.14, "C-2": 0.11 };

// 180 days so a 90-day range always has a full previous period to compare.
const HISTORY_DAYS = 180;

const daily = Array.from({ length: HISTORY_DAYS }, (_, i) => {
  const dayIndex = HISTORY_DAYS - 1 - i; // 0 = today
  const weekday = (i % 7) / 7;
  const growth = 1 + (i / HISTORY_DAYS) * 0.35;
  const visits = Math.round((1150 + 260 * Math.sin(weekday * Math.PI * 2) + 220 * seeded(i)) * growth);
  const searches = Math.round(visits * (0.34 + 0.06 * seeded(i + 400)));
  const dealViews = Math.round(visits * (1.5 + 0.3 * seeded(i + 800)));
  const clicks = Math.round(dealViews * (0.11 + 0.03 * seeded(i + 1200)));
  const conversions = Math.round(clicks * (0.025 + 0.012 * seeded(i + 1600)));
  return { date: addDays(-dayIndex), visits, searches, dealViews, clicks, conversions };
});

const factorFor = ({ category, store, campaign }) =>
  (category ? CATEGORY_SHARE[category] || 0 : 1) *
  (store ? STORE_SHARE[store] || 0 : 1) *
  (campaign ? CAMPAIGN_SHARE[campaign] || 0 : 1);

// Returns the current and previous period, scaled by any filters.
export const trafficSeries = (days, filters = {}) => {
  const factor = factorFor(filters);
  const scale = (row) => ({
    ...row,
    visits: Math.round(row.visits * (filters.category || filters.store ? 0.6 + factor : factor)),
    searches: Math.round(row.searches * factor),
    dealViews: Math.round(row.dealViews * factor),
    clicks: Math.round(row.clicks * factor),
    conversions: Math.round(row.conversions * factor),
  });
  const current = daily.slice(-days).map(scale);
  const previous = daily.slice(-days * 2, -days).map(scale);
  return { current, previous };
};

export const sum = (rows, key) => rows.reduce((total, row) => total + (row[key] || 0), 0);

export const searchTerms = (days) =>
  [
    ["myntra", 0.11, 0.96],
    ["headphones", 0.09, 0.92],
    ["tech20", 0.07, 1],
    ["travel deals", 0.065, 0.88],
    ["skincare", 0.06, 0.9],
    ["laptop", 0.055, 0.71],
    ["pizza coupon", 0.05, 0.84],
    ["iphone offer", 0.045, 0.22],
    ["furniture", 0.04, 0.8],
    ["gift card", 0.035, 0.0],
  ].map(([term, share, withResults]) => {
    const total = sum(daily.slice(-days), "searches");
    return { term, searches: Math.round(total * share), withResults };
  });

// Tracked merchant-attributed conversions ("Sales" in ARD §8). Commission
// states follow ARD Appendix C.
const STATES = ["Estimated", "Pending", "Approved", "Paid", "Reversed", "Disputed"];
const STATE_WEIGHTS = [0.24, 0.26, 0.24, 0.16, 0.06, 0.04];
const pickState = (r) => {
  let acc = 0;
  for (let i = 0; i < STATES.length; i += 1) {
    acc += STATE_WEIGHTS[i];
    if (r < acc) return STATES[i];
  }
  return STATES[0];
};

export const COMMISSION_STATES = STATES;

export const conversions = Array.from({ length: 140 }, (_, i) => {
  const merchant = MERCHANTS[Math.floor(seeded(i + 3000) * MERCHANTS.length)];
  const saleValue = Math.round(600 + seeded(i + 3100) * 9400);
  const rate = 0.03 + seeded(i + 3200) * 0.05;
  const campaignRoll = seeded(i + 3300);
  return {
    id: `CV-${String(5000 + i)}`,
    date: addDays(-Math.floor(seeded(i + 3400) * HISTORY_DAYS)),
    partner: SAMPLE_NETWORKS[Math.floor(seeded(i + 3500) * SAMPLE_NETWORKS.length)],
    merchant,
    campaign: campaignRoll < 0.14 ? "C-1" : campaignRoll < 0.25 ? "C-2" : "",
    saleValue,
    commission: Math.round(saleValue * rate),
    status: pickState(seeded(i + 3600)),
  };
}).sort((a, b) => (a.date < b.date ? 1 : -1));

export const conversionsInRange = (days, offsetDays = 0) => {
  const end = addDays(-offsetDays);
  const start = addDays(-(offsetDays + days - 1));
  return conversions.filter((row) => row.date >= start && row.date <= end);
};
