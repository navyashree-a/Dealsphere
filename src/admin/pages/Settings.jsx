import { useState } from "react";
import Icon from "../../components/Icon";
import { useAdmin } from "../adminContext";
import { MODULES, ROLES, ROLE_DEFAULTS } from "../permissions";
import { downloadCSV, fmtDateTime } from "../adminUtils";
import { EmptyBlock, Field, FilterBar, Modal, Notice, PageHeader, Panel, SelectField, StatusBadge, Tabs, Toggle } from "../AdminUI";

const PENDING = "Pending management decision";

// Open decisions from ARD §20.3. They are shown, not silently assumed.
const DECISIONS = [
  "Approve initial release scope",
  "Confirm staff roles and permission matrix",
  "Select backend, database, and authentication",
  "Approve coupon/affiliate providers",
  "Confirm financial definitions and reporting currency",
  "Define coupon verification and expiry policy",
  "Confirm whether customer price alerts are first-release scope",
  "Approve final design system and performance targets",
];

function Settings() {
  const { state, set, notify, can, setDemoData, resetDemo } = useAdmin();
  const [tab, setTab] = useState("settings");
  const [moduleFilter, setModuleFilter] = useState("");
  const [actor, setActor] = useState("");
  const [query, setQuery] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const canEdit = can("settings", "edit");
  const settings = state.settings;

  const update = (key, value, label) => {
    set("settings", { ...settings, [key]: value }, { module: "settings", action: `Changed ${label}`, target: value });
    notify("Setting saved.");
  };

  const actors = [...new Set(state.audit.map((a) => a.actor))];
  const entries = state.audit
    .filter((a) => !moduleFilter || a.module === moduleFilter)
    .filter((a) => !actor || a.actor === actor)
    .filter((a) => !query || `${a.action} ${a.target}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <PageHeader eyebrow="Admin" title="Settings & Audit Log" description="Application configuration, roles, change history and critical actions." />

      <Tabs
        label="Settings sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "settings", label: "Settings" },
          { id: "roles", label: "Roles" },
          { id: "audit", label: "Audit log", count: state.audit.length },
        ]}
      />

      {tab === "settings" && (
        <div className="adm-grid adm-grid--2">
          <Panel title="Demo environment">
            <div className="adm-setting">
              <div>
                <strong id="demo-toggle-label">Show demo metrics</strong>
                <p className="muted">
                  Shows sample analytics and partner-reported figures, labelled DEMO. Turn it off to see which metrics would be
                  unavailable without a backend and partner integrations.
                </p>
              </div>
              <Toggle checked={state.demoData} onChange={setDemoData} label="Show demo metrics" />
            </div>
            <div className="adm-setting">
              <div>
                <strong>Reset demo data</strong>
                <p className="muted">Restores every sample record and clears changes made in this browser.</p>
              </div>
              <button type="button" className="btn btn--ghost btn--sm adm-danger-btn" disabled={!canEdit} onClick={() => setConfirmReset(true)}>
                Reset
              </button>
            </div>
          </Panel>

          <Panel title="Business rules" subtitle="Values marked pending need a management decision (ARD §20.3)">
            <div className="adm-form">
              <Field label="Reporting currency" htmlFor="st-currency" hint={`${settings.currencyDecision}. INR is a placeholder.`}>
                <select id="st-currency" className="input" value={settings.currency} disabled={!canEdit} onChange={(e) => update("currency", e.target.value, "reporting currency")}>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </Field>
              <Field label="Offers in a disabled category" htmlFor="st-cat" hint="ARD §6.3: hide, reassign, or retain in direct links. The demo never deletes or moves offers.">
                <select id="st-cat" className="input" value={settings.categoryPolicy} disabled={!canEdit} onChange={(e) => update("categoryPolicy", e.target.value, "disabled-category policy")}>
                  {[PENDING, "Hide offers", "Reassign offers", "Retain in direct links"].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Coupon verification & expiry policy" htmlFor="st-verify" hint="ARD §20.3 - defines how offers are verified and expired.">
                <select id="st-verify" className="input" value={settings.verificationPolicy} disabled={!canEdit} onChange={(e) => update("verificationPolicy", e.target.value, "verification policy")}>
                  {[PENDING, "Verify every code before publishing", "Verify on schedule", "Rely on source + user reports"].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Customer price alerts" htmlFor="st-alerts" hint="Requires reliable price data and notifications (ARD §4.2, §20.3).">
                <select id="st-alerts" className="input" value={settings.priceAlertsScope} disabled={!canEdit} onChange={(e) => update("priceAlertsScope", e.target.value, "price alerts scope")}>
                  {[PENDING, "In first release", "Later release"].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              {!canEdit && <Notice icon="lock">You can view settings but not change them.</Notice>}
            </div>
          </Panel>

          <Panel title="Open decisions" subtitle="From ARD §20.3">
            <ul className="adm-list">
              {DECISIONS.map((d) => (
                <li key={d} className="adm-list__row">
                  <span>{d}</span>
                  <StatusBadge status="Pending" />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Not available in this build" subtitle="Needs backend or external services (ARD §16)">
            <ul className="adm-bullets">
              <li>Real admin and staff sign-in (authentication provider)</li>
              <li>Server-side permission enforcement and session revalidation</li>
              <li>Shared database for offers, tasks, finance and partner records</li>
              <li>Partner feeds, APIs and affiliate tracking</li>
              <li>Analytics collection, task and price-alert notifications</li>
              <li>Secrets management, backups and monitoring</li>
            </ul>
          </Panel>
        </div>
      )}

      {tab === "roles" && (
        <Panel title="Roles and default permissions" subtitle="Per-member permissions are edited in Staff & Tasks" flush>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Role</th>
                  <th scope="col">Purpose</th>
                  <th scope="col">Default modules (actions)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(ROLES).map(([id, role]) => (
                  <tr key={id}>
                    <td><strong>{role.label}</strong></td>
                    <td>{role.purpose}</td>
                    <td className="adm-modules">
                      {id === "admin"
                        ? "All modules and actions"
                        : Object.entries(ROLE_DEFAULTS[id])
                            .map(([m, actions]) => `${MODULES.find((x) => x.id === m)?.label} (${actions.join(", ")})`)
                            .join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === "audit" && (
        <>
          <FilterBar>
            <label className="adm-search">
              <Icon name="search" size={16} />
              <span className="sr-only">Search audit log</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search actions" />
            </label>
            <SelectField label="Module" value={moduleFilter} onChange={setModuleFilter} options={[{ value: "", label: "All modules" }, ...MODULES.map((m) => ({ value: m.id, label: m.label }))]} />
            <SelectField label="Who" value={actor} onChange={setActor} options={[{ value: "", label: "Everyone" }, ...actors]} />
            {can("settings", "export") && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => { downloadCSV("dealsphere-audit-log-DEMO.csv", entries); notify("Audit log exported."); }}>
                <Icon name="download" size={16} /> Export
              </button>
            )}
          </FilterBar>
          <Panel flush>
            {entries.length ? (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th scope="col">When</th>
                      <th scope="col">Who</th>
                      <th scope="col">Module</th>
                      <th scope="col">Action</th>
                      <th scope="col">Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((a) => (
                      <tr key={a.id}>
                        <td>{fmtDateTime(a.at)}</td>
                        <td>{a.actor}<span className="adm-sub">{a.role}</span></td>
                        <td>{MODULES.find((m) => m.id === a.module)?.label || a.module}</td>
                        <td>{a.action}</td>
                        <td>{a.target}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyBlock icon="history" title="No matching entries" />
            )}
          </Panel>
        </>
      )}

      {confirmReset && (
        <Modal
          title="Reset demo data?"
          onClose={() => setConfirmReset(false)}
          footer={
            <div className="adm-modal__actions">
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmReset(false)}>Cancel</button>
              <button
                type="button"
                className="btn btn--ghost btn--sm adm-danger-btn"
                onClick={() => {
                  resetDemo();
                  setConfirmReset(false);
                  notify("Demo data restored.");
                }}
              >
                Reset everything
              </button>
            </div>
          }
        >
          <p className="muted">All tasks, offers, finance entries, partner edits and audit entries made in this browser will be replaced with the original sample data.</p>
        </Modal>
      )}
    </>
  );
}

export default Settings;
