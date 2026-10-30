import { useEffect, useState } from "react";
import Icon from "./Icon";
import { useCouponActivity } from "./couponActivity";

// Dashed coupon strip with a copy button. "Copied" resets after a moment.
// Pass `deal` to record successful copies in the customer's coupon history.
function CouponCode({ code, size = "md", deal }) {
  const [copied, setCopied] = useState(false);
  const recordActivity = useCouponActivity();

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyCoupon = async (event) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (deal) recordActivity(deal, "copied");
    } catch {
      window.prompt("Copy your coupon code:", code);
    }
  };

  // Deals without a code: the discount applies on the merchant's site.
  if (!code) {
    return (
      <div className={`coupon-strip coupon-strip--${size} coupon-strip--nocode`}>
        <span className="coupon-strip__code">No code needed</span>
        <Icon name="check" size={16} />
      </div>
    );
  }

  return (
    <div className={`coupon-strip coupon-strip--${size}`}>
      <span className="coupon-strip__code">{code}</span>
      <button
        type="button"
        className={`coupon-strip__btn ${copied ? "is-copied" : ""}`}
        onClick={copyCoupon}
        aria-label={copied ? `Copied ${code}` : `Copy coupon code ${code}`}
      >
        <Icon name={copied ? "check" : "copy"} size={16} />
        <span aria-live="polite">{copied ? "Copied!" : "Copy"}</span>
      </button>
    </div>
  );
}

export default CouponCode;
