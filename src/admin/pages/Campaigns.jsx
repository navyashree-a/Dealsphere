import { useState } from "react";
import Icon from "../../components/Icon";
import { useAdmin } from "../adminContext";
import { CAMPAIGN_SHARE, sum, trafficSeries } from "../adminMetrics";
import { compact, makeId } from "../adminUtils";
import { EmptyBlock, Field, Modal, Notice, PageHeader, SourceTag, StatusBadge } from "../AdminUI";

// Marketing staff module (ARD §5 Marketing Staff, §9 Marketing): approved
// campaigns, campaign tags and permitted engagement data.
function CampaignEditor({ campaign, onClose }) {
  const { state, add, patch, notify, viewer } = useAdmin();
  const isNew = !campaign;
  const [form, setForm] = useState(
    campaign
      ? { ...campaign, tags: campaign.tags.join(", ") }
      : { name: "", description: "", tags: "", deals: [], status: "Draft", owner: viewer.id }
  );
  const [error, setError] = useState("");
  const activeDeals = state.deals.filter((d) => d.status === "Active");

  const save = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Campaign name is required.");
      return;
    }
    const record = {
      ...form,
      name: form.name.trim(),
      tags: form.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
    };
    if (isNew) {
      add("campaigns", { ...record, id: makeId("C") }, { module: "campaigns", action: "Created campaign (draft)", target: record.name }, true);
      notify("Campaign created as a draft.");
    } else {
      patch("campaigns", campaign.id, record, { module: "campaigns", action: "Edited campaign content", target: record.name });
      notify("Campaign saved.");
    }
    onClose();
  };

  return (
    <Modal
      title={isNew ? "New campaign" : `Edit ${campaign.name}`}
      onClose={onClose}
      size="lg"
      footer={
        <div className="adm-modal__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancel</button>
          <button type="submit" form="campaign-form" className="btn btn--lime btn--sm">Save</button>
        </div>
      }
    >
      <form id="campaign-form" className="adm-form" onSubmit={save} noValidate>
        <Field label="Campaign name" htmlFor="cf-name" required>
          <input id="cf-name" className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Promotional content" htmlFor="cf-desc">
          <textarea id="cf-desc" className="input adm-textarea" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </Field>
        <Field label="Campaign tags" htmlFor="cf-tags" hint="Comma separated. Used to filter analytics and sales.">
          <input id="cf-tags" className="input" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
        </Field>
        <fieldset className="adm-checklist">
          <legend>Featured active offers</legend>
          {activeDeals.map((d) => (
            <label key={d.id}>
              <input
                type="checkbox"
                checked={form.deals.includes(d.id)}
                onChange={(e) => setForm((f) => ({ ...f, deals: e.target.checked ? [...f.deals, d.id] : f.deals.filter((x) => x !== d.id) }))}
              />
              {d.title} <span className="adm-sub">{d.merchant}</span>
            </label>
          ))}
        </fieldset>
        {error && <Notice tone="critical" icon="alert">{error}</Notice>}
      </form>
    </Modal>
  );
}

function Campaigns() {
  const { state, can, viewer, isAdmin, patch, notify, staffName } = useAdmin();
  const [editing, setEditing] = useState(null);
  const views = sum(trafficSeries(30).current, "dealViews");
  const clicks = sum(trafficSeries(30).current, "clicks");

  const visible = state.campaigns.filter((c) => isAdmin || c.owner === viewer.id || can("campaigns", "publish"));
  const canEditCampaign = (c) => can("campaigns", "edit") && (isAdmin || c.owner === viewer.id);

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Campaigns"
        description="Promotional content, campaign tags and engagement."
        actions={
          can("campaigns", "create") && (
            <button type="button" className="btn btn--lime btn--sm" onClick={() => setEditing("new")}>
              <Icon name="plus" size={16} /> New campaign
            </button>
          )
        }
      />

      {!isAdmin && <Notice icon="lock">You see the campaigns assigned to you. Approval is reserved for authorized roles.</Notice>}

      {visible.length ? (
        <div className="adm-campaigns">
          {visible.map((c) => {
            const share = CAMPAIGN_SHARE[c.id] || 0;
            return (
              <article key={c.id} className="adm-campaign">
                <div className="adm-campaign__head">
                  <span className="adm-campaign__icon" aria-hidden="true"><Icon name="megaphone" size={20} /></span>
                  <div>
                    <h2>{c.name}</h2>
                    <span className="adm-sub">Owner: {staffName(c.owner)}</span>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <p>{c.description || "No content yet."}</p>
                <div className="adm-partner__tags">
                  {c.tags.map((t) => <span key={t} className="pill">#{t}</span>)}
                </div>
                <ul className="adm-kv">
                  <li><span>Featured offers</span><strong>{c.deals.length}</strong></li>
                  <li>
                    <span>Deal views (30d) <SourceTag kind={state.demoData ? "demo" : "unavailable"} /></span>
                    <strong>{state.demoData && share ? compact(views * share) : "—"}</strong>
                  </li>
                  <li>
                    <span>Outbound clicks (30d)</span>
                    <strong>{state.demoData && share ? compact(clicks * share) : "—"}</strong>
                  </li>
                </ul>
                <div className="adm-row-actions">
                  {canEditCampaign(c) && (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(c)}>Edit content</button>
                  )}
                  {can("campaigns", "publish") && c.status !== "Approved" && (
                    <button
                      type="button"
                      className="btn btn--lime btn--sm"
                      onClick={() => {
                        patch("campaigns", c.id, { status: "Approved" }, { module: "campaigns", action: "Approved campaign", target: c.name });
                        notify("Campaign approved.");
                      }}
                    >
                      Approve
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyBlock icon="megaphone" title="No campaigns assigned to you" />
      )}

      {editing && <CampaignEditor campaign={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

export default Campaigns;
