import { createContext, useContext } from "react";

// Lets coupon controls (Copy, View Deal) report what a signed-in customer did,
// without passing callbacks through every card. App.jsx provides the real
// recorder; outside a provider (or when signed out) reporting does nothing.
//
// Activity types: "copied" (copied the coupon code) and "visited" (opened the
// deal on the merchant's site). DealSphere can't see merchant orders, so
// whether a coupon was actually used is marked by the customer.
export const CouponActivityContext = createContext(() => {});

export const useCouponActivity = () => useContext(CouponActivityContext);
