// Small helpers shared by the admin panel. Kept outside components so
// impure calls (Date, random IDs) only run inside event handlers.

let idCounter = 0;
export const makeId = (prefix) => {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}${idCounter}`;
};

const pad = (n) => String(n).padStart(2, "0");
const toISODate = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const todayISO = () => toISODate(new Date());
export const nowISO = () => new Date().toISOString();

export const addDays = (days, from = new Date()) => {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return toISODate(date);
};

export const daysUntil = (isoDate) => {
  if (!isoDate) return null;
  const today = new Date(todayISO());
  return Math.round((new Date(isoDate) - today) / 86400000);
};

export const fmtDate = (isoDate) => {
  if (!isoDate) return "—";
  const date = new Date(isoDate.length === 10 ? `${isoDate}T00:00:00` : isoDate);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export const fmtDateTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Reporting currency is an open decision (ARD §20.3); INR is a labelled
// placeholder set in Settings.
export const money = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);

export const num = (value) => new Intl.NumberFormat("en-IN").format(Math.round(value || 0));

export const compact = (value) =>
  new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);

export const pct = (value, digits = 1) => `${(value * 100).toFixed(digits)}%`;

// Task status per ARD §9.1. "Overdue" is derived: due date passed and the task
// is not completed or cancelled.
export const taskDisplayStatus = (task) => {
  if (["Completed", "Cancelled"].includes(task.status)) return task.status;
  const left = daysUntil(task.due);
  if (left !== null && left < 0) return "Overdue";
  return task.status;
};

const csvCell = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// Builds a CSV in the browser and hands it to the viewer as a download.
export const downloadCSV = (filename, rows) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(","), ...rows.map((row) => headers.map((h) => csvCell(row[h])).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Deterministic pseudo-random number in [0, 1) so demo charts are stable.
export const seeded = (seed) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
