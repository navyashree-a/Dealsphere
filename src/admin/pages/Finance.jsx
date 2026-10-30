import { useState } from "react";
import Icon from "../../components/Icon";
import { useAdmin } from "../adminContext";
import { MERCHANTS, SAMPLE_NETWORKS } from "../adminData";
import { COMMISSION_STATES } from "../adminMetrics";
import { downloadCSV, fmtDate, fmtDateTime, makeId, money, nowISO, todayISO } from "../adminUtils";
import { BarList, EmptyBlock, Field, Modal, Notice, PageHeader, Panel, SourceTag, Stat, StatusBadge, Tabs } from "../AdminUI";

const EXPENSE_STATES = ["Recorded", "Approved"];
// ARD §12.2: sensitive changes require approval as configured. In this demo,
// a change is sensitive when it touches an approved/paid entry, moves an entry
// into an approved/paid/reversed state, or changes an amount on such an entry.
const LOCKED_STATES = ["Approved", "Paid"];
const isSensitive = (before, after) =>
  LOCKED_STATES.includes(before.status) ||
  (before.status !== after.status && ["Approved", "Paid", "Reversed"].includes(after.status));

const sumBy = (rows, statuses) => rows.filter((r) => statuses.includes(r.status)).reduce((t, r) => t + r.amount, 0);

function EntryForm({ entry, kind, onClose }) {
  const { add, patch, notify, can, viewer } = useAdmin();
  const isNew = !entry;
  const [form, setForm] = useState(
    entry || {
      kind,
      partner: kind === "Commission" ? SAMPLE_NETWORKS[0] : "",
      merchant: kind === "Commission" ? MERCHANTS[0] : "",
      saleValue: "",
      amount: "",
      status: kind === "Commission" ? "Estimated" : "Recorded",
      statement: "",
      date: todayISO(),
      note: "",
    }
  );
  const [error, setError] = useState("");
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const statuses = form.kind === "Commission" ? COMMISSION_STATES : EXPENSE_STATES;
  const approver = can("finance", "publish");

  const submit = (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    const clean = { ...form, amount, saleValue: Number(form.saleValue) || 0 };

    if (isNew) {
      if (!approver && LOCKED_STATES.includes(clean.status)) {
        setError("Only an authorized approver can record an entry as Approved or Paid.");
        return;
      }
      const record = {
        ...clean,
        id: makeId(form.kind === "Commission" ? "COM" : "EXP"),
        approver: LOCKED_STATES.includes(clean.status) ? viewer.name : "",
        history: [{ at: nowISO(), actor: viewer.name, action: "Created entry" }],
      };
      add("finance", record, { module: "finance", action: `Added ${form.kind.toLowerCase()} entry`, target: `${record.id} · ${money(amount)}` });
      notify("Finance entry added.");
      onClose();
      return;
    }

    if (isSensitive(entry, clean) && !approver) {
      add("approvals", {
        id: makeId("AP"),
        requestedBy: viewer.name,
        at: nowISO(),
        type: "Finance record change",
        target: entry.id,
        detail: `Status ${entry.status} → ${clean.status}; amount ${money(entry.amount)} → ${money(amount)}`,
        proposed: clean,
        status: "Pending",
      }, { module: "finance", action: "Requested approval for sensitive change", target: entry.id });
      notify("This change needs approval - request sent to an approver.", "info");
      onClose();
      return;
    }

    patch(
      "finance",
      entry.id,
      (r) => ({
        ...clean,
        approver: LOCKED_STATES.includes(clean.status) ? viewer.name : r.approver,
        history: [...(r.history || []), { at: nowISO(), actor: viewer.name, action: `Edited (status ${r.status} → ${clean.status}, amount ${money(r.amount)} → ${money(amount)})` }],
      }),
      { module: "finance", action: "Edited finance entry", target: `${entry.id}` }
    );
    notify("Finance entry updated.");
    onClose();
  };

  return (
    <Modal
      title={isNew ? `Add ${form.kind.toLowerCase()} entry` : `Edit ${entry.id}`}
      description={isNew ? "Demo record - stored in this browser only." : "Changes are kept in the record's history."}
      onClose={onClose}
      size="lg"
      footer={
        <div className="adm-modal__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancel</button>
          <button type="submit" form="entry-form" className="btn btn--lime btn--sm">{isNew ? "Add entry" : "Save"}</button>
        </div>
      }
    >
      <form id="entry-form" className="adm-form" onSubmit={submit} noValidate>
        <div className="adm-form-grid">
          {form.kind === "Commission" && (
            <>
              <Field label="Partner" htmlFor="ef-partner">
                <select id="ef-partner" className="input" value={form.partner} onChange={set("partner")}>
                  {SAMPLE_NETWORKS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Merchant" htmlFor="ef-merchant">
                <select id="ef-merchant" className="input" value={form.merchant} onChange={set("merchant")}>
                  {MERCHANTS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Merchant sale value" htmlFor="ef-sale" hint="Not DealSphere revenue (ARD §12.2).">
                <input id="ef-sale" className="input" type="number" min="0" value={form.saleValue} onChange={set("saleValue")} />
              </Field>
            </>
          )}
          <Field label={form.kind === "Commission" ? "Commission amount" : "Expense amount"} htmlFor="ef-amount" required>
            <input id="ef-amount" className="input" type="number" min="1" value={form.amount} onChange={set("amount")} />
          </Field>
          <Field label="Status" htmlFor="ef-status">
            <select id="ef-status" className="input" value={form.status} onChange={set("status")}>
              {statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Date" htmlFor="ef-date">
            <input id="ef-date" className="input" type="date" value={form.date} onChange={set("date")} />
          </Field>
          {form.kind === "Commission" && (
            <Field label="Source statement" htmlFor="ef-statement" hint="Partner statement reference, if any.">
              <input id="ef-statement" className="input" value={form.statement} onChange={set("statement")} />
            </Field>
          )}
        </div>
        <Field label={form.kind === "Commission" ? "Reference / note" : "Description / reference"} htmlFor="ef-note">
          <input id="ef-note" className="input" value={form.note} onChange={set("note")} />
        </Field>
        {!isNew && !approver && LOCKED_STATES.includes(entry.status) && (
          <Notice tone="warning" icon="lock">This entry is {entry.status}. Saving will send your change for approval instead of applying it.</Notice>
        )}
        {!isNew && entry.history?.length > 0 && (
          <>
            <h3 className="adm-h3">Change history</h3>
            <ul className="adm-timeline">
              {entry.history.map((h, i) => (
                <li key={i}>
                  <span className="adm-sub">{fmtDateTime(h.at)}</span>
                  <strong>{h.actor}</strong>
                  <span>{h.action}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {error && <Notice tone="critical" icon="alert">{error}</Notice>}
      </form>
    </Modal>
  );
}

function EntriesTable({ rows, kind, onEdit, canEdit }) {
  const currencyFmt = (v) => money(v);
  if (!rows.length) return <EmptyBlock icon="receipt" title={`No ${kind.toLowerCase()} entries yet`} />;
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            <th scope="col">Reference</th>
            <th scope="col">Date</th>
            {kind === "Commission" ? (
              <>
                <th scope="col">Partner · merchant</th>
                <th scope="col" className="is-num">Merchant sale</th>
                <th scope="col" className="is-num">Commission</th>
                <th scope="col">Statement</th>
              </>
            ) : (
              <>
                <th scope="col">Description</th>
                <th scope="col" className="is-num">Amount</th>
              </>
            )}
            <th scope="col">Status</th>
            <th scope="col">Approver</th>
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td><strong>{r.id}</strong></td>
              <td>{fmtDate(r.date)}</td>
              {kind === "Commission" ? (
                <>
                  <td>{r.partner}<span className="adm-sub">{r.merchant}</span></td>
                  <td className="is-num">{currencyFmt(r.saleValue)}</td>
                  <td className="is-num">{currencyFmt(r.amount)}</td>
                  <td>{r.statement || <span className="muted">—</span>}</td>
                </>
              ) : (
                <>
                  <td>{r.note}</td>
                  <td className="is-num">{currencyFmt(r.amount)}</td>
                </>
              )}
              <td><StatusBadge status={r.status} /></td>
              <td>{r.approver || <span className="muted">—</span>}</td>
              <td>
                {canEdit && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => onEdit(r)}>
                    Edit
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Finance() {
  const { state, can, patch, add, notify, viewer } = useAdmin();
  const [tab, setTab] = useState("summary");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(null);
  const [payoutFor, setPayoutFor] = useState(null);
  const currency = state.settings.currency;
  const fmt = (v) => money(v, currency);

  const commission = state.finance.filter((r) => r.kind === "Commission");
  const expenses = state.finance.filter((r) => r.kind === "Expense");
  const pending = state.approvals.filter((a) => a.status === "Pending");
  const approver = can("finance", "publish");

  const recordedFor = (statementId) =>
    commission.filter((r) => r.statement === statementId && r.status !== "Reversed").reduce((t, r) => t + r.amount, 0);

  const partnerBars = SAMPLE_NETWORKS.map((p) => ({ label: p, value: sumBy(commission.filter((r) => r.partner === p), ["Approved", "Paid"]) }));

  const decide = (request, approved) => {
    patch("approvals", request.id, { status: approved ? "Approved" : "Rejected", decidedBy: viewer.name, decidedAt: nowISO() }, {
      module: "finance",
      action: approved ? "Approved sensitive change" : "Rejected sensitive change",
      target: `${request.type} · ${request.target}`,
    });
    if (approved && request.proposed) {
      patch("finance", request.target, (r) => ({
        ...request.proposed,
        approver: viewer.name,
        history: [...(r.history || []), { at: nowISO(), actor: viewer.name, action: `Approved change requested by ${request.requestedBy}` }],
      }));
    }
    notify(approved ? "Change approved." : "Change rejected.");
  };

  const exportCSV = () => {
    downloadCSV("dealsphere-finance-DEMO.csv", state.finance.map(({ history, ...r }) => ({ ...r, changes: history?.length || 0, currency, note: `${r.note} [DEMO]` })));
    notify("Demo finance records exported.");
  };

  const tabs = [
    { id: "summary", label: "Summary" },
    { id: "commission", label: "Commission entries", count: commission.length },
    { id: "expenses", label: "Expenses", count: expenses.length },
    { id: "statements", label: "Statements & reconciliation", count: state.statements.length },
    { id: "approvals", label: "Approvals", count: pending.length },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Finance"
        description="Commission entries, expenses, partner statements, payouts and reconciliation."
        actions={
          <div className="btn-row">
            {can("finance", "export") && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={exportCSV}>
                <Icon name="download" size={16} /> Export CSV
              </button>
            )}
            {can("finance", "create") && (
              <>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setCreating("Expense")}>
                  <Icon name="plus" size={16} /> Expense
                </button>
                <button type="button" className="btn btn--lime btn--sm" onClick={() => setCreating("Commission")}>
                  <Icon name="plus" size={16} /> Commission entry
                </button>
              </>
            )}
          </div>
        }
      />

      <Notice>
        Demo finance records with fictional sample networks. Estimates are shown separately from approved and paid
        amounts. This module is not a complete accounting system (ARD §12.2). Reporting currency: {currency} - placeholder pending
        management decision.
      </Notice>

      <Tabs label="Finance sections" value={tab} onChange={setTab} tabs={tabs} />

      {tab === "summary" && (
        <>
          <div className="adm-stats adm-stats--6">
            {COMMISSION_STATES.map((s) => (
              <Stat key={s} label={`${s} commission`} value={fmt(sumBy(commission, [s]))} source="record" />
            ))}
          </div>
          <div className="adm-stats adm-stats--3">
            <Stat label="Merchant sales value (attributed)" value={fmt(commission.reduce((t, r) => t + r.saleValue, 0))} source="record" />
            <Stat label="Operating expenses" value={fmt(sumBy(expenses, EXPENSE_STATES))} source="record" />
            <Stat label="Paid commission less approved expenses" value={fmt(sumBy(commission, ["Paid"]) - sumBy(expenses, ["Approved"]))} source="record" />
          </div>
          <div className="adm-grid adm-grid--2">
            <Panel title="Approved + paid commission by partner" actions={<SourceTag kind="record" />}>
              <BarList label="Approved and paid commission by partner" items={partnerBars} format={fmt} />
            </Panel>
            <Panel title="Reconciliation summary" subtitle="Recorded estimate vs partner-reported approved payout (ARD §3)">
              <ul className="adm-kv">
                {state.statements.map((s) => {
                  const diff = s.reportedApproved - recordedFor(s.id);
                  return (
                    <li key={s.id}>
                      <span>{s.partner} · {s.period}</span>
                      <strong className={diff === 0 ? "" : "adm-diff"}>{diff === 0 ? "Matched" : `${diff > 0 ? "+" : ""}${fmt(diff)}`}</strong>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </div>
        </>
      )}

      {tab === "commission" && (
        <Panel flush>
          <EntriesTable rows={commission} kind="Commission" onEdit={setEditing} canEdit={can("finance", "edit")} />
        </Panel>
      )}

      {tab === "expenses" && (
        <Panel flush>
          <EntriesTable rows={expenses} kind="Expense" onEdit={setEditing} canEdit={can("finance", "edit")} />
        </Panel>
      )}

      {tab === "statements" && (
        <Panel flush title="Partner statements" subtitle="Invoices/statements, payout status and reconciliation">
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Statement</th>
                  <th scope="col" className="is-num">Recorded</th>
                  <th scope="col" className="is-num">Partner-reported approved</th>
                  <th scope="col" className="is-num">Difference</th>
                  <th scope="col">Payout</th>
                  <th scope="col">Reconciliation</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {state.statements.map((s) => {
                  const recorded = recordedFor(s.id);
                  const diff = s.reportedApproved - recorded;
                  return (
                    <tr key={s.id}>
                      <td><strong>{s.id}</strong><span className="adm-sub">{s.partner} · {s.period}</span></td>
                      <td className="is-num">{fmt(recorded)}</td>
                      <td className="is-num">{fmt(s.reportedApproved)}</td>
                      <td className={`is-num ${diff ? "adm-diff" : ""}`}>{diff ? fmt(diff) : "—"}</td>
                      <td><StatusBadge status={s.payoutStatus} /><span className="adm-sub">{fmtDate(s.payoutDate)}</span></td>
                      <td><StatusBadge status={s.reconciliation} /></td>
                      <td>
                        {can("finance", "edit") && (
                          <div className="adm-row-actions">
                            {s.reconciliation !== "Reconciled" && (
                              <button
                                type="button"
                                className="btn btn--ghost btn--sm"
                                onClick={() => {
                                  const next = diff === 0 ? "Reconciled" : "Difference found";
                                  patch("statements", s.id, { reconciliation: next }, { module: "finance", action: `Reconciled statement → ${next}`, target: s.id });
                                  notify(diff === 0 ? "Statement reconciled." : "Difference recorded - entries don't match the statement yet.", diff === 0 ? "success" : "info");
                                }}
                              >
                                Reconcile
                              </button>
                            )}
                            <button type="button" className="text-btn" onClick={() => setPayoutFor(s)}>Payout details</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === "approvals" && (
        <Panel flush title="Approval requests" subtitle="Sensitive finance changes (ARD §12.2, §18)">
          {state.approvals.length ? (
            <ul className="adm-approvals">
              {state.approvals.map((a) => (
                <li key={a.id}>
                  <div>
                    <strong>{a.type} · {a.target}</strong>
                    <span className="adm-sub">Requested by {a.requestedBy} · {fmtDateTime(a.at)}</span>
                    <p>{a.detail}</p>
                  </div>
                  {a.status === "Pending" ? (
                    approver ? (
                      <div className="adm-row-actions">
                        <button type="button" className="btn btn--ghost btn--sm adm-danger-btn" onClick={() => decide(a, false)}>Reject</button>
                        <button type="button" className="btn btn--lime btn--sm" onClick={() => decide(a, true)}>Approve</button>
                      </div>
                    ) : (
                      <StatusBadge status="Pending" />
                    )
                  ) : (
                    <span className="adm-decision">
                      <StatusBadge status={a.status} />
                      <span className="adm-sub">{a.decidedBy}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyBlock icon="lock" title="No approval requests" />
          )}
        </Panel>
      )}

      {creating && <EntryForm kind={creating} onClose={() => setCreating(null)} />}
      {editing && <EntryForm entry={editing} kind={editing.kind} onClose={() => setEditing(null)} />}
      {payoutFor && (
        <Modal
          title={`Payout details · ${payoutFor.partner}`}
          description="Changing payout details is a restricted action (ARD §5.1)."
          onClose={() => setPayoutFor(null)}
          footer={
            <div className="adm-modal__actions">
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPayoutFor(null)}>Close</button>
              <button
                type="button"
                className="btn btn--lime btn--sm"
                onClick={() => {
                  add("approvals", {
                    id: makeId("AP"),
                    requestedBy: viewer.name,
                    at: nowISO(),
                    type: "Payout details change",
                    target: payoutFor.partner,
                    detail: "Update payout bank reference (details withheld in demo).",
                    status: "Pending",
                  }, { module: "finance", action: "Requested payout details change", target: payoutFor.partner });
                  notify("Payout change sent for approval.", "info");
                  setPayoutFor(null);
                  setTab("approvals");
                }}
              >
                Request change
              </button>
            </div>
          }
        >
          <dl className="adm-dl">
            <dt>Payout account</dt><dd className="muted">Stored server-side - never shown in the frontend.</dd>
            <dt>Next payout</dt><dd>{fmtDate(payoutFor.payoutDate)} · {payoutFor.payoutStatus}</dd>
          </dl>
          <Notice tone="warning" icon="lock">Any change goes to an approver and is recorded in the audit log.</Notice>
        </Modal>
      )}
    </>
  );
}

export default Finance;
