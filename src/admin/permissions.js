// Role-based access model from ARD §5 (roles), §5.1 (permission principles)
// and §9 (staff modules). This is a FRONTEND PREVIEW of the permission matrix:
// hiding modules here is not security. Real enforcement must happen on the
// server (ARD §18).

// Admin navigation follows ARD Appendix A. "My Dashboard" is the staff
// dashboard from ARD §9; "Campaigns" is the Marketing staff module from §5/§9.
export const MODULES = [
  { id: "overview", label: "Overview", icon: "grid", path: "" },
  { id: "my", label: "My Dashboard", icon: "user", path: "my" },
  { id: "analytics", label: "Analytics", icon: "chart", path: "analytics" },
  { id: "sales", label: "Sales & Revenue", icon: "wallet", path: "sales" },
  { id: "staff", label: "Staff & Tasks", icon: "users", path: "staff" },
  { id: "finance", label: "Finance", icon: "receipt", path: "finance" },
  { id: "categories", label: "Categories", icon: "layers", path: "categories" },
  { id: "deals", label: "Coupons & Deals", icon: "tag", path: "deals" },
  { id: "partners", label: "Partners", icon: "link", path: "partners" },
  { id: "campaigns", label: "Campaigns", icon: "megaphone", path: "campaigns" },
  { id: "reports", label: "Reports", icon: "file", path: "reports" },
  { id: "settings", label: "Settings & Audit Log", icon: "settings", path: "settings" },
];

// ARD §5.1: "view, create, edit, publish/approve, export, or delete".
export const ACTIONS = [
  { id: "view", label: "View" },
  { id: "create", label: "Create" },
  { id: "edit", label: "Edit" },
  { id: "publish", label: "Publish / approve" },
  { id: "export", label: "Export" },
  { id: "delete", label: "Delete" },
];

export const ROLES = {
  admin: { label: "Admin", purpose: "Owns overall platform operations and configuration." },
  deals: { label: "Deals / Content Staff", purpose: "Maintain offer records." },
  finance: { label: "Finance Staff", purpose: "Maintain financial records and reports." },
  marketing: { label: "Marketing Staff", purpose: "Support campaigns and promotions." },
  analytics: { label: "Analytics Staff", purpose: "Analyze platform and offer performance." },
  custom: { label: "Other Staff / Custom Role", purpose: "Admin selects permitted modules and actions." },
};

export const STAFF_ROLE_IDS = ["deals", "finance", "marketing", "analytics", "custom"];

// Starting permissions per role, derived from the "Main permissions" column of
// ARD §5. The final matrix is an open management decision (ARD §20.3), so these
// are editable per staff member.
export const ROLE_DEFAULTS = {
  deals: { my: ["view"], deals: ["view", "create", "edit"], categories: ["view"] },
  finance: {
    my: ["view"],
    finance: ["view", "create", "edit", "export"],
    reports: ["view", "export"],
  },
  marketing: { my: ["view"], campaigns: ["view", "edit"], analytics: ["view"] },
  analytics: { my: ["view"], analytics: ["view"], reports: ["view"] },
  custom: { my: ["view"] },
};

export const clonePermissions = (permissions) =>
  Object.fromEntries(Object.entries(permissions).map(([key, list]) => [key, [...list]]));

// Admin has every module except the staff-only "My Dashboard".
export const can = (viewer, moduleId, action = "view") => {
  if (!viewer) return false;
  if (viewer.role === "admin") return moduleId !== "my";
  return Boolean(viewer.permissions?.[moduleId]?.includes(action));
};
