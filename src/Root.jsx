import { Suspense, lazy } from "react";
import App from "./App.jsx";
import CursorSpotlight from "./components/CursorSpotlight.jsx";
import DealsProvider from "./data/DealsProvider.jsx";

// The admin panel lives at /admin and is loaded only when visited, so the
// customer website bundle is unchanged. Production hosting must rewrite
// /admin/* to index.html (Vite's dev and preview servers already do).
const AdminApp = lazy(() => import("./admin/AdminApp.jsx"));

const isAdminRoute = () => /^\/admin(\/|$)/.test(window.location.pathname);

function Root() {
  return (
    <>
      {isAdminRoute() ? (
        <Suspense fallback={<div className="adm-loading">Loading admin…</div>}>
          <AdminApp />
        </Suspense>
      ) : (
        <DealsProvider>
          <App />
        </DealsProvider>
      )}
      {/* One website-wide cursor light for every screen, including /admin. */}
      <CursorSpotlight />
    </>
  );
}

export default Root;
