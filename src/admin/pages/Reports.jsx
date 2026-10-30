import { useState } from "react";
import Icon from "../../components/Icon";
import { useAdmin } from "../adminContext";
import { RANGES, conversionsInRange, trafficSeries } from "../adminMetrics";
import { addDays, downloadCSV, fmtDateTime, makeId, nowISO, taskDisplayStatus } from "../adminUtils";
import { assigneeLabel } from "../taskUtils";
import { EmptyBlock, Field, Notice, PageHeader, Panel, SourceTag } from "../AdminUI";

// ARD §8 Reports / FR-17: analytics, sales, finance, task and content reports.
// Each type requires view access to its source module.
const TYPES = [
  { id: "analytics", label: "Analytics report", module: "analytics", metrics: true },
  { id: "sales", label: "Sales & revenue report", module: "sales", metrics: true },
  { id: "finance", label: "Finance report", module: "finance" },
  { id: "task", label: "Task report", module: "staff" },
  { id: "content", label: "Content (offers) report", module: "deals" },
];

const FORMATS = [
  { id: "csv", label: "CSV", available: true },
  { id: "xlsx", label: "Excel (XLSX)", available: false },
  { id: "pdf", label: "PDF", available: false },
];

function Reports() {
  const { state, can, add, notify, viewer, staffName } = useAdmin();
  const allowed = TYPES.filter((t) => can(t.module, "view"));
  const [type, setType] = useState(allowed[0]?.id || "");
  const [days, setDays] = useState(30);
  const [format, setFormat] = useState("csv");
  const canExport = can("reports", "export");

  const buildRows = (reportType, range) => {
    const since = addDays(-(range - 1));
    switch (reportType) {
      case "analytics":
        return trafficSeries(range).current.map((r) => ({ ...r, data: "DEMO" }));
      case "sales":
        return conversionsInRange(range).map((r) => ({ ...r, currency: state.settings.currency, data: "DEMO - fictional network" }));
      case "finance":
        return state.finance.filter((r) => r.date >= since).map(({ history, ...r }) => ({ ...r, changes: history?.length || 0, currency: state.settings.currency, data: "DEMO" }));
      case "task":
        return state.tasks.map((t) => ({
          id: t.id, title: t.title, assignee: assigneeLabel(t.assignee, staffName), priority: t.priority, due: t.due, status: taskDisplayStatus(t), comments: t.comments.length,
        }));
      case "content":
        return state.deals.map((d) => ({
          id: d.id, title: d.title, merchant: d.merchant, category: d.category, status: d.status, code: d.code, expiry: d.expiry || "Not supplied", source: d.source, verification: d.verification, url: d.url || "Not configured",
        }));
      default:
        return [];
    }
  };

  // Fall back to the first permitted type if the viewer changes while on the page.
  const selected = allowed.find((t) => t.id === type) || allowed[0];
  const blocked = Boolean(selected?.metrics) && !state.demoData;

  const generate = (e) => {
    e.preventDefault();
    if (!selected || blocked) return;
    const rows = buildRows(selected.id, days);
    const report = {
      id: makeId("R"),
      type: selected.id,
      label: selected.label,
      days,
      format,
      rows: rows.length,
      by: viewer.name,
      at: nowISO(),
    };
    add("reports", report, { module: "reports", action: "Generated report", target: `${report.label} · ${RANGES.find((r) => r.id === days).label}` });
    notify("Report generated. Download it from Saved reports.");
  };

  const download = (report) => {
    const rows = buildRows(report.type, report.days);
    if (!rows.length) {
      notify("This report has no rows for the selected range.", "info");
      return;
    }
    downloadCSV(`dealsphere-${report.type}-report-DEMO-${report.days}d.csv`, rows);
  };

  const mine = state.reports.filter((r) => can(TYPES.find((t) => t.id === r.type)?.module, "view"));

  return (
    <>
      <PageHeader eyebrow="Admin" title="Reports" description="Generate and export analytics, sales, finance, task and content reports." />

      <div className="adm-grid adm-grid--1-2">
        <Panel title="Generate a report">
          {allowed.length ? (
            <form className="adm-form" onSubmit={generate}>
              <Field label="Report type" htmlFor="rp-type">
                <select id="rp-type" className="input" value={selected?.id} onChange={(e) => setType(e.target.value)}>
                  {TYPES.map((t) => (
                    <option key={t.id} value={t.id} disabled={!can(t.module, "view")}>
                      {t.label}{!can(t.module, "view") ? " (no access)" : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date range" htmlFor="rp-range" hint={selected?.id === "task" || selected?.id === "content" ? "Task and content reports list all current records." : undefined}>
                <select id="rp-range" className="input" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                  {RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </Field>
              <fieldset className="adm-checklist adm-checklist--inline">
                <legend>Export format</legend>
                {FORMATS.map((f) => (
                  <label key={f.id} className={f.available ? "" : "is-disabled"}>
                    <input type="radio" name="format" value={f.id} checked={format === f.id} disabled={!f.available} onChange={() => setFormat(f.id)} />
                    {f.label}
                    {!f.available && <span className="adm-sub"> · requires backend</span>}
                  </label>
                ))}
              </fieldset>
              {blocked && <Notice tone="warning" icon="lock">This report uses analytics/partner metrics, which are unavailable while demo data is off.</Notice>}
              <button type="submit" className="btn btn--lime" disabled={blocked}>
                <Icon name="file" size={16} /> Generate report
              </button>
              {!canExport && <Notice icon="lock">You can generate reports but your role can't export them.</Notice>}
            </form>
          ) : (
            <EmptyBlock icon="lock" title="No report types available">Your permissions don't include any reportable module.</EmptyBlock>
          )}
        </Panel>

        <Panel title="Saved reports" subtitle="Generated in this browser" flush actions={<SourceTag kind="demo" />}>
          {mine.length ? (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th scope="col">Report</th>
                    <th scope="col">Range</th>
                    <th scope="col" className="is-num">Rows</th>
                    <th scope="col">Generated</th>
                    <th scope="col"><span className="sr-only">Download</span></th>
                  </tr>
                </thead>
                <tbody>
                  {mine.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.label}</strong><span className="adm-sub">{r.format.toUpperCase()}</span></td>
                      <td>{RANGES.find((x) => x.id === r.days)?.label}</td>
                      <td className="is-num">{r.rows}</td>
                      <td>{fmtDateTime(r.at)}<span className="adm-sub">{r.by}</span></td>
                      <td>
                        {canExport ? (
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => download(r)}>
                            <Icon name="download" size={16} /> Download
                          </button>
                        ) : (
                          <span className="adm-perm-note"><Icon name="lock" size={14} /> No export</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyBlock icon="file" title="No reports yet">Generate a report and it will appear here.</EmptyBlock>
          )}
        </Panel>
      </div>
    </>
  );
}

export default Reports;
