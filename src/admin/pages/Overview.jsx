import { useState } from "react";
import Icon from "../../components/Icon";
import { useAdmin } from "../adminContext";
import { RANGES, conversionsInRange, sum, trafficSeries } from "../adminMetrics";
import { compact, daysUntil, fmtDate, money, num, pct, taskDisplayStatus } from "../adminUtils";
import { LineChart, PageHeader, Panel, SelectField, Stat, StatusBadge, Unavailable } from "../AdminUI";

const change = (current, previous) => (previous ? (current - previous) / previous : null);

// ARD §8 Overview: visits, users, active offers, clicks, conversions,
// revenue/commission summaries, pending tasks and alerts, with a date range.
function Overview() {
  const { state, navigate, staffName, can } = useAdmin();
  const [days, setDays] = useState(30);
  const demo = state.demoData;

  const { current, previous } = trafficSeries(days);
  const conv = conversionsInRange(days);
  const convPrev = conversionsInRange(days, days);
  const commission = (rows, statuses) =>
    sum(rows.filter((r) => statuses.includes(r.status)), "commission");

  const active = state.deals.filter((d) => d.status === "Active");
  const openTasks = state.tasks.filter((t) => !["Completed", "Cancelled"].includes(t.status));
  const overdue = state.tasks.filter((t) => taskDisplayStatus(t) === "Overdue");
  const pendingReview = state.deals.filter((d) => d.status === "Pending Review");
  const expiringSoon = active.filter((d) => {
    const left = daysUntil(d.expiry);
    return left !== null && left >= 0 && left <= 7;
  });
  const qualityOk = active.filter((d) => d.source && d.expiry).length;
  const pendingApprovals = state.approvals.filter((a) => a.status === "Pending");
  const activePartners = state.partners.filter((p) => p.status === "Active");

  const alerts = [
    overdue.length && { tone: "critical", icon: "clock", text: `${overdue.length} task(s) overdue`, to: "staff" },
    pendingReview.length && { tone: "warning", icon: "tag", text: `${pendingReview.length} offer(s) waiting for review`, to: "deals" },
    expiringSoon.length && { tone: "warning", icon: "alert", text: `${expiringSoon.length} active offer(s) expire within 7 days`, to: "deals" },
    active.length - qualityOk && {
      tone: "info",
      icon: "info",
      text: `${active.length - qualityOk} active offer(s) missing source or expiry information`,
      to: "deals",
    },
    pendingApprovals.length && { tone: "warning", icon: "lock", text: `${pendingApprovals.length} finance change(s) need approval`, to: "finance" },
    !activePartners.length && {
      tone: "info",
      icon: "link",
      text: `No partner integrations are active - all ${state.partners.length} providers are still Proposed`,
      to: "partners",
    },
  ].filter(Boolean);

  const unavailableTraffic = !demo && "Requires an agreed analytics approach (ARD §16).";
  const unavailablePartner = !demo && "Requires approved partner tracking and reports (ARD §10, §16).";

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Overview"
        description="Business summary across traffic, offers, revenue, tasks and alerts."
        actions={
          <SelectField
            label="Date range"
            value={days}
            onChange={(v) => setDays(Number(v))}
            options={RANGES.map((r) => ({ value: r.id, label: r.label }))}
          />
        }
      />

      <div className="adm-stats">
        <Stat
          label="Visits"
          icon="eye"
          value={compact(sum(current, "visits"))}
          delta={change(sum(current, "visits"), sum(previous, "visits"))}
          unavailable={unavailableTraffic}
          onClick={can("analytics") ? () => navigate("analytics") : undefined}
        />
        <Stat
          label="Registered users"
          icon="users"
          value={num(2481)}
          unavailable={!demo && "Requires the authentication backend (ARD §16)."}
        />
        <Stat
          label="Active offers"
          icon="tag"
          value={active.length}
          source="record"
          onClick={() => navigate("deals")}
        />
        <Stat
          label="Outbound clicks"
          icon="external"
          value={compact(sum(current, "clicks"))}
          delta={change(sum(current, "clicks"), sum(previous, "clicks"))}
          unavailable={unavailableTraffic}
        />
        <Stat
          label="Tracked conversions"
          icon="check"
          value={num(conv.length)}
          delta={change(conv.length, convPrev.length)}
          source="partner"
          unavailable={unavailablePartner}
          onClick={() => navigate("sales")}
        />
        <Stat
          label="Commission (estimated + pending)"
          icon="wallet"
          value={money(commission(conv, ["Estimated", "Pending"]), state.settings.currency)}
          source="estimate"
          unavailable={unavailablePartner}
        />
        <Stat
          label="Commission (approved + paid)"
          icon="wallet"
          value={money(commission(conv, ["Approved", "Paid"]), state.settings.currency)}
          source="partner"
          unavailable={unavailablePartner}
        />
        <Stat
          label="Open tasks"
          icon="clock"
          value={openTasks.length}
          source="record"
          onClick={() => navigate("staff")}
        />
      </div>

      <div className="adm-grid adm-grid--2-1">
        <Panel title="Visits" subtitle={`Daily visits, ${RANGES.find((r) => r.id === days).label.toLowerCase()} vs the previous period`}>
          {demo ? (
            <LineChart
              label="Daily visits, current and previous period"
              format={compact}
              series={[
                { name: "This period", color: "#79a00c", points: current.map((r) => ({ x: r.date, y: r.visits })) },
                { name: "Previous period", color: "#3987e5", points: previous.map((r, i) => ({ x: current[i].date, y: r.visits })) },
              ]}
            />
          ) : (
            <Unavailable title="Traffic data unavailable">
              No analytics provider is configured. Turn on demo data to preview this chart with sample figures.
            </Unavailable>
          )}
        </Panel>

        <Panel title="Alerts" subtitle="Items that need attention">
          {alerts.length ? (
            <ul className="adm-alerts">
              {alerts.map((alert) => (
                <li key={alert.text}>
                  <button type="button" className={`adm-alert adm-alert--${alert.tone}`} onClick={() => navigate(alert.to)}>
                    <Icon name={alert.icon} size={18} />
                    <span>{alert.text}</span>
                    <Icon name="arrowRight" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No alerts right now.</p>
          )}
        </Panel>
      </div>

      <div className="adm-grid adm-grid--2">
        <Panel
          title="Pending tasks"
          subtitle="Open work across staff"
          actions={
            <button type="button" className="text-btn" onClick={() => navigate("staff")}>
              All tasks <Icon name="arrowRight" size={16} />
            </button>
          }
        >
          <ul className="adm-list">
            {openTasks.slice(0, 5).map((task) => (
              <li key={task.id} className="adm-list__row">
                <div>
                  <strong>{task.title}</strong>
                  <span>
                    {staffName(task.assignee)} · due {fmtDate(task.due)}
                  </span>
                </div>
                <StatusBadge status={taskDisplayStatus(task)} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Content quality" subtitle="ARD §3: live offers with source and expiry populated">
          <div className="adm-meter">
            <div className="adm-meter__head">
              <strong>{active.length ? pct(qualityOk / active.length, 0) : "—"}</strong>
              <span>
                {qualityOk} of {active.length} active offers complete
              </span>
              <span className="adm-source adm-source--record">Demo record</span>
            </div>
            <div className="adm-meter__track">
              <span style={{ width: `${active.length ? (qualityOk / active.length) * 100 : 0}%` }} />
            </div>
          </div>
          <ul className="adm-kv">
            <li>
              <span>Offers in review</span>
              <strong>{pendingReview.length}</strong>
            </li>
            <li>
              <span>Expiring within 7 days</span>
              <strong>{expiringSoon.length}</strong>
            </li>
            <li>
              <span>Active partner integrations</span>
              <strong>{activePartners.length}</strong>
            </li>
          </ul>
        </Panel>
      </div>
    </>
  );
}

export default Overview;
