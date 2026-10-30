import { useState } from "react";
import Icon from "../../components/Icon";
import { useAdmin } from "../adminContext";
import { ACTIONS, MODULES, ROLES, ROLE_DEFAULTS, STAFF_ROLE_IDS, can as canDo, clonePermissions } from "../permissions";
import { daysUntil, fmtDate, fmtDateTime, makeId, nowISO, taskDisplayStatus, todayISO } from "../adminUtils";
import { TASK_STATUSES, assigneeLabel } from "../taskUtils";
import { EmptyBlock, Field, FilterBar, Modal, Notice, PageHeader, Panel, SelectField, StatusBadge, Tabs } from "../AdminUI";

const PRIORITIES = ["High", "Medium", "Low"];
const TASK_AREAS = MODULES.filter((m) => !["overview", "my"].includes(m.id));

/* ---------- Task detail (shared with My Dashboard) ---------- */
export function TaskDetail({ task, onClose, mode = "admin" }) {
  const { state, patch, notify, staffName, viewer, can } = useAdmin();
  const [comment, setComment] = useState("");
  const live = state.tasks.find((t) => t.id === task.id) || task;
  const display = taskDisplayStatus(live);
  const canEdit = mode === "admin" && can("staff", "edit");
  const audit = (action) => ({ module: "staff", action, target: `${live.id} · ${live.title}` });

  const update = (changes, action, message) => {
    patch("tasks", live.id, changes, audit(action));
    notify(message);
  };

  const addComment = (text, extra = {}) => {
    patch(
      "tasks",
      live.id,
      (t) => ({ ...extra, comments: [...t.comments, { at: nowISO(), author: viewer.name, text }] }),
      audit(extra.status ? `Status → ${extra.status}` : "Added comment")
    );
  };

  const eligible = state.staff.filter((s) => s.active && canDo({ ...s }, live.module, "view"));

  return (
    <Modal
      title={live.title}
      description={`${live.id} · created ${fmtDate(live.createdAt)}`}
      onClose={onClose}
      size="lg"
      footer={
        <div className="adm-modal__actions">
          {mode === "staff" && live.status === "Pending" && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => update({ status: "In Progress" }, "Status → In Progress", "Task started.")}>
              Start task
            </button>
          )}
          {mode === "staff" && ["Pending", "In Progress"].includes(live.status) && (
            <button
              type="button"
              className="btn btn--lime btn--sm"
              onClick={() => {
                addComment("Submitted for review.", { status: "Needs Review" });
                notify("Submitted for review.");
              }}
            >
              <Icon name="check" size={16} /> Submit for review
            </button>
          )}
          {canEdit && live.status === "Needs Review" && (
            <>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  addComment(comment.trim() || "Changes requested.", { status: "In Progress" });
                  setComment("");
                  notify("Changes requested - task returned to In Progress.");
                }}
              >
                Request changes
              </button>
              <button type="button" className="btn btn--lime btn--sm" onClick={() => update({ status: "Completed" }, "Accepted and closed", "Task accepted and closed.")}>
                <Icon name="check" size={16} /> Accept & close
              </button>
            </>
          )}
          {canEdit && ["Completed", "Cancelled"].includes(live.status) && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => update({ status: "Pending" }, "Reopened task", "Task reopened.")}>
              Reopen
            </button>
          )}
          {canEdit && !["Completed", "Cancelled"].includes(live.status) && (
            <button
              type="button"
              className="btn btn--ghost btn--sm adm-danger-btn"
              onClick={() => update({ status: "Cancelled" }, "Cancelled task", "Task cancelled.")}
            >
              Cancel task
            </button>
          )}
        </div>
      }
    >
      <div className="adm-task-meta">
        <StatusBadge status={display} />
        <span className={`adm-priority adm-priority--${live.priority.toLowerCase()}`}>{live.priority} priority</span>
        <span className="adm-sub">Due {fmtDate(live.due)}</span>
      </div>

      <p className="adm-task-desc">{live.description || "No description."}</p>

      {canEdit ? (
        <div className="adm-form-grid">
          <Field label="Assignee" htmlFor="task-assignee">
            <select
              id="task-assignee"
              className="input"
              value={live.assignee}
              onChange={(e) => update({ assignee: e.target.value }, "Changed assignee", "Assignee updated.")}
            >
              {eligible.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              {STAFF_ROLE_IDS.map((r) => (
                <option key={r} value={`role:${r}`}>Role: {ROLES[r].label}</option>
              ))}
              {!eligible.some((s) => s.id === live.assignee) && !live.assignee.startsWith("role:") && (
                <option value={live.assignee}>{staffName(live.assignee)} (no longer eligible)</option>
              )}
            </select>
          </Field>
          <Field label="Priority" htmlFor="task-priority">
            <select id="task-priority" className="input" value={live.priority} onChange={(e) => update({ priority: e.target.value }, "Changed priority", "Priority updated.")}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Due date" htmlFor="task-due">
            <input id="task-due" className="input" type="date" value={live.due} onChange={(e) => e.target.value && update({ due: e.target.value }, "Changed due date", "Due date updated.")} />
          </Field>
        </div>
      ) : (
        <dl className="adm-dl">
          <dt>Assignee</dt><dd>{assigneeLabel(live.assignee, staffName)}</dd>
          <dt>Area</dt><dd>{MODULES.find((m) => m.id === live.module)?.label}</dd>
        </dl>
      )}

      <dl className="adm-dl">
        <dt>Reference material</dt><dd>{live.reference || "None provided"}</dd>
        <dt>Attachments</dt><dd className="muted">Not supported in the demo - file storage requires a backend (ARD §8 "if supported").</dd>
      </dl>

      <h3 className="adm-h3">Comments</h3>
      {live.comments.length ? (
        <ul className="adm-comments">
          {live.comments.map((c, i) => (
            <li key={i}>
              <strong>{c.author}</strong>
              <span className="adm-sub">{fmtDateTime(c.at)}</span>
              <p>{c.text}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No comments yet.</p>
      )}
      <form
        className="adm-comment-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!comment.trim()) return;
          addComment(comment.trim());
          setComment("");
          notify("Comment added.");
        }}
      >
        <label htmlFor="task-comment" className="sr-only">Add a comment</label>
        <input id="task-comment" className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment" />
        <button type="submit" className="btn btn--ghost btn--sm" disabled={!comment.trim()}>
          <Icon name="message" size={16} /> Comment
        </button>
      </form>
    </Modal>
  );
}

/* ---------- Create task (ARD §8.1 workflow) ---------- */
function CreateTask({ onClose }) {
  const { state, add, notify, staffName } = useAdmin();
  const [form, setForm] = useState({ title: "", description: "", module: "deals", priority: "Medium", due: "", reference: "", assignee: "" });
  const [error, setError] = useState("");
  const eligible = state.staff.filter((s) => s.active && canDo(s, form.module, "view"));
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.due || !form.assignee) {
      setError("Title, due date and assignee are required.");
      return;
    }
    if (form.due < todayISO()) {
      setError("The due date can't be in the past.");
      return;
    }
    const task = { ...form, id: makeId("T"), title: form.title.trim(), status: "Pending", comments: [], createdAt: nowISO() };
    add("tasks", task, { module: "staff", action: "Assigned task", target: `${task.title} → ${assigneeLabel(task.assignee, staffName)}` });
    notify("Task created and assigned.");
    onClose();
  };

  return (
    <Modal
      title="Create task"
      description="The assignee will see this task in their dashboard."
      onClose={onClose}
      size="lg"
      footer={
        <div className="adm-modal__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancel</button>
          <button type="submit" form="create-task" className="btn btn--lime btn--sm">
            <Icon name="plus" size={16} /> Create & assign
          </button>
        </div>
      }
    >
      <form id="create-task" className="adm-form" onSubmit={submit} noValidate>
        <Field label="Task title" htmlFor="ct-title" required>
          <input id="ct-title" className="input" value={form.title} onChange={set("title")} maxLength={120} />
        </Field>
        <Field label="Description" htmlFor="ct-desc">
          <textarea id="ct-desc" className="input adm-textarea" value={form.description} onChange={set("description")} rows={3} />
        </Field>
        <div className="adm-form-grid">
          <Field label="Area" htmlFor="ct-module" hint="Assignees must have access to this module.">
            <select id="ct-module" className="input" value={form.module} onChange={(e) => setForm((f) => ({ ...f, module: e.target.value, assignee: "" }))}>
              {TASK_AREAS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Priority" htmlFor="ct-priority">
            <select id="ct-priority" className="input" value={form.priority} onChange={set("priority")}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Due date" htmlFor="ct-due" required>
            <input id="ct-due" className="input" type="date" min={todayISO()} value={form.due} onChange={set("due")} />
          </Field>
          <Field label="Assign to" htmlFor="ct-assignee" required>
            <select id="ct-assignee" className="input" value={form.assignee} onChange={set("assignee")}>
              <option value="">Select staff member or role</option>
              <optgroup label="Staff with access">
                {eligible.map((s) => <option key={s.id} value={s.id}>{s.name} · {ROLES[s.role].label}</option>)}
              </optgroup>
              <optgroup label="Roles">
                {STAFF_ROLE_IDS.map((r) => <option key={r} value={`role:${r}`}>{ROLES[r].label}</option>)}
              </optgroup>
            </select>
          </Field>
        </div>
        {eligible.length === 0 && <Notice tone="warning" icon="alert">No active staff member can access this module yet. Assign to a role or update permissions first.</Notice>}
        <Field label="Reference material" htmlFor="ct-ref" hint="Links or notes. File attachments need backend storage.">
          <input id="ct-ref" className="input" value={form.reference} onChange={set("reference")} />
        </Field>
        {error && <Notice tone="critical" icon="alert">{error}</Notice>}
      </form>
    </Modal>
  );
}

/* ---------- Staff: create / permissions / activity ---------- */
function StaffEditor({ member, onClose }) {
  const { add, patch, notify, state } = useAdmin();
  const isNew = !member;
  const [form, setForm] = useState(
    member
      ? { name: member.name, email: member.email, role: member.role, permissions: clonePermissions(member.permissions) }
      : { name: "", email: "", role: "deals", permissions: clonePermissions(ROLE_DEFAULTS.deals) }
  );
  const [error, setError] = useState("");

  const toggle = (moduleId, action) =>
    setForm((f) => {
      const current = new Set(f.permissions[moduleId] || []);
      if (current.has(action)) {
        current.delete(action);
        if (action === "view") current.clear(); // no other action without view
      } else {
        current.add(action);
        current.add("view");
      }
      return { ...f, permissions: { ...f.permissions, [moduleId]: [...current] } };
    });

  const save = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) {
      setError("Enter a name and a valid email address.");
      return;
    }
    if (isNew && state.staff.some((s) => s.email.toLowerCase() === form.email.toLowerCase())) {
      setError("A staff account with this email already exists.");
      return;
    }
    if (isNew) {
      const created = { id: makeId("s"), name: form.name.trim(), email: form.email.trim(), role: form.role, permissions: form.permissions, active: true, lastActive: "" };
      add("staff", created, { module: "staff", action: "Created staff account", target: `${created.name} · ${ROLES[created.role].label}` }, true);
      notify("Staff account created (demo only).");
    } else {
      patch("staff", member.id, { name: form.name.trim(), email: form.email.trim(), role: form.role, permissions: form.permissions }, {
        module: "staff",
        action: "Updated role / permissions",
        target: `${form.name} · ${ROLES[form.role].label}`,
      });
      notify("Permissions saved. They apply after the staff member's session is refreshed.");
    }
    onClose();
  };

  return (
    <Modal
      title={isNew ? "Create staff account" : `Edit ${member.name}`}
      description="Permissions are configurable by module and action (ARD §5.1)."
      onClose={onClose}
      size="xl"
      footer={
        <div className="adm-modal__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancel</button>
          <button type="submit" form="staff-form" className="btn btn--lime btn--sm">{isNew ? "Create account" : "Save changes"}</button>
        </div>
      }
    >
      <form id="staff-form" className="adm-form" onSubmit={save} noValidate>
        <div className="adm-form-grid">
          <Field label="Full name" htmlFor="sf-name" required>
            <input id="sf-name" className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Work email" htmlFor="sf-email" required>
            <input id="sf-email" className="input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </Field>
          <Field label="Role" htmlFor="sf-role" hint="Changing the role resets permissions to that role's defaults.">
            <select
              id="sf-role"
              className="input"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value, permissions: clonePermissions(ROLE_DEFAULTS[e.target.value]) }))}
            >
              {STAFF_ROLE_IDS.map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}
            </select>
          </Field>
        </div>

        <h3 className="adm-h3">Module permissions</h3>
        <div className="adm-table-wrap">
          <table className="adm-table adm-matrix">
            <thead>
              <tr>
                <th scope="col">Module</th>
                {ACTIONS.map((a) => <th key={a.id} scope="col">{a.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m) => (
                <tr key={m.id}>
                  <th scope="row">{m.label}</th>
                  {ACTIONS.map((a) => {
                    const checked = Boolean(form.permissions[m.id]?.includes(a.id));
                    return (
                      <td key={a.id}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(m.id, a.id)}
                          aria-label={`${m.label}: ${a.label}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Notice tone="warning" icon="lock">
          Finance records, user data and partner credentials should only be granted to staff who need them. This matrix is a
          frontend preview - real enforcement must happen on the server (ARD §18).
        </Notice>
        {isNew && <Notice>Demo account only - no login is created. Real staff accounts need the authentication service (ARD §16).</Notice>}
        {error && <Notice tone="critical" icon="alert">{error}</Notice>}
      </form>
    </Modal>
  );
}

function ActivityModal({ member, onClose }) {
  const { state } = useAdmin();
  const entries = state.audit.filter((a) => a.actor === member.name);
  return (
    <Modal title={`${member.name} - activity`} description="From the audit log" onClose={onClose}>
      {entries.length ? (
        <ul className="adm-timeline">
          {entries.map((a) => (
            <li key={a.id}>
              <span className="adm-sub">{fmtDateTime(a.at)}</span>
              <strong>{a.action}</strong>
              <span>{a.target}</span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyBlock icon="history" title="No recorded activity">Actions by this staff member will appear here.</EmptyBlock>
      )}
    </Modal>
  );
}

/* ---------- Page ---------- */
function StaffTasks() {
  const { state, patch, notify, can, staffName } = useAdmin();
  const [tab, setTab] = useState("tasks");
  const [statusFilter, setStatusFilter] = useState("");
  const [assignee, setAssignee] = useState("");
  const [query, setQuery] = useState("");
  const [openTask, setOpenTask] = useState(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activity, setActivity] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const tasks = state.tasks
    .filter((t) => !statusFilter || taskDisplayStatus(t) === statusFilter)
    .filter((t) => !assignee || t.assignee === assignee)
    .filter((t) => !query || `${t.title} ${t.description}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (a.due < b.due ? -1 : 1));

  const counts = Object.fromEntries(TASK_STATUSES.map((s) => [s, state.tasks.filter((t) => taskDisplayStatus(t) === s).length]));
  const workload = (id) => state.tasks.filter((t) => t.assignee === id && !["Completed", "Cancelled"].includes(t.status)).length;

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Staff & Tasks"
        description="Assign work, track due dates and manage staff roles and permissions."
        actions={
          tab === "tasks"
            ? can("staff", "create") && (
                <button type="button" className="btn btn--lime btn--sm" onClick={() => setCreating(true)}>
                  <Icon name="plus" size={16} /> Create task
                </button>
              )
            : can("staff", "create") && (
                <button type="button" className="btn btn--lime btn--sm" onClick={() => setEditing("new")}>
                  <Icon name="plus" size={16} /> Add staff
                </button>
              )
        }
      />

      <Tabs
        label="Staff and tasks"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "tasks", label: "Tasks", count: state.tasks.length },
          { id: "staff", label: "Staff", count: state.staff.length },
        ]}
      />

      {tab === "tasks" ? (
        <>
          <div className="adm-chips" role="group" aria-label="Task status summary">
            {TASK_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className={`adm-chip ${statusFilter === s ? "is-active" : ""}`}
                onClick={() => setStatusFilter((v) => (v === s ? "" : s))}
                aria-pressed={statusFilter === s}
              >
                <StatusBadge status={s} />
                <strong>{counts[s]}</strong>
              </button>
            ))}
          </div>

          <FilterBar>
            <label className="adm-search">
              <Icon name="search" size={16} />
              <span className="sr-only">Search tasks</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks" />
            </label>
            <SelectField
              label="Assignee"
              value={assignee}
              onChange={setAssignee}
              options={[{ value: "", label: "Everyone" }, ...state.staff.map((s) => ({ value: s.id, label: s.name })), ...STAFF_ROLE_IDS.map((r) => ({ value: `role:${r}`, label: `Role: ${ROLES[r].label}` }))]}
            />
            {(statusFilter || assignee || query) && (
              <button type="button" className="text-btn" onClick={() => { setStatusFilter(""); setAssignee(""); setQuery(""); }}>
                Clear filters
              </button>
            )}
          </FilterBar>

          <Panel flush>
            {tasks.length ? (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th scope="col">Task</th>
                      <th scope="col">Assignee</th>
                      <th scope="col">Priority</th>
                      <th scope="col">Due</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => {
                      const left = daysUntil(t.due);
                      return (
                        <tr key={t.id}>
                          <td>
                            <button type="button" className="adm-link" onClick={() => setOpenTask(t)}>{t.title}</button>
                            <span className="adm-sub">{MODULES.find((m) => m.id === t.module)?.label} · {t.comments.length} comment(s)</span>
                          </td>
                          <td>{assigneeLabel(t.assignee, staffName)}</td>
                          <td><span className={`adm-priority adm-priority--${t.priority.toLowerCase()}`}>{t.priority}</span></td>
                          <td>
                            {fmtDate(t.due)}
                            {!["Completed", "Cancelled"].includes(t.status) && left !== null && (
                              <span className="adm-sub">{left < 0 ? `${-left} day(s) late` : left === 0 ? "Due today" : `in ${left} day(s)`}</span>
                            )}
                          </td>
                          <td><StatusBadge status={taskDisplayStatus(t)} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyBlock icon="clock" title="No tasks match">Try clearing the filters or create a new task.</EmptyBlock>
            )}
          </Panel>
        </>
      ) : (
        <Panel flush>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Staff member</th>
                  <th scope="col">Role</th>
                  <th scope="col">Modules</th>
                  <th scope="col" className="is-num">Open tasks</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {state.staff.map((s) => {
                  const modules = Object.entries(s.permissions).filter(([, list]) => list.length).map(([id]) => MODULES.find((m) => m.id === id)?.label);
                  return (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.name}</strong>
                        <span className="adm-sub">{s.email}</span>
                      </td>
                      <td>{ROLES[s.role].label}</td>
                      <td className="adm-modules">{modules.join(", ")}</td>
                      <td className="is-num">{workload(s.id)}</td>
                      <td><StatusBadge status={s.active ? "Active" : "Disabled"} /></td>
                      <td>
                        <div className="adm-row-actions">
                          {can("staff", "edit") && (
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(s)}>Permissions</button>
                          )}
                          <button type="button" className="icon-btn" data-tip="Activity" aria-label={`Review ${s.name}'s activity`} onClick={() => setActivity(s)}>
                            <Icon name="history" size={18} />
                          </button>
                          {can("staff", "edit") && (
                            <button type="button" className="text-btn" onClick={() => setConfirm(s)}>
                              {s.active ? "Disable" : "Enable"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {openTask && <TaskDetail task={openTask} onClose={() => setOpenTask(null)} />}
      {creating && <CreateTask onClose={() => setCreating(false)} />}
      {editing && <StaffEditor member={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {activity && <ActivityModal member={activity} onClose={() => setActivity(null)} />}
      {confirm && (
        <Modal
          title={`${confirm.active ? "Disable" : "Enable"} ${confirm.name}?`}
          onClose={() => setConfirm(null)}
          footer={
            <div className="adm-modal__actions">
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirm(null)}>Cancel</button>
              <button
                type="button"
                className={`btn btn--sm ${confirm.active ? "btn--ghost adm-danger-btn" : "btn--lime"}`}
                onClick={() => {
                  patch("staff", confirm.id, { active: !confirm.active }, { module: "staff", action: confirm.active ? "Disabled staff account" : "Enabled staff account", target: confirm.name });
                  notify(`${confirm.name} ${confirm.active ? "disabled" : "enabled"}.`);
                  setConfirm(null);
                }}
              >
                {confirm.active ? "Disable account" : "Enable account"}
              </button>
            </div>
          }
        >
          <p className="muted">
            {confirm.active
              ? `${confirm.name} will lose access. Their ${workload(confirm.id)} open task(s) stay assigned until you reassign them. This change is recorded in the audit log.`
              : `${confirm.name} will regain access with their saved permissions.`}
          </p>
        </Modal>
      )}
    </>
  );
}

export default StaffTasks;
