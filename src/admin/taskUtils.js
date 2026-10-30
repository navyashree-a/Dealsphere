import { ROLES } from "./permissions";

// Task status values from ARD §9.1 / Appendix C.
export const TASK_STATUSES = ["Pending", "In Progress", "Needs Review", "Completed", "Overdue", "Cancelled"];

export const assigneeLabel = (assignee, staffName) =>
  assignee?.startsWith("role:") ? `Role: ${ROLES[assignee.slice(5)]?.label}` : staffName(assignee);
