import { useEffect, useState } from "react";
import { DealsContext } from "./dealsContext";
import { deals as bundledDeals } from "./deals";

// Loads deals from the backend (server/dealsApi.js). Each API deal carries a
// goUrl (/go/:id), so "View Deal" goes through the backend redirect. Refreshes
// every few minutes so price alerts notice a price change while the site is open.
const REFRESH_MS = 5 * 60 * 1000;

function DealsProvider({ children }) {
  const [deals, setDeals] = useState(bundledDeals);

  useEffect(() => {
    const controller = new AbortController();
    const load = () =>
      fetch("/api/deals", { signal: controller.signal, headers: { accept: "application/json" } })
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
        .then((data) => {
          if (Array.isArray(data.deals)) setDeals(data.deals);
        })
        .catch((error) => {
          if (error.name !== "AbortError") console.warn("[DealSphere] Deals API unavailable, using bundled deals.", error);
        });
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, []);

  return <DealsContext.Provider value={deals}>{children}</DealsContext.Provider>;
}

export default DealsProvider;
