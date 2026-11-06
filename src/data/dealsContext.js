import { createContext, useContext } from "react";
import { deals as bundledDeals } from "./deals";

// The deals customers browse. DealsProvider swaps in the backend's list
// (GET /api/deals); until then, or if the backend can't be reached, the
// bundled copy is used so the site always has content.
export const DealsContext = createContext(bundledDeals);

export const useDeals = () => useContext(DealsContext);

// False until the first answer from the backend (or a failed attempt). Wait for
// this before matching stored deal ids against the catalog.
export const DealsReadyContext = createContext(true);

export const useDealsReady = () => useContext(DealsReadyContext);
