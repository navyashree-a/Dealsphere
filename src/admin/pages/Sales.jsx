import { useState } from "react";
import Icon from "../../components/Icon";
import { useAdmin } from "../adminContext";
import { SAMPLE_NETWORKS } from "../adminData";
import { COMMISSION_STATES, RANGES, conversionsInRange, sum } from "../adminMetrics";
import { addDays, compact, downloadCSV, fmtDate, money, num } from "../adminUtils";
import { FilterBar, LineChart, Modal, Notice, PageHeader, Panel, SelectField, Stat, StatusBadge, Unavailable } from "../AdminUI";

const change = (current, previous) => (previous ? (current - previous) / previous : null);

const dailyCommission = (rows, days, offset) =>
  Array.from({ length: days }, (_, i) => {
    const date = addDays(-(offset + days - 1 - i));
    return { date, value: sum(rows.filter((r) => r.date === date), "commission") };
  });

// ARD §8 Sales & Revenue / §12 / FR-10. "Sales" means tracked
// merchant-attributed sales; commission states follow ARD Appendix C.
function Sales() {
  const { state, can, notify } = useAdmin();
  const [days, setDays] = useState(30);
  const [partner, setPartner] = useState("");
  const [status, setStatus] = useState("");
  const [campaign, setCampaign] = useState("");
  const [limit, setLimit] = useState(12);
  const [open, setOpen] = useState(null);
  const currency = state.settings.currency;
  const fmt = (v) => money(v, currency);

  const matches = (r) => (!partner || r.partner === partner) && (!status || r.status === status) && (!campaign || r.campaign === campaign);
  const rows = conversionsInRange(days).filter(matches);
  const prevRows = conversionsInRange(days, days).filter(matches);
  const byState = (list, s) => sum(list.filter((r) => r.status === s), "commission");

  if (!state.demoData) {
    return (
      <>
        <PageHeader eyebrow="Admin" title="Sales & Revenue" description="Affiliate-attributed conversions and commission states." />
        <Panel>
          <Unavailable title="No partner-reported sales data">
            Tracked conversions, commission states and payouts come from approved affiliate partners (ARD §10, §16).
            No partner integration is active yet. Turn on demo data to preview this module with fictional sample networks.
          </Unavailable>
        </Panel>
      </>
    );
  }

  const partnerRows = SAMPLE_NETWORKS.map((name) => {
    const list = rows.filter((r) => r.partner === name);
    return {
      name,
      conversions: list.length,
      sales: sum(list, "saleValue"),
      estimated: byState(list, "Estimated") + byState(list, "Pending"),
      approved: byState(list, "Approved") + byState(list, "Paid"),
      reversed: byState(list, "Reversed"),
    };
  }).filter((p) => !partner || p.name === partner);

  const series = dailyCommission(rows, days, 0);
  const prevSeries = dailyCommission(prevRows, days, days);

  const exportCSV = () => {
    downloadCSV(`dealsphere-sales-DEMO-${days}d.csv`, rows.map((r) => ({ ...r, currency, note: "DEMO DATA - fictional sample network" })));
    notify("Demo sales records exported as CSV.");
  };

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Sales & Revenue"
        description="Tracked merchant-attributed sales and the commission DealSphere may earn on them."
        actions={
          can("sales", "export") && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={exportCSV}>
              <Icon name="download" size={16} /> Export CSV
            </button>
          )
        }
      />

      <Notice>
        Merchant sales value is not DealSphere revenue. DealSphere/Tamada Media revenue is the commission shown separately
        below (ARD §12.2). Figures use fictional sample networks, not the providers in Partners.
      </Notice>

      <FilterBar>
        <SelectField label="Date range" value={days} onChange={(v) => setDays(Number(v))} options={RANGES.map((r) => ({ value: r.id, label: r.label }))} />
        <SelectField label="Partner" value={partner} onChange={setPartner} options={[{ value: "", label: "All partners" }, ...SAMPLE_NETWORKS]} />
        <SelectField label="Status" value={status} onChange={setStatus} options={[{ value: "", label: "All statuses" }, ...COMMISSION_STATES]} />
        <SelectField label="Campaign" value={campaign} onChange={setCampaign} options={[{ value: "", label: "All campaigns" }, ...state.campaigns.map((c) => ({ value: c.id, label: c.name }))]} />
      </FilterBar>

      <div className="adm-stats adm-stats--2">
        <Stat label="Tracked conversions" value={num(rows.length)} delta={change(rows.length, prevRows.length)} source="partner" />
        <Stat label="Merchant sales value" value={fmt(sum(rows, "saleValue"))} delta={change(sum(rows, "saleValue"), sum(prevRows, "saleValue"))} source="partner" />
      </div>

      <div className="adm-stats adm-stats--6">
        {COMMISSION_STATES.map((s) => (
          <Stat
            key={s}
            label={`${s} commission`}
            value={fmt(byState(rows, s))}
            delta={change(byState(rows, s), byState(prevRows, s))}
            source={s === "Estimated" ? "estimate" : "partner"}
          />
        ))}
      </div>

      <Panel title="Commission per day" subtitle="All commission states, this period vs the previous period">
        <LineChart
          label="Daily commission, current and previous period"
          format={(v) => (v >= 1000 ? `₹${compact(v)}` : fmt(v))}
          series={[
            { name: "This period", color: "#79a00c", points: series.map((p) => ({ x: p.date, y: p.value })) },
            { name: "Previous period", color: "#3987e5", points: prevSeries.map((p, i) => ({ x: series[i].date, y: p.value })) },
          ]}
        />
      </Panel>

      <Panel title="Partner-level results" subtitle="Fictional sample networks" flush>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Partner</th>
                <th scope="col" className="is-num">Conversions</th>
                <th scope="col" className="is-num">Merchant sales</th>
                <th scope="col" className="is-num">Estimated + pending</th>
                <th scope="col" className="is-num">Approved + paid</th>
                <th scope="col" className="is-num">Reversed</th>
              </tr>
            </thead>
            <tbody>
              {partnerRows.map((p) => (
                <tr key={p.name}>
                  <td><strong>{p.name}</strong></td>
                  <td className="is-num">{num(p.conversions)}</td>
                  <td className="is-num">{fmt(p.sales)}</td>
                  <td className="is-num">{fmt(p.estimated)}</td>
                  <td className="is-num">{fmt(p.approved)}</td>
                  <td className="is-num">{fmt(p.reversed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Conversion records" subtitle={`${rows.length} record(s) - select one to open its source record`} flush>
        {rows.length ? (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table adm-table--click">
                <thead>
                  <tr>
                    <th scope="col">Reference</th>
                    <th scope="col">Date</th>
                    <th scope="col">Partner</th>
                    <th scope="col">Merchant</th>
                    <th scope="col" className="is-num">Sale value</th>
                    <th scope="col" className="is-num">Commission</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, limit).map((r) => (
                    <tr key={r.id}>
                      <td>
                        <button type="button" className="adm-link" onClick={() => setOpen(r)}>
                          {r.id}
                        </button>
                      </td>
                      <td>{fmtDate(r.date)}</td>
                      <td>{r.partner}</td>
                      <td>{r.merchant}</td>
                      <td className="is-num">{fmt(r.saleValue)}</td>
                      <td className="is-num">{fmt(r.commission)}</td>
                      <td><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > limit && (
              <div className="adm-pad">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setLimit((l) => l + 12)}>
                  Show more ({rows.length - limit} remaining)
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="muted adm-pad">No conversions match these filters.</p>
        )}
      </Panel>

      {open && (
        <Modal title={`Conversion ${open.id}`} description="Demo source record from a fictional sample network" onClose={() => setOpen(null)}>
          <dl className="adm-dl">
            <dt>Date</dt><dd>{fmtDate(open.date)}</dd>
            <dt>Partner</dt><dd>{open.partner}</dd>
            <dt>Merchant</dt><dd>{open.merchant}</dd>
            <dt>Campaign</dt><dd>{state.campaigns.find((c) => c.id === open.campaign)?.name || "None"}</dd>
            <dt>Merchant sale value</dt><dd>{fmt(open.saleValue)}</dd>
            <dt>Commission</dt><dd>{fmt(open.commission)}</dd>
            <dt>Commission status</dt><dd><StatusBadge status={open.status} /></dd>
            <dt>Partner statement</dt><dd>Unavailable - requires partner report import (ARD §10.1)</dd>
          </dl>
        </Modal>
      )}
    </>
  );
}

export default Sales;
