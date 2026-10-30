import { useState } from "react";
import Icon from "../../components/Icon";
import { useAdmin } from "../adminContext";
import { fmtDate, makeId } from "../adminUtils";
import { EmptyBlock, Field, Modal, Notice, PageHeader, Panel, StatusBadge, Tabs } from "../AdminUI";

// Partner statuses from ARD Appendix C / §19.
const STATUSES = ["Proposed", "Onboarding", "Active", "Suspended", "Inactive"];
const TYPES = ["Coupon content source", "Affiliate network", "Affiliate platform", "Affiliate program", "Coupon data API", "Offer/coupon feed", "Product feed", "Price data tool"];
const DATA_TYPES = ["Coupons", "Merchant deals", "Affiliate links", "Product feeds", "Price history"];
const METHODS = ["To be decided", "Manual entry", "File/feed import", "API", "Affiliate platform"];
const CONTRACT = ["Not started", "In discussion", "Contract under review", "Signed", "Expired"];
const VERIFY = [
  ["contract", "Contract/approval confirmed and permitted use recorded"],
  ["access", "Feed/API access approved by the provider"],
  ["tested", "Integration tested end to end (requires backend)"],
];

// ARD §10.1: credential reference stored securely - never API secrets in React.
const looksLikeSecret = (value) => /^[A-Za-z0-9_\-+/=]{24,}$/.test(value.trim());

function PartnerEditor({ partner, onClose }) {
  const { add, patch, notify, can, state } = useAdmin();
  const isNew = !partner;
  const [form, setForm] = useState(
    partner || {
      name: "", type: TYPES[0], dataTypes: [], use: "", notes: "", status: "Proposed", contact: "", owner: "", method: "To be decided",
      contract: "Not started", permittedUse: "", disclosure: "", renewal: "", credentialRef: "", lastSync: "", lastError: "", support: "",
      verification: { contract: false, access: false, tested: false },
    }
  );
  const [error, setError] = useState("");
  const canEdit = isNew ? can("partners", "create") : can("partners", "edit");
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const verified = VERIFY.every(([id]) => form.verification[id]);

  const save = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Partner name is required.");
      return;
    }
    if (isNew && state.partners.some((p) => p.name.toLowerCase() === form.name.trim().toLowerCase())) {
      setError("This partner is already in the directory.");
      return;
    }
    if (form.credentialRef && looksLikeSecret(form.credentialRef)) {
      setError("That looks like a secret key. Enter only a reference name (e.g. vault:grabon-feed) - secrets stay on the server.");
      return;
    }
    if (form.status === "Active" && !verified) {
      setError("A partner can't be marked Active until every verification item is confirmed (ARD §19).");
      return;
    }
    const record = { ...form, name: form.name.trim() };
    if (isNew) {
      add("partners", { ...record, id: makeId("P") }, { module: "partners", action: "Added partner", target: `${record.name} (${record.status})` }, true);
      notify("Partner added to the directory.");
    } else {
      const statusChanged = partner.status !== record.status;
      patch("partners", partner.id, record, {
        module: "partners",
        action: statusChanged ? `Status ${partner.status} → ${record.status}` : "Updated partner record",
        target: record.name,
      });
      notify("Partner record saved.");
    }
    onClose();
  };

  return (
    <Modal
      title={isNew ? "Add partner" : partner.name}
      description={isNew ? "Listing a provider does not mean a partnership exists (ARD §10)." : `${partner.type} · ${partner.status}`}
      onClose={onClose}
      size="xl"
      footer={
        canEdit && (
          <div className="adm-modal__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancel</button>
            <button type="submit" form="partner-form" className="btn btn--lime btn--sm">Save</button>
          </div>
        )
      }
    >
      <form id="partner-form" className="adm-form" onSubmit={save} noValidate>
        <fieldset disabled={!canEdit} className="adm-fieldset">
          {!isNew && (partner.use || partner.notes) && (
            <div className="adm-ard-note">
              <strong>ARD notes</strong>
              <p>{partner.use}</p>
              <p className="muted">Validation needed: {partner.notes}</p>
            </div>
          )}
          <div className="adm-form-grid">
            <Field label="Partner name" htmlFor="pf-name" required>
              <input id="pf-name" className="input" value={form.name} onChange={set("name")} />
            </Field>
            <Field label="Provider type" htmlFor="pf-type">
              <select id="pf-type" className="input" value={form.type} onChange={set("type")}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Onboarding status" htmlFor="pf-status">
              <select id="pf-status" className="input" value={form.status} onChange={set("status")}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Integration method" htmlFor="pf-method">
              <select id="pf-method" className="input" value={form.method} onChange={set("method")}>
                {METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Contract / approval status" htmlFor="pf-contract">
              <select id="pf-contract" className="input" value={form.contract} onChange={set("contract")}>
                {CONTRACT.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Renewal date" htmlFor="pf-renewal">
              <input id="pf-renewal" className="input" type="date" value={form.renewal} onChange={set("renewal")} />
            </Field>
            <Field label="Website / contact" htmlFor="pf-contact">
              <input id="pf-contact" className="input" value={form.contact} onChange={set("contact")} placeholder="Not recorded" />
            </Field>
            <Field label="Internal owner" htmlFor="pf-owner">
              <input id="pf-owner" className="input" value={form.owner} onChange={set("owner")} placeholder="Unassigned" />
            </Field>
            <Field label="Support contact" htmlFor="pf-support">
              <input id="pf-support" className="input" value={form.support} onChange={set("support")} placeholder="Not recorded" />
            </Field>
          </div>

          <fieldset className="adm-checklist adm-checklist--inline">
            <legend>Offer / data types provided</legend>
            {DATA_TYPES.map((t) => (
              <label key={t}>
                <input
                  type="checkbox"
                  checked={form.dataTypes.includes(t)}
                  onChange={(e) => setForm((f) => ({ ...f, dataTypes: e.target.checked ? [...f.dataTypes, t] : f.dataTypes.filter((x) => x !== t) }))}
                />
                {t}
              </label>
            ))}
          </fieldset>

          <div className="adm-form-grid">
            <Field label="Permitted use" htmlFor="pf-use">
              <input id="pf-use" className="input" value={form.permittedUse} onChange={set("permittedUse")} placeholder="Not confirmed" />
            </Field>
            <Field label="Attribution / disclosure requirements" htmlFor="pf-disclosure">
              <input id="pf-disclosure" className="input" value={form.disclosure} onChange={set("disclosure")} placeholder="Not confirmed" />
            </Field>
          </div>

          <Field label="Credential reference" htmlFor="pf-cred" hint="Reference name only (e.g. vault:provider-feed). Never paste API keys or secrets - they are stored server-side.">
            <input id="pf-cred" className="input adm-mono" value={form.credentialRef} onChange={set("credentialRef")} placeholder="Not configured" autoComplete="off" />
          </Field>

          <dl className="adm-dl">
            <dt>Last successful sync</dt><dd className="muted">Never - no integration is connected (requires backend)</dd>
            <dt>Last error</dt><dd className="muted">—</dd>
            <dt>Data freshness</dt><dd className="muted">Unavailable</dd>
          </dl>

          <fieldset className="adm-checklist">
            <legend>Verification before marking Active (ARD §19)</legend>
            {VERIFY.map(([id, text]) => (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={Boolean(form.verification[id])}
                  onChange={(e) => setForm((f) => ({ ...f, verification: { ...f.verification, [id]: e.target.checked } }))}
                />
                {text}
              </label>
            ))}
          </fieldset>
          {form.status === "Active" && (
            <Notice tone="warning" icon="alert">
              In this demo, verification is a manual attestation. A real integration is only active once the backend confirms a
              successful connection.
            </Notice>
          )}
        </fieldset>
        {!canEdit && <Notice icon="lock">You can view this record but not edit it.</Notice>}
        {error && <Notice tone="critical" icon="alert">{error}</Notice>}
      </form>
    </Modal>
  );
}

// ARD §8 Partners, §10, §10.1, FR-16.
function Partners() {
  const { state, can } = useAdmin();
  const [tab, setTab] = useState("All");
  const [open, setOpen] = useState(null);

  const rows = state.partners.filter((p) => tab === "All" || p.status === tab);

  return (
    <>
      <PageHeader
        eyebrow="Partnerships"
        title="Partners"
        description="Coupon, affiliate and data providers - onboarding, contract and integration status."
        actions={
          can("partners", "create") && (
            <button type="button" className="btn btn--lime btn--sm" onClick={() => setOpen("new")}>
              <Icon name="plus" size={16} /> Add partner
            </button>
          )
        }
      />

      <Notice tone="warning" icon="alert">
        These are potential providers listed in the ARD. None has a confirmed partnership, active account or approved API
        yet - confirm eligibility, access, attribution, display rights and contract terms before any integration (ARD §10).
      </Notice>

      <Tabs
        label="Partner status"
        value={tab}
        onChange={setTab}
        tabs={[{ id: "All", label: "All", count: state.partners.length }, ...STATUSES.map((s) => ({ id: s, label: s, count: state.partners.filter((p) => p.status === s).length }))]}
      />

      {rows.length ? (
        <div className="adm-partner-grid">
          {rows.map((p) => (
            <button key={p.id} type="button" className="adm-partner" onClick={() => setOpen(p)}>
              <span className="adm-partner__head">
                <span className="adm-partner__mark" aria-hidden="true">{p.name.charAt(0)}</span>
                <span>
                  <strong>{p.name}</strong>
                  <span className="adm-sub">{p.type}</span>
                </span>
                <StatusBadge status={p.status} />
              </span>
              <span className="adm-partner__use">{p.use || "No notes yet."}</span>
              <span className="adm-partner__tags">
                {p.dataTypes.map((t) => <span key={t} className="pill">{t}</span>)}
              </span>
              <span className="adm-partner__foot">
                <span><Icon name="link" size={14} /> {p.method}</span>
                <span><Icon name="file" size={14} /> {p.contract}</span>
                <span><Icon name="lock" size={14} /> {p.credentialRef ? "Credential ref set" : "No credential ref"}</span>
                {p.renewal && <span><Icon name="clock" size={14} /> Renews {fmtDate(p.renewal)}</span>}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <Panel>
          <EmptyBlock icon="link" title={`No ${tab.toLowerCase()} partners`} />
        </Panel>
      )}

      {open && <PartnerEditor partner={open === "new" ? null : open} onClose={() => setOpen(null)} />}
    </>
  );
}

export default Partners;
