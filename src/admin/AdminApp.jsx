import { useCallback, useEffect, useState } from "react";
import "../App.css";
import "./admin.css";
import Icon from "../components/Icon";
import Logo from "../components/Logo";
import DotPattern from "../components/DotPattern";
import AdminStore from "./AdminStore";
import { useAdmin } from "./adminContext";
import { MODULES, ROLES } from "./permissions";
import { EmptyBlock, Toggle } from "./AdminUI";
import Overview from "./pages/Overview";
import MyDashboard from "./pages/MyDashboard";
import Analytics from "./pages/Analytics";
import Sales from "./pages/Sales";
import StaffTasks from "./pages/StaffTasks";
import Finance from "./pages/Finance";
import Categories from "./pages/Categories";
import Deals from "./pages/Deals";
import Partners from "./pages/Partners";
import Campaigns from "./pages/Campaigns";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

const PAGES = {
  overview: Overview,
  my: MyDashboard,
  analytics: Analytics,
  sales: Sales,
  staff: StaffTasks,
  finance: Finance,
  categories: Categories,
  deals: Deals,
  partners: Partners,
  campaigns: Campaigns,
  reports: Reports,
  settings: Settings,
};

// "/admin/finance" -> "finance"; "/admin" -> ""
const readRoute = () => window.location.pathname.replace(/^\/admin\/?/, "").split("/")[0];

function Shell() {
  const { state, viewer, isAdmin, can, route, navigate, setViewer, setDemoData, permissionsStale, refreshSession, toast, dismissToast } = useAdmin();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = MODULES.filter((m) => can(m.id, "view"));
  const home = isAdmin ? "" : "my";
  const current = MODULES.find((m) => m.path === route) || MODULES.find((m) => m.path === home);
  const permitted = current && can(current.id, "view");
  const Page = PAGES[current?.id];

  useEffect(() => {
    document.title = `${current?.label || "Admin"} · DealSphere Admin (demo)`;
  }, [current]);

  const go = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <div className={`adm ${menuOpen ? "adm--menu-open" : ""}`}>
      <a className="adm-skip" href="#adm-main">Skip to content</a>

      <aside className="adm-side" aria-label="Admin navigation">
        <div className="adm-side__brand">
          <Logo onClick={() => go(home)} />
          <span className="adm-side__badge">Admin</span>
        </div>
        <nav className="adm-nav">
          {nav.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`adm-nav__item ${current?.id === m.id ? "is-active" : ""}`}
              aria-current={current?.id === m.id ? "page" : undefined}
              onClick={() => go(m.path)}
            >
              <Icon name={m.icon} size={18} />
              <span>{m.label}</span>
              {m.id === "staff" && <NavCount n={state.tasks.filter((t) => t.status === "Needs Review").length} label="tasks need review" />}
              {m.id === "deals" && <NavCount n={state.deals.filter((d) => d.status === "Pending Review").length} label="offers pending review" />}
              {m.id === "finance" && isAdmin && <NavCount n={state.approvals.filter((a) => a.status === "Pending").length} label="approvals pending" />}
            </button>
          ))}
        </nav>
        <div className="adm-side__foot">
          <a className="adm-nav__item" href="/">
            <Icon name="external" size={18} />
            <span>View public site</span>
          </a>
        </div>
      </aside>
      <button type="button" className="adm-scrim" aria-label="Close navigation" tabIndex={-1} onClick={() => setMenuOpen(false)} />

      <div className="adm-body">
        <header className="adm-top">
          <button type="button" className="icon-btn adm-top__menu" onClick={() => setMenuOpen((v) => !v)} aria-label="Open navigation" aria-expanded={menuOpen}>
            <Icon name="menu" />
          </button>

          <div className="adm-top__controls">
            <label className="adm-demo-toggle">
              <span>Demo metrics</span>
              <Toggle checked={state.demoData} onChange={setDemoData} label="Show demo metrics" />
            </label>
            <label className="adm-viewas">
              <span>View as</span>
              <select value={viewer.id} onChange={(e) => { setViewer(e.target.value); go(e.target.value === "admin" ? "" : "my"); }}>
                <option value="admin">Admin (demo)</option>
                {state.staff.filter((s) => s.active).map((s) => (
                  <option key={s.id} value={s.id}>{s.name} · {ROLES[s.role].label}</option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <div className="adm-demo-bar" role="note">
          <Icon name="info" size={16} />
          <span>
            <strong>Frontend demo.</strong> No sign-in, backend or live integrations - all records are sample data stored in this browser.
          </span>
        </div>

        {!isAdmin && (
          <div className="adm-preview-bar">
            <Icon name="eye" size={16} />
            <span>
              Previewing as <strong>{viewer.name}</strong> ({ROLES[viewer.role].label}). Only permitted modules are shown - real
              enforcement must happen on the server (ARD §18).
            </span>
            {permissionsStale && (
              <button type="button" className="btn btn--lime btn--sm" onClick={refreshSession}>
                Permissions changed · refresh session
              </button>
            )}
            <button type="button" className="text-btn" onClick={() => { setViewer("admin"); go(""); }}>
              Back to Admin
            </button>
          </div>
        )}

        <main id="adm-main" className="adm-main dotted" tabIndex={-1}>
          <DotPattern width={22} height={22} className="dot-pattern--page" />
          <div className="adm-content page-enter" key={`${route}-${viewer.id}`}>
            {permitted && Page ? (
              <Page />
            ) : (
              <EmptyBlock
                icon="lock"
                title="You don't have access to this module"
                action={<button type="button" className="btn btn--lime btn--sm" onClick={() => go(home)}>Go to {isAdmin ? "Overview" : "My Dashboard"}</button>}
              >
                {current?.label} isn't part of {ROLES[viewer.role]?.label}'s permissions. An Admin can grant access in Staff & Tasks.
              </EmptyBlock>
            )}
          </div>
        </main>
      </div>

      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div className={`toast adm-toast--${toast.kind}`} key={toast.id}>
            <span className="toast__icon"><Icon name={toast.kind === "info" ? "info" : "check"} size={16} /></span>
            {toast.message}
            <button type="button" className="adm-toast__close" onClick={dismissToast} aria-label="Dismiss">
              <Icon name="x" size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NavCount({ n, label }) {
  if (!n) return null;
  return (
    <span className="adm-nav__count" aria-label={`${n} ${label}`}>
      {n}
    </span>
  );
}

function AdminApp() {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const onPop = () => setRoute(readRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((path) => {
    const url = `/admin${path ? `/${path}` : ""}`;
    if (window.location.pathname !== url) window.history.pushState(null, "", url);
    setRoute(path);
    window.scrollTo(0, 0);
  }, []);

  return (
    <AdminStore route={route} onNavigate={navigate}>
      <Shell />
    </AdminStore>
  );
}

export default AdminApp;
