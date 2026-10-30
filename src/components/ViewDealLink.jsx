import { useId } from "react";
import Icon from "./Icon";
import { resolveDealLink } from "../utils/dealLink";
import { useCouponActivity } from "./couponActivity";

const REASONS = {
  missing: "The merchant link for this deal hasn't been added yet.",
  invalid: "This deal's link couldn't be verified, so it's been disabled.",
};

// "View Deal" for a deal card or the deal details page. Opens the merchant's
// page in a new tab, or shows a disabled control with the reason.
function ViewDealLink({ deal, variant = "card" }) {
  const reasonId = useId();
  const recordActivity = useCouponActivity();
  const link = resolveDealLink(deal);
  const isCard = variant === "card";
  const className = isCard ? "view-deal" : "btn btn--lime";

  if (link.ok) {
    return (
      <a
        className={className}
        href={link.href}
        target="_blank"
        // noopener: the merchant tab can't control this page.
        // sponsored: marks affiliate links as paid links.
        rel={link.viaAffiliate ? "noopener sponsored" : "noopener"}
        aria-label={`View deal at ${link.merchantName} (opens in a new tab)`}
        data-tip={isCard ? `Opens ${link.merchantName}` : undefined}
        onClick={() => recordActivity(deal, "visited")}
      >
        {isCard ? "View Deal" : `View Deal at ${link.merchantName}`}
        <Icon name="external" size={isCard ? 14 : 16} />
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`${className} is-unavailable`}
        aria-disabled="true"
        aria-describedby={reasonId}
        data-tip={isCard ? "Link not available yet" : undefined}
        onClick={(event) => event.preventDefault()}
      >
        View Deal
        <Icon name="external" size={isCard ? 14 : 16} />
      </button>
      <span id={reasonId} className={isCard ? "sr-only" : "view-deal-reason"}>
        {REASONS[link.reason]}
      </span>
    </>
  );
}

export default ViewDealLink;
