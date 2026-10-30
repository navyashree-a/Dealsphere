import { useState } from "react";
import Icon from "../../components/Icon";
import { useAdmin } from "../adminContext";
import { MERCHANTS } from "../adminData";
import { daysUntil, fmtDate, fmtDateTime, makeId, nowISO, todayISO } from "../adminUtils";
import { EmptyBlock, Field, FilterBar, Modal, Notice, PageHeader, Panel, SelectField, StatusBadge, Tabs } from "../AdminUI";

// Lifecycle statuses from ARD §11 / Appendix C.
const STATUSES = ["Draft", "Pending Review", "Active", "Expired", "Rejected", "Archived"];
const VERIFICATION = ["Not verified with merchant", "Verified with merchant", "Could not verify"];
// ARD §11 Review stage: "Check merchant, coupon code, terms, destination URL, expiry, and source."
const REVIEW_CHECKS = [
  ["merchant", "Merchant is correct"],
  ["code", "Coupon code checked (or confirmed there is no code)"],
  ["terms", "Terms and restrictions recorded"],
  ["url", "Destination URL opens the right merchant page"],
  ["expiry", "Expiry checked (or recorded as not supplied)"],
  ["source", "Source is recorded and permitted"],
];

const expiryLabel = (deal) => {
  if (!deal.expiry) return { text: "Not supplied", tone: "muted" };
  const left = daysUntil(deal.expiry);
  if (left < 0) return { text: `${fmtDate(deal.expiry)} · passed`, tone: "critical" };
  if (left <= 7) return { text: `${fmtDate(deal.expiry)} · ${left === 0 ? "today" : `in ${left}d`}`, tone: "warning" };
  return { text: fmtDate(deal.expiry), tone: "" };
};

const historyEntry = (actor, action) => ({ at: nowISO(), actor, action });

/* ---------- Create / edit form (ARD §15.1 fields) ---------- */
function DealForm({ deal, onClose }) {
  const { state, add, patch, notify, viewer } = useAdmin();
  const isNew = !deal;
  const assignable = state.categories.filter((c) => c.visible);
  const [form, setForm] = useState(
    deal || {
      title: "",
      description: "",
      category: assignable[0]?.name || "",
      merchant: MERCHANTS[0],
      discount: "",
      code: "",
      url: "",
      terms: "",
      expiry: "",
      source: "Manual research",
      verification: VERIFICATION[0],
    }
  );
  const [error, setError] = useState("");
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const sourcePartner = state.partners.find((p) => p.name === form.source);

  const save = (submit) => (e) => {
    e?.preventDefault();
    if (!form.title.trim() || !form.category || !form.merchant || !form.discount.trim()) {
      setError("Title, category, merchant and offer details are required.");
      return;
    }
    if (form.url && !/^https:\/\/\S+\.\S+/.test(form.url)) {
      setError("Destination URL must be a full https:// address.");
      return;
    }
    const clean = { ...form, title: form.title.trim(), discount: form.discount.trim(), code: form.code.trim().toUpperCase() };

    if (isNew) {
      const record = {
        ...clean,
        id: makeId("D"),
        status: submit ? "Pending Review" : "Draft",
        campaigns: [],
        owner: viewer.id,
        createdAt: nowISO(),
        updatedAt: nowISO(),
        history: [historyEntry(viewer.name, "Created draft"), ...(submit ? [historyEntry(viewer.name, "Submitted for review")] : [])],
      };
      add("deals", record, { module: "deals", action: submit ? "Created and submitted offer" : "Created draft offer", target: `${record.id} · ${record.title}` });
      notify(submit ? "Offer submitted for review." : "Draft saved. It isn't visible publicly.");
    } else {
      patch(
        "deals",
        deal.id,
        (d) => ({
          ...clean,
          status: d.status === "Rejected" ? "Draft" : d.status,
          updatedAt: nowISO(),
          history: [...d.history, historyEntry(viewer.name, d.status === "Active" ? "Updated live offer" : "Edited details")],
        }),
        { module: "deals", action: deal.status === "Active" ? "Updated live offer" : "Edited offer", target: `${deal.id} · ${clean.title}` }
      );
      notify(deal.status === "Rejected" ? "Changes saved - offer returned to Draft." : "Offer updated.");
    }
    onClose();
  };

  return (
    <Modal
      title={isNew ? "New offer" : `Edit ${deal.id}`}
      description="Record the offer exactly as supplied by its source - don't invent savings."
      onClose={onClose}
      size="xl"
      footer={
        <div className="adm-modal__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancel</button>
          {isNew ? (
            <>
              <button type="submit" form="deal-form" className="btn btn--ghost btn--sm">Save draft</button>
              <button type="button" className="btn btn--lime btn--sm" onClick={save(true)}>Submit for review</button>
            </>
          ) : (
            <button type="submit" form="deal-form" className="btn btn--lime btn--sm">Save changes</button>
          )}
        </div>
      }
    >
      <form id="deal-form" className="adm-form" onSubmit={save(false)} noValidate>
        <div className="adm-form-grid">
          <Field label="Title" htmlFor="df-title" required>
            <input id="df-title" className="input" value={form.title} onChange={set("title")} maxLength={80} />
          </Field>
          <Field label="Offer details" htmlFor="df-discount" required hint="The promotion as supplied, e.g. 20% OFF.">
            <input id="df-discount" className="input" value={form.discount} onChange={set("discount")} maxLength={60} />
          </Field>
          <Field label="Category" htmlFor="df-category" required hint="Hidden categories can't take new offers (ARD §6.3).">
            <select id="df-category" className="input" value={form.category} onChange={set("category")}>
              {!assignable.some((c) => c.name === form.category) && form.category && <option value={form.category}>{form.category} (hidden)</option>}
              {assignable.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Merchant / store" htmlFor="df-merchant" required>
            <select id="df-merchant" className="input" value={form.merchant} onChange={set("merchant")}>
              {MERCHANTS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Coupon code" htmlFor="df-code" hint="Optional - only if the offer has a code.">
            <input id="df-code" className="input adm-mono" value={form.code} onChange={set("code")} maxLength={24} />
          </Field>
          <Field label="Expiry date" htmlFor="df-expiry" hint="Leave blank if the source doesn't supply one.">
            <input id="df-expiry" className="input" type="date" value={form.expiry} onChange={set("expiry")} />
          </Field>
        </div>
        <Field label="Description" htmlFor="df-desc">
          <input id="df-desc" className="input" value={form.description} onChange={set("description")} maxLength={140} />
        </Field>
        <Field label="Destination URL" htmlFor="df-url" hint="Merchant or offer landing page. Click tracking needs the backend (ARD FR-05).">
          <input id="df-url" className="input" type="url" placeholder="https://" value={form.url} onChange={set("url")} />
        </Field>
        <Field label="Terms and restrictions" htmlFor="df-terms">
          <textarea id="df-terms" className="input adm-textarea" rows={2} value={form.terms} onChange={set("terms")} />
        </Field>
        <div className="adm-form-grid">
          <Field label="Source" htmlFor="df-source">
            <select id="df-source" className="input" value={form.source} onChange={set("source")}>
              <option>Manual research</option>
              {state.partners.map((p) => (
                <option key={p.id} value={p.name}>{p.name} ({p.status})</option>
              ))}
            </select>
          </Field>
          <Field label="Verification status" htmlFor="df-verify">
            <select id="df-verify" className="input" value={form.verification} onChange={set("verification")}>
              {VERIFICATION.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
        </div>
        {sourcePartner && sourcePartner.status !== "Active" && (
          <Notice tone="warning" icon="alert">
            {sourcePartner.name} is {sourcePartner.status}. Using its content requires an approved partnership and data rights (ARD §10).
          </Notice>
        )}
        {error && <Notice tone="critical" icon="alert">{error}</Notice>}
      </form>
    </Modal>
  );
}

/* ---------- Review (approve / reject) ---------- */
function ReviewDialog({ deal, onClose }) {
  const { patch, notify, viewer } = useAdmin();
  const [checks, setChecks] = useState({});
  const [reason, setReason] = useState("");
  const allChecked = REVIEW_CHECKS.every(([id]) => checks[id]);

  const decide = (approve) => {
    patch(
      "deals",
      deal.id,
      (d) => ({
        status: approve ? "Active" : "Rejected",
        rejectionReason: approve ? "" : reason.trim(),
        updatedAt: nowISO(),
        history: [...d.history, historyEntry(viewer.name, approve ? "Approved and published" : `Rejected: ${reason.trim()}`)],
      }),
      { module: "deals", action: approve ? "Approved and published offer" : "Rejected offer", target: `${deal.id} · ${deal.title}` }
    );
    notify(approve ? "Offer approved and published." : "Offer rejected.");
    onClose();
  };

  return (
    <Modal
      title={`Review ${deal.title}`}
      description={`${deal.merchant} · ${deal.category} · source: ${deal.source}`}
      onClose={onClose}
      size="lg"
      footer={
        <div className="adm-modal__actions">
          <button type="button" className="btn btn--ghost btn--sm adm-danger-btn" disabled={!reason.trim()} onClick={() => decide(false)}>
            Reject
          </button>
          <button type="button" className="btn btn--lime btn--sm" disabled={!allChecked} onClick={() => decide(true)}>
            <Icon name="check" size={16} /> Approve & publish
          </button>
        </div>
      }
    >
      <dl className="adm-dl">
        <dt>Offer</dt><dd>{deal.discount}</dd>
        <dt>Coupon code</dt><dd className="adm-mono">{deal.code || "No code"}</dd>
        <dt>Destination URL</dt><dd>{deal.url || <span className="adm-flag">Not configured</span>}</dd>
        <dt>Terms</dt><dd>{deal.terms || <span className="adm-flag">Not supplied</span>}</dd>
        <dt>Expiry</dt><dd>{expiryLabel(deal).text}</dd>
        <dt>Verification</dt><dd>{deal.verification}</dd>
      </dl>
      <fieldset className="adm-checklist">
        <legend>Review checklist (ARD §11)</legend>
        {REVIEW_CHECKS.map(([id, text]) => (
          <label key={id}>
            <input type="checkbox" checked={Boolean(checks[id])} onChange={(e) => setChecks((c) => ({ ...c, [id]: e.target.checked }))} />
            {text}
          </label>
        ))}
      </fieldset>
      <Field label="Rejection reason" htmlFor="rv-reason" hint="Required to reject. The author sees this.">
        <input id="rv-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </Modal>
  );
}

/* ---------- Detail ---------- */
function DealDetail({ deal, onClose, onEdit, onReview }) {
  const { state, patch, notify, can, viewer, staffName } = useAdmin();
  const [renewDate, setRenewDate] = useState("");
  const live = state.deals.find((d) => d.id === deal.id) || deal;
  const canEdit = can("deals", "edit");
  const canPublish = can("deals", "publish");
  const campaigns = state.campaigns.filter((c) => c.deals.includes(live.id));

  const transition = (status, action, message, extra = {}) => {
    patch(
      "deals",
      live.id,
      (d) => ({ status, updatedAt: nowISO(), ...extra, history: [...d.history, historyEntry(viewer.name, action)] }),
      { module: "deals", action, target: `${live.id} · ${live.title}` }
    );
    notify(message);
  };

  const exp = expiryLabel(live);

  return (
    <Modal
      title={live.title}
      description={`${live.id} · ${live.merchant} · ${live.category}`}
      onClose={onClose}
      size="lg"
      footer={
        <div className="adm-modal__actions">
          {canEdit && !["Archived"].includes(live.status) && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onEdit(live)}>Edit</button>
          )}
          {canEdit && live.status === "Draft" && (
            <button type="button" className="btn btn--lime btn--sm" onClick={() => transition("Pending Review", "Submitted for review", "Submitted for review.")}>
              Submit for review
            </button>
          )}
          {canPublish && live.status === "Pending Review" && (
            <button type="button" className="btn btn--lime btn--sm" onClick={() => onReview(live)}>Review</button>
          )}
          {canPublish && live.status === "Active" && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => transition("Draft", "Unpublished", "Offer unpublished - back to Draft.")}>
              Unpublish
            </button>
          )}
          {canEdit && live.status === "Active" && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => transition("Expired", "Marked expired", "Offer marked expired.")}>
              Mark expired
            </button>
          )}
          {canPublish && ["Draft", "Active", "Expired", "Rejected"].includes(live.status) && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => transition("Archived", "Archived", "Offer archived. The record is kept.")}>
              Archive
            </button>
          )}
          {canPublish && live.status === "Archived" && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => transition("Draft", "Restored to draft", "Offer restored to Draft.")}>
              Restore to draft
            </button>
          )}
        </div>
      }
    >
      <div className="adm-task-meta">
        <StatusBadge status={live.status} />
        <span className="adm-sub">Owner: {staffName(live.owner)}</span>
        <span className="adm-sub">Updated {fmtDateTime(live.updatedAt)}</span>
      </div>
      {live.status === "Rejected" && live.rejectionReason && <Notice tone="critical" icon="alert">Rejected: {live.rejectionReason}</Notice>}
      {!canPublish && <Notice icon="lock">Publishing needs the publish/approve permission. You can edit drafts and submit them for review.</Notice>}

      <dl className="adm-dl">
        <dt>Offer details</dt><dd>{live.discount}</dd>
        <dt>Description</dt><dd>{live.description || "—"}</dd>
        <dt>Coupon code</dt><dd className="adm-mono">{live.code || "No code"}</dd>
        <dt>Destination URL</dt><dd>{live.url ? <a className="adm-link" href={live.url} target="_blank" rel="noopener noreferrer">{live.url} <Icon name="external" size={13} /></a> : <span className="adm-flag">Not configured</span>}</dd>
        <dt>Terms</dt><dd>{live.terms || <span className="adm-flag">Not supplied</span>}</dd>
        <dt>Expiry</dt><dd className={exp.tone ? `adm-tone-${exp.tone}` : ""}>{exp.text}</dd>
        <dt>Source</dt><dd>{live.source}</dd>
        <dt>Verification</dt><dd>{live.verification}</dd>
        <dt>Campaigns</dt><dd>{campaigns.length ? campaigns.map((c) => c.name).join(", ") : "None"}</dd>
        <dt>Created</dt><dd>{fmtDateTime(live.createdAt)}</dd>
      </dl>

      {canEdit && live.status === "Expired" && (
        <div className="adm-inline-form">
          <Field label="Renew with a new expiry date" htmlFor="renew" hint="A renewed offer goes back through review.">
            <input id="renew" className="input" type="date" min={todayISO()} value={renewDate} onChange={(e) => setRenewDate(e.target.value)} />
          </Field>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={!renewDate}
            onClick={() => transition("Pending Review", `Renewed to ${fmtDate(renewDate)} and resubmitted`, "Offer renewed and sent for review.", { expiry: renewDate })}
          >
            Renew
          </button>
        </div>
      )}

      <h3 className="adm-h3">Change history</h3>
      <ul className="adm-timeline">
        {[...live.history].reverse().map((h, i) => (
          <li key={i}>
            <span className="adm-sub">{fmtDateTime(h.at)}</span>
            <strong>{h.actor}</strong>
            <span>{h.action}</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

/* ---------- Page ---------- */
function Deals() {
  const { state, can, viewer, isAdmin, set, notify } = useAdmin();
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [merchant, setMerchant] = useState("");
  const [mine, setMine] = useState(!isAdmin);
  const [open, setOpen] = useState(null);
  const [editing, setEditing] = useState(null);
  const [reviewing, setReviewing] = useState(null);

  const scoped = state.deals.filter((d) => !mine || d.owner === viewer.id);
  const rows = scoped
    .filter((d) => tab === "All" || d.status === tab)
    .filter((d) => !category || d.category === category)
    .filter((d) => !merchant || d.merchant === merchant)
    .filter((d) => !query || `${d.title} ${d.merchant} ${d.code} ${d.description}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  const pastExpiry = state.deals.filter((d) => d.status === "Active" && d.expiry && daysUntil(d.expiry) < 0);

  const applyExpiryRule = () => {
    const ids = new Set(pastExpiry.map((d) => d.id));
    set(
      "deals",
      state.deals.map((d) =>
        ids.has(d.id)
          ? { ...d, status: "Expired", updatedAt: nowISO(), history: [...d.history, historyEntry(viewer.name, "Expired by expiry rule")] }
          : d
      ),
      { module: "deals", action: "Applied expiry rule", target: `${ids.size} offer(s)` }
    );
    notify(`${ids.size} offer(s) marked expired.`);
  };

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Coupons & Deals"
        description="Draft, review, publish, update, expire and archive offers."
        actions={
          can("deals", "create") && (
            <button type="button" className="btn btn--lime btn--sm" onClick={() => setEditing("new")}>
              <Icon name="plus" size={16} /> New offer
            </button>
          )
        }
      />

      {pastExpiry.length > 0 && (
        <div className="adm-banner">
          <Icon name="alert" size={18} />
          <span>{pastExpiry.length} active offer(s) have passed their expiry date and are still marked Active.</span>
          {can("deals", "edit") && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={applyExpiryRule}>Mark as expired</button>
          )}
        </div>
      )}

      <Tabs
        label="Offer status"
        value={tab}
        onChange={setTab}
        tabs={[{ id: "All", label: "All", count: scoped.length }, ...STATUSES.map((s) => ({ id: s, label: s, count: scoped.filter((d) => d.status === s).length }))]}
      />

      <FilterBar>
        <label className="adm-search">
          <Icon name="search" size={16} />
          <span className="sr-only">Search offers</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, merchant or code" />
        </label>
        <SelectField label="Category" value={category} onChange={setCategory} options={[{ value: "", label: "All" }, ...state.categories.map((c) => ({ value: c.name, label: c.name }))]} />
        <SelectField label="Merchant" value={merchant} onChange={setMerchant} options={[{ value: "", label: "All" }, ...MERCHANTS]} />
        <label className="adm-check">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
          Assigned to me
        </label>
      </FilterBar>

      <Panel flush>
        {rows.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Offer</th>
                  <th scope="col">Category</th>
                  <th scope="col">Code</th>
                  <th scope="col">Expiry</th>
                  <th scope="col">Source</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => {
                  const exp = expiryLabel(d);
                  return (
                    <tr key={d.id}>
                      <td>
                        <button type="button" className="adm-link" onClick={() => setOpen(d)}>{d.title}</button>
                        <span className="adm-sub">{d.merchant} · {d.discount}</span>
                      </td>
                      <td>{d.category}</td>
                      <td className="adm-mono">{d.code || <span className="muted">—</span>}</td>
                      <td className={exp.tone ? `adm-tone-${exp.tone}` : ""}>{exp.text}</td>
                      <td>{d.source}<span className="adm-sub">{d.verification}</span></td>
                      <td><StatusBadge status={d.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyBlock icon="tag" title="No offers match" action={mine && <button type="button" className="text-btn" onClick={() => setMine(false)}>Show all records</button>}>
            {mine ? "You don't own any offers matching these filters." : "Try another status or clear the filters."}
          </EmptyBlock>
        )}
      </Panel>

      <p className="adm-footnote">
        Offers are never hard-deleted here - archived records are kept for audit (ARD §11, §5.1). Category-level staff
        permissions are pending the permission-matrix decision (ARD §20.3).
      </p>

      {open && (
        <DealDetail
          deal={open}
          onClose={() => setOpen(null)}
          onEdit={(d) => { setOpen(null); setEditing(d); }}
          onReview={(d) => { setOpen(null); setReviewing(d); }}
        />
      )}
      {editing && <DealForm deal={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {reviewing && <ReviewDialog deal={reviewing} onClose={() => setReviewing(null)} />}
    </>
  );
}

export default Deals;
