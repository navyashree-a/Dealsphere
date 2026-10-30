import { useState } from "react";
import Icon from "../../components/Icon";
import { useAdmin } from "../adminContext";
import { CATEGORY_SHARE, RANGES, STORE_SHARE, searchTerms, sum, trafficSeries } from "../adminMetrics";
import { compact, downloadCSV, num, pct, seeded } from "../adminUtils";
import { BarList, FilterBar, LineChart, PageHeader, Panel, SelectField, SourceTag, Stat, Unavailable } from "../AdminUI";

const change = (current, previous) => (previous ? (current - previous) / previous : null);

// ARD §8 Analytics / FR-09: traffic trends, search terms, popular categories
// and stores, deal views, outbound clicks and conversion rate where measurable.
function Analytics() {
  const { state, can, notify } = useAdmin();
  const [days, setDays] = useState(30);
  const [category, setCategory] = useState("");
  const [store, setStore] = useState("");
  const [campaign, setCampaign] = useState("");
  const demo = state.demoData;
  const filters = { category, store, campaign };

  const { current, previous } = trafficSeries(days, filters);
  const totals = (rows) => ({
    visits: sum(rows, "visits"),
    searches: sum(rows, "searches"),
    dealViews: sum(rows, "dealViews"),
    clicks: sum(rows, "clicks"),
    conversions: sum(rows, "conversions"),
  });
  const now = totals(current);
  const before = totals(previous);
  const rate = now.clicks ? now.conversions / now.clicks : 0;
  const ratePrev = before.clicks ? before.conversions / before.clicks : 0;

  const categoryNames = state.categories.map((c) => c.name);
  const storeNames = Object.keys(STORE_SHARE);
  const unfilteredViews = sum(trafficSeries(days, { campaign }).current, "dealViews");

  const categoryBars = categoryNames
    .filter((name) => !category || name === category)
    .map((name) => ({ label: name, value: Math.round(unfilteredViews * (CATEGORY_SHARE[name] || 0) * (store ? STORE_SHARE[store] : 1)) }))
    .sort((a, b) => b.value - a.value);

  const storeBars = storeNames
    .filter((name) => !store || name === store)
    .map((name) => ({ label: name, value: Math.round(unfilteredViews * STORE_SHARE[name] * (category ? CATEGORY_SHARE[category] : 1)) }))
    .sort((a, b) => b.value - a.value);

  const terms = searchTerms(days);
  const termsWithResults = terms.reduce((acc, t) => acc + t.searches * t.withResults, 0) / Math.max(1, sum(terms, "searches"));

  const dealRows = state.deals
    .filter((d) => d.status === "Active")
    .filter((d) => (!category || d.category === category) && (!store || d.merchant === store))
    .filter((d) => !campaign || state.campaigns.find((c) => c.id === campaign)?.deals.includes(d.id))
    .map((d, i) => {
      const views = Math.round((now.dealViews / 9) * (0.5 + seeded(i + d.id.length * 7)));
      const clicks = Math.round(views * (0.08 + 0.08 * seeded(i + 90)));
      return { id: d.id, title: d.title, merchant: d.merchant, category: d.category, views, clicks };
    })
    .sort((a, b) => b.clicks - a.clicks);

  const exportCSV = () => {
    downloadCSV(`dealsphere-analytics-DEMO-${days}d.csv`, current.map((r) => ({ ...r, note: "DEMO DATA" })));
    notify("Demo analytics exported as CSV.");
  };

  const na = !demo && "Requires an agreed analytics approach (ARD §16).";

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Analytics"
        description="Traffic, search, deal engagement and conversion trends."
        actions={
          can("analytics", "export") ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={exportCSV} disabled={!demo}>
              <Icon name="download" size={16} /> Export CSV
            </button>
          ) : (
            <span className="adm-perm-note">
              <Icon name="lock" size={14} /> Export not permitted for your role
            </span>
          )
        }
      />

      <FilterBar>
        <SelectField label="Date range" value={days} onChange={(v) => setDays(Number(v))} options={RANGES.map((r) => ({ value: r.id, label: r.label }))} />
        <SelectField label="Category" value={category} onChange={setCategory} options={[{ value: "", label: "All categories" }, ...categoryNames.map((n) => ({ value: n, label: n }))]} />
        <SelectField label="Store" value={store} onChange={setStore} options={[{ value: "", label: "All stores" }, ...storeNames.map((n) => ({ value: n, label: n }))]} />
        <SelectField label="Campaign" value={campaign} onChange={setCampaign} options={[{ value: "", label: "All campaigns" }, ...state.campaigns.map((c) => ({ value: c.id, label: c.name }))]} />
      </FilterBar>

      <div className="adm-stats adm-stats--5">
        <Stat label="Visits" value={compact(now.visits)} delta={change(now.visits, before.visits)} unavailable={na} />
        <Stat label="Searches" value={compact(now.searches)} delta={change(now.searches, before.searches)} unavailable={na} />
        <Stat label="Deal views" value={compact(now.dealViews)} delta={change(now.dealViews, before.dealViews)} unavailable={na} />
        <Stat label="Outbound clicks" value={compact(now.clicks)} delta={change(now.clicks, before.clicks)} unavailable={na} />
        <Stat
          label="Conversion rate"
          value={pct(rate)}
          delta={change(rate, ratePrev)}
          source="partner"
          unavailable={!demo && "Measurable only with partner conversion tracking (ARD §8)."}
        />
      </div>

      {!demo ? (
        <Panel>
          <Unavailable title="Analytics data unavailable">
            Page views, searches, deal views, outbound clicks and conversions are collected only where an approved
            analytics approach is configured (ARD §15.2, §16). Turn on demo data to preview these views.
          </Unavailable>
        </Panel>
      ) : (
        <>
          <Panel title="Outbound clicks" subtitle="Daily merchant clicks for the selected filters">
            <LineChart
              label="Daily outbound clicks"
              format={compact}
              series={[{ name: "Outbound clicks", color: "#b7e531", points: current.map((r) => ({ x: r.date, y: r.clicks })) }]}
            />
          </Panel>

          <div className="adm-grid adm-grid--2">
            <Panel title="Popular categories" subtitle="Deal views by category" actions={<SourceTag kind="demo" />}>
              <BarList label="Deal views by category" items={categoryBars} format={compact} />
            </Panel>
            <Panel title="Popular stores" subtitle="Deal views by store" actions={<SourceTag kind="demo" />}>
              <BarList label="Deal views by store" items={storeBars} format={compact} />
            </Panel>
          </div>

          <div className="adm-grid adm-grid--2">
            <Panel
              title="Search terms"
              subtitle={`ARD §3 search usage: ${pct(termsWithResults, 0)} of these searches returned results`}
              actions={<SourceTag kind="demo" />}
              flush
            >
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th scope="col">Term</th>
                      <th scope="col" className="is-num">Searches</th>
                      <th scope="col" className="is-num">With results</th>
                    </tr>
                  </thead>
                  <tbody>
                    {terms.map((t) => (
                      <tr key={t.term}>
                        <td>{t.term}</td>
                        <td className="is-num">{num(t.searches)}</td>
                        <td className="is-num">
                          {t.withResults === 0 ? <span className="adm-flag">No results</span> : pct(t.withResults, 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="Top offers by outbound clicks" subtitle="Active offers matching the filters" actions={<SourceTag kind="demo" />} flush>
              {dealRows.length ? (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th scope="col">Offer</th>
                        <th scope="col" className="is-num">Views</th>
                        <th scope="col" className="is-num">Clicks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dealRows.map((d) => (
                        <tr key={d.id}>
                          <td>
                            <strong>{d.title}</strong>
                            <span className="adm-sub">{d.merchant} · {d.category}</span>
                          </td>
                          <td className="is-num">{num(d.views)}</td>
                          <td className="is-num">{num(d.clicks)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted adm-pad">No active offers match these filters.</p>
              )}
            </Panel>
          </div>
        </>
      )}
    </>
  );
}

export default Analytics;
