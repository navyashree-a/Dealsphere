import CouponCode from "./CouponCode";
import Icon from "./Icon";
import ViewDealLink from "./ViewDealLink";
import useTilt from "./useTilt";
import { toneFor } from "../data/deals";

// Coupon-ticket card. The title button stretches over the whole card, so the
// card opens on click while the inner buttons stay independently focusable.
function DealCard({ deal, isSaved = false, onOpen, onToggleSave, onRemove }) {
  const tilt = useTilt(6);

  return (
    <article
      className={`deal-card tone-${toneFor(deal.category)}`}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
    >
      <div className="deal-card__visual">
        <span className="deal-card__glow" aria-hidden="true" />
        <span className="deal-card__cube" aria-hidden="true">
          <span className="deal-card__emoji">{deal.icon}</span>
        </span>
        <span className="sticker">{deal.discount}</span>
      </div>

      {/* Kept outside the visual: its perspective creates a stacking context
          that would sit beneath the stretched title link. */}
      {onToggleSave && (
        <button
          type="button"
          className={`save-heart ${isSaved ? "is-saved" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleSave(deal);
          }}
          aria-pressed={isSaved}
          aria-label={isSaved ? `Remove ${deal.store} deal from wishlist` : `Save ${deal.store} deal`}
          data-tip={isSaved ? "Saved" : "Save deal"}
        >
          <Icon name="heart" size={18} filled={isSaved} />
        </button>
      )}

      <div className="deal-card__body">
        <div className="deal-card__meta">
          <span className="deal-card__store">{deal.store}</span>
          <span className="deal-card__cat">{deal.category}</span>
        </div>
        <h3 className="deal-card__title">
          <button type="button" className="deal-card__link" onClick={() => onOpen(deal)}>
            {deal.title}
          </button>
        </h3>
        <p className="deal-card__desc">{deal.description}</p>
      </div>

      <div className="deal-card__perf" aria-hidden="true" />

      <div className="deal-card__foot">
        <CouponCode code={deal.code} size="sm" deal={deal} />
        <ViewDealLink deal={deal} />
        {onRemove && (
          <button
            type="button"
            className="text-btn text-btn--danger"
            onClick={(event) => {
              event.stopPropagation();
              onRemove(deal.id);
            }}
          >
            <Icon name="trash" size={16} />
            Remove
          </button>
        )}
      </div>
    </article>
  );
}

export default DealCard;
