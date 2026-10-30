import { useState } from "react";
import Icon from "../../components/Icon";
import { useAdmin } from "../adminContext";
import { MODULES, ROLES } from "../permissions";
import { daysUntil, fmtDate, fmtDateTime, taskDisplayStatus } from "../adminUtils";
import { TaskDetail } from "./StaffTasks";
import { EmptyBlock, PageHeader, Panel, Stat, StatusBadge } from "../AdminUI";

// ARD §9 My Dashboard: assigned tasks, due dates, announcements and recent
// activity. Staff can open tasks, update status, comment and submit for review.
function MyDashboard() {
  const { state, viewer, can, navigate } = useAdmin();
  const [open, setOpen] = useState(null);

  const mine = state.tasks
    .filter((t) => t.assignee === viewer.id || t.assignee === `role:${viewer.role}`)
    .sort((a, b) => (a.due < b.due ? -1 : 1));
  const active = mine.filter((t) => !["Completed", "Cancelled"].includes(t.status));
  const count = (s) => mine.filter((t) => taskDisplayStatus(t) === s).length;
  const activity = state.audit.filter((a) => a.actor === viewer.name).slice(0, 8);
  const modules = MODULES.filter((m) => !["my", "overview"].includes(m.id) && can(m.id, "view"));

  return (
    <>
      <PageHeader
        eyebrow={ROLES[viewer.role]?.label}
        title={`Welcome, ${viewer.name.split(" ")[0]}`}
        description="Your assigned tasks and the modules your role can access."
      />

      <div className="adm-stats adm-stats--4">
        <Stat label="Pending" value={count("Pending")} source="record" />
        <Stat label="In progress" value={count("In Progress")} source="record" />
        <Stat label="Needs review" value={count("Needs Review")} source="record" />
        <Stat label="Overdue" value={count("Overdue")} source="record" />
      </div>

      <div className="adm-grid adm-grid--2-1">
        <Panel title="My tasks" subtitle="Assigned to you or your role" flush>
          {active.length ? (
            <ul className="adm-task-cards">
              {active.map((t) => {
                const left = daysUntil(t.due);
                return (
                  <li key={t.id}>
                    <button type="button" className="adm-task-card" onClick={() => setOpen(t)}>
                      <span className="adm-task-card__top">
                        <strong>{t.title}</strong>
                        <StatusBadge status={taskDisplayStatus(t)} />
                      </span>
                      <span className="adm-task-card__meta">
                        <span className={`adm-priority adm-priority--${t.priority.toLowerCase()}`}>{t.priority}</span>
                        <span><Icon name="clock" size={14} /> {fmtDate(t.due)}{left !== null && left >= 0 ? ` · ${left === 0 ? "today" : `in ${left}d`}` : ""}</span>
                        {t.assignee.startsWith("role:") && <span>Role task</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyBlock icon="check" title="No open tasks">New tasks assigned to you will appear here.</EmptyBlock>
          )}
        </Panel>

        <div className="adm-stack">
          <Panel title="Announcements">
            <EmptyBlock icon="megaphone" title="No announcements">
              Placeholder - the ARD lists announcements on the staff dashboard but doesn't define who publishes them.
            </EmptyBlock>
          </Panel>
          <Panel title="Your modules">
            <div className="adm-quick">
              {modules.map((m) => (
                <button key={m.id} type="button" className="chip-btn" onClick={() => navigate(m.path)}>
                  <Icon name={m.icon} size={15} /> {m.label}
                </button>
              ))}
              {!modules.length && <span className="muted">No modules granted yet.</span>}
            </div>
          </Panel>
          <Panel title="Recent activity">
            {activity.length ? (
              <ul className="adm-timeline">
                {activity.map((a) => (
                  <li key={a.id}>
                    <span className="adm-sub">{fmtDateTime(a.at)}</span>
                    <strong>{a.action}</strong>
                    <span>{a.target}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No activity yet.</p>
            )}
          </Panel>
        </div>
      </div>

      {open && <TaskDetail task={open} onClose={() => setOpen(null)} mode="staff" />}
    </>
  );
}

export default MyDashboard;
