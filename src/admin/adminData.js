// DEMO DATA for the admin panel. Every record here is fictional sample content
// for a frontend-only prototype. Names, emails, amounts and metrics are not
// real. Partner providers are taken from ARD §10, where "listing a provider
// does not mean Tamada Media or DealSphere has a signed partnership" - so they
// all start as "Proposed".

import { categories as publicCategories, curatedDeals as publicDeals } from "../data/deals";
import { ROLE_DEFAULTS, clonePermissions } from "./permissions";
import { addDays, nowISO } from "./adminUtils";

export const ADMIN_USER = { id: "admin", name: "Admin (demo)", role: "admin" };

// Fictional affiliate networks used only by demo finance/sales figures, so no
// real provider is implied to be paying DealSphere.
export const SAMPLE_NETWORKS = ["Sample Network A", "Sample Network B", "Sample Network C"];

export const MERCHANTS = ["Amazon", "Myntra", "Flipkart", "Nykaa", "Food Store", "Home Store", "Travel Store"];

const ago = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const history = (entries) => entries.map(([days, actor, action]) => ({ at: ago(days), actor, action }));

const buildDeals = () => {
  // The six offers already shown on the public site, as Active records.
  // The public site labels them unverified, so verification stays honest here.
  const live = publicDeals.map((deal) => ({
    id: `D-${100 + deal.id}`,
    publicId: deal.id,
    title: deal.title,
    description: deal.description,
    category: deal.category,
    merchant: deal.store,
    discount: deal.discount,
    code: deal.code,
    url: "",
    terms: "Sample content for demonstration. Minimum order values or other restrictions may apply.",
    expiry: "",
    source: "Manual research",
    verification: "Not verified with merchant",
    status: "Active",
    campaigns: [],
    owner: "s1",
    createdAt: ago(30),
    updatedAt: ago(12),
    history: history([
      [30, "Ravi Kumar", "Created draft"],
      [29, "Ravi Kumar", "Submitted for review"],
      [28, "Admin (demo)", "Approved and published"],
    ]),
  }));

  const extra = [
    {
      id: "D-201",
      title: "Laptop accessories week",
      description: "Keyboards, mice and stands.",
      category: "Electronics",
      merchant: "Amazon",
      discount: "10% OFF",
      code: "DESK10",
      url: "https://merchant.example/laptop-accessories",
      terms: "Selected accessories only.",
      expiry: addDays(3),
      status: "Active",
      owner: "s1",
    },
    {
      id: "D-202",
      title: "Weekend grocery savings",
      description: "Fresh produce and pantry staples.",
      category: "Food & Dining",
      merchant: "Food Store",
      discount: "10% OFF",
      code: "FRESH10",
      url: "",
      terms: "",
      expiry: "",
      status: "Draft",
      owner: "s5",
    },
    {
      id: "D-203",
      title: "Winter jacket sale",
      description: "Outerwear for the season.",
      category: "Fashion",
      merchant: "Myntra",
      discount: "40% OFF",
      code: "WINTER40",
      url: "https://merchant.example/winter",
      terms: "Valid on full-price items.",
      expiry: addDays(20),
      status: "Pending Review",
      owner: "s5",
    },
    {
      id: "D-204",
      title: "Smartwatch launch offer",
      description: "Launch pricing on new wearables.",
      category: "Electronics",
      merchant: "Flipkart",
      discount: "Offer details as supplied by source",
      code: "",
      url: "https://merchant.example/smartwatch",
      terms: "No coupon code; offer applies at merchant checkout.",
      expiry: addDays(9),
      status: "Pending Review",
      owner: "s1",
    },
    {
      id: "D-205",
      title: "Monsoon travel deals",
      description: "Domestic hotel bookings.",
      category: "Travel",
      merchant: "Travel Store",
      discount: "12% OFF",
      code: "RAIN12",
      url: "https://merchant.example/monsoon",
      terms: "Bookings made before expiry.",
      expiry: addDays(-5),
      status: "Expired",
      owner: "s5",
    },
    {
      id: "D-206",
      title: "Lipstick bundle",
      description: "Buy two, get one.",
      category: "Beauty",
      merchant: "Nykaa",
      discount: "Buy 2 Get 1",
      code: "BUNDLE3",
      url: "",
      terms: "",
      expiry: "",
      status: "Rejected",
      rejectionReason: "Destination URL missing and the coupon code could not be confirmed.",
      owner: "s1",
    },
    {
      id: "D-207",
      title: "Festive home décor",
      description: "Lighting and decorations.",
      category: "Home & Living",
      merchant: "Home Store",
      discount: "18% OFF",
      code: "DECOR18",
      url: "https://merchant.example/decor",
      terms: "Seasonal range only.",
      expiry: addDays(-40),
      status: "Archived",
      owner: "s5",
    },
  ].map((deal) => ({
    source: "Manual research",
    verification: "Not verified with merchant",
    campaigns: [],
    createdAt: ago(10),
    updatedAt: ago(2),
    history: history([[10, "Kavya Iyer", "Created draft"]]),
    ...deal,
  }));

  return [...live, ...extra];
};

const buildStaff = () =>
  [
    { id: "s1", name: "Ravi Kumar", email: "ravi.kumar@dealsphere.test", role: "deals", active: true, lastActive: ago(0) },
    { id: "s2", name: "Ananya Rao", email: "ananya.rao@dealsphere.test", role: "finance", active: true, lastActive: ago(1) },
    { id: "s3", name: "Meera Shah", email: "meera.shah@dealsphere.test", role: "marketing", active: true, lastActive: ago(2) },
    { id: "s4", name: "Arjun Patel", email: "arjun.patel@dealsphere.test", role: "analytics", active: true, lastActive: ago(1) },
    { id: "s5", name: "Kavya Iyer", email: "kavya.iyer@dealsphere.test", role: "deals", active: true, lastActive: ago(0) },
    { id: "s6", name: "Rohan Das", email: "rohan.das@dealsphere.test", role: "custom", active: false, lastActive: ago(40) },
  ].map((member) => ({ ...member, permissions: clonePermissions(ROLE_DEFAULTS[member.role]) }));

const buildTasks = () => [
  {
    id: "T-1",
    title: "Verify coupon codes for Electronics offers",
    description: "Check each active Electronics code against the merchant checkout and note any that fail.",
    module: "deals",
    assignee: "s1",
    priority: "High",
    due: addDays(2),
    status: "In Progress",
    reference: "Coupons & Deals → filter Electronics",
    comments: [{ at: ago(1), author: "Ravi Kumar", text: "Three of four checked so far." }],
    createdAt: ago(4),
  },
  {
    id: "T-2",
    title: "Add expiry dates to active offers",
    description: "Several live offers have no expiry recorded. Add dates where the source supplies them.",
    module: "deals",
    assignee: "s5",
    priority: "Medium",
    due: addDays(-1),
    status: "Pending",
    reference: "",
    comments: [],
    createdAt: ago(6),
  },
  {
    id: "T-3",
    title: "Reconcile September statement (Sample Network A)",
    description: "Compare recorded estimates with the partner-reported approved payout.",
    module: "finance",
    assignee: "s2",
    priority: "High",
    due: addDays(5),
    status: "Pending",
    reference: "Finance → Statements",
    comments: [],
    createdAt: ago(2),
  },
  {
    id: "T-4",
    title: "Prepare monthly engagement summary",
    description: "Searches, deal views and outbound clicks for the last 30 days.",
    module: "analytics",
    assignee: "s4",
    priority: "Low",
    due: addDays(7),
    status: "Needs Review",
    reference: "Reports → Analytics report",
    comments: [{ at: ago(0), author: "Arjun Patel", text: "Submitted for review." }],
    createdAt: ago(8),
  },
  {
    id: "T-5",
    title: "Draft festive campaign copy",
    description: "Headline and description for the festive savings campaign.",
    module: "campaigns",
    assignee: "s3",
    priority: "Medium",
    due: addDays(10),
    status: "In Progress",
    reference: "Campaigns → Festive season savings",
    comments: [],
    createdAt: ago(3),
  },
  {
    id: "T-6",
    title: "Record October hosting expense",
    description: "Add the hosting invoice as an expense entry with its reference.",
    module: "finance",
    assignee: "s2",
    priority: "Low",
    due: addDays(-3),
    status: "Completed",
    reference: "",
    comments: [],
    createdAt: ago(9),
  },
  {
    id: "T-7",
    title: "Evaluate CouponAPI plan and data rights",
    description: "Withdrawn: provider evaluation moved to management review.",
    module: "partners",
    assignee: "s4",
    priority: "Low",
    due: addDays(4),
    status: "Cancelled",
    reference: "",
    comments: [],
    createdAt: ago(12),
  },
];

const buildFinance = () => {
  const commission = [
    ["COM-2026-0901", "Sample Network A", "Amazon", 48200, 2410, "Paid", "STM-A-AUG"],
    ["COM-2026-0902", "Sample Network A", "Flipkart", 31500, 1260, "Approved", "STM-A-SEP"],
    ["COM-2026-0903", "Sample Network B", "Myntra", 22800, 1596, "Pending", "STM-B-SEP"],
    ["COM-2026-0904", "Sample Network B", "Nykaa", 9400, 564, "Estimated", ""],
    ["COM-2026-0905", "Sample Network C", "Travel Store", 64000, 1920, "Approved", "STM-C-SEP"],
    ["COM-2026-0906", "Sample Network C", "Food Store", 5200, 260, "Reversed", "STM-C-SEP"],
    ["COM-2026-0907", "Sample Network A", "Amazon", 17600, 880, "Estimated", ""],
    ["COM-2026-0908", "Sample Network B", "Myntra", 12300, 861, "Disputed", "STM-B-SEP"],
  ].map(([ref, partner, merchant, saleValue, amount, status, statement], i) => ({
    id: ref,
    kind: "Commission",
    partner,
    merchant,
    saleValue,
    amount,
    status,
    statement,
    date: addDays(-(4 + i * 5)),
    approver: ["Approved", "Paid"].includes(status) ? "Admin (demo)" : "",
    note: "",
  }));

  const expenses = [
    ["EXP-2026-031", "Hosting (placeholder vendor)", 3800, "Approved"],
    ["EXP-2026-032", "Design tools subscription", 2100, "Recorded"],
    ["EXP-2026-033", "Content research hours", 6500, "Recorded"],
  ].map(([ref, note, amount, status], i) => ({
    id: ref,
    kind: "Expense",
    partner: "",
    merchant: "",
    saleValue: 0,
    amount,
    status,
    statement: "",
    date: addDays(-(3 + i * 7)),
    approver: status === "Approved" ? "Admin (demo)" : "",
    note,
  }));

  return [...commission, ...expenses];
};

const buildStatements = () => [
  { id: "STM-A-SEP", partner: "Sample Network A", period: "Sep 2026", reportedApproved: 1210, payoutDate: addDays(12), payoutStatus: "Scheduled", reconciliation: "Unreconciled" },
  { id: "STM-B-SEP", partner: "Sample Network B", period: "Sep 2026", reportedApproved: 2310, payoutDate: addDays(18), payoutStatus: "Scheduled", reconciliation: "Difference found" },
  { id: "STM-C-SEP", partner: "Sample Network C", period: "Sep 2026", reportedApproved: 1920, payoutDate: addDays(9), payoutStatus: "Scheduled", reconciliation: "Unreconciled" },
  { id: "STM-A-AUG", partner: "Sample Network A", period: "Aug 2026", reportedApproved: 2410, payoutDate: addDays(-20), payoutStatus: "Paid", reconciliation: "Reconciled" },
];

// ARD §10 provider list, with the ARD's own potential use and validation notes.
const buildPartners = () =>
  [
    ["GrabOn", "Coupon content source", ["Coupons", "Merchant deals"], "Potential coupon/deal content source or partnership.", "Confirm partnership contact, feed/API availability, redistribution permission, and terms."],
    ["CouponDunia", "Coupon content source", ["Coupons"], "Potential coupons and promotional offers.", "Confirm available partner program and permitted data access."],
    ["Cuelinks", "Affiliate network", ["Affiliate links"], "Affiliate network and monetization/link conversion.", "Review merchant coverage, tracking, reporting, and payout terms."],
    ["Admitad", "Affiliate network", ["Affiliate links", "Merchant deals"], "Affiliate network, merchant offers, and tracking.", "Confirm relevant campaigns, approval, data feed/API availability, and commission terms."],
    ["VCommission", "Affiliate network", ["Affiliate links"], "Affiliate campaigns and merchant partnerships.", "Confirm program eligibility, tracking integration, and payout/reporting terms."],
    ["Impact.com", "Affiliate platform", ["Affiliate links"], "Affiliate partnership management and tracking.", "Requires partner/advertiser access and approved integrations."],
    ["Amazon Associates", "Affiliate program", ["Affiliate links"], "Affiliate links for eligible Amazon products.", "Follow program policies, disclosure, link rules, and permitted content requirements."],
    ["CouponAPI", "Coupon data API", ["Coupons"], "Potential coupon API/data provider.", "Validate current plan, coverage, API limits, data rights, and pricing."],
    ["FMTC", "Offer/coupon feed", ["Coupons", "Merchant deals"], "Potential affiliate offer/coupon feeds.", "Confirm network coverage, licensing, access, and feed terms."],
    ["Feeds4", "Product feed", ["Product feeds"], "Potential product/affiliate feed source.", "Confirm available feeds, merchant coverage, update frequency, and licensing."],
    ["Keepa", "Price data tool", ["Price history"], "Product price history and price-tracking data, depending on access.", "Treat as a possible price-data tool, not a general coupon provider; verify API terms and coverage."],
  ].map(([name, type, dataTypes, use, notes], i) => ({
    id: `P-${i + 1}`,
    name,
    type,
    dataTypes,
    use,
    notes,
    status: "Proposed",
    contact: "",
    owner: "",
    method: "To be decided",
    contract: "Not started",
    permittedUse: "",
    disclosure: "",
    renewal: "",
    credentialRef: "",
    lastSync: "",
    lastError: "",
    support: "",
    verification: { contract: false, access: false, tested: false },
  }));

const buildCampaigns = () => [
  {
    id: "C-1",
    name: "Festive season savings",
    description: "Highlight seasonal offers across Fashion and Beauty.",
    tags: ["festive", "seasonal"],
    status: "Draft",
    owner: "s3",
    deals: ["D-101", "D-103"],
  },
  {
    id: "C-2",
    name: "Back to campus tech",
    description: "Electronics offers for students.",
    tags: ["electronics", "students"],
    status: "Approved",
    owner: "s3",
    deals: ["D-102", "D-201"],
  },
];

const buildCategories = () =>
  publicCategories.map((category, i) => ({
    id: `CAT-${i + 1}`,
    name: category.name,
    icon: category.icon,
    description: category.description,
    visible: true,
    order: i,
  }));

const buildAudit = () => [
  { id: "A-3", at: ago(0), actor: "Arjun Patel", role: "Analytics Staff", module: "staff", action: "Submitted task for review", target: "T-4" },
  { id: "A-2", at: ago(2), actor: "Admin (demo)", role: "Admin", module: "staff", action: "Assigned task", target: "T-3 → Ananya Rao" },
  { id: "A-1", at: ago(28), actor: "Admin (demo)", role: "Admin", module: "deals", action: "Approved and published", target: "D-101" },
];

// Open decisions from ARD §20.3 are stored as explicit "pending" placeholders.
const buildSettings = () => ({
  currency: "INR",
  currencyDecision: "Pending management decision",
  categoryPolicy: "Pending management decision",
  verificationPolicy: "Pending management decision",
  priceAlertsScope: "Pending management decision",
});

export const buildInitialState = () => ({
  version: 2,
  seededAt: nowISO(),
  demoData: true,
  viewerId: ADMIN_USER.id,
  // One demo "session" per staff member: the permissions they signed in with.
  sessions: {},
  deals: buildDeals(),
  categories: buildCategories(),
  staff: buildStaff(),
  tasks: buildTasks(),
  finance: buildFinance(),
  statements: buildStatements(),
  approvals: [
    {
      id: "AP-1",
      requestedBy: "Ananya Rao",
      at: ago(1),
      type: "Payout details change",
      target: "Sample Network B",
      detail: "Update payout bank reference (details withheld in demo).",
      status: "Pending",
    },
  ],
  partners: buildPartners(),
  campaigns: buildCampaigns(),
  reports: [],
  settings: buildSettings(),
  audit: buildAudit(),
});
