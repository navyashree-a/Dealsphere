import { createContext, useContext } from "react";

// "View Deal" is for signed-in customers. App.jsx provides whether someone is
// signed in, and requestSignIn(deal), which sends them to sign in and brings
// them back to that deal afterwards. Outside a provider, links just work.
export const DealAccessContext = createContext({ isLoggedIn: true, requestSignIn: () => {} });

export const useDealAccess = () => useContext(DealAccessContext);
