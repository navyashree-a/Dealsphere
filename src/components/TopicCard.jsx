import Icon from "./Icon";
import useReveal from "./useReveal";
import useTilt from "./useTilt";
import { toneFor } from "../data/deals";

const storeLine = (stores) => (stores.length > 2 ? `${stores.slice(0, 2).join(" · ")} +${stores.length - 2}` : stores.join(" · "));

// Homepage card for a topic ("Shoes & sneakers"). The whole card opens the
// topic page, which lists every coupon, deal, bank offer and cashback for it.
function TopicCard({ topic, onOpen, index = 0 }) {
  const tilt = useTilt(6);
  const [revealRef, revealed] = useReveal();

  return (
    <article
      ref={revealRef}
      className={`deal-card topic-card tone-${toneFor(topic.category)} ${revealed ? "is-revealed" : ""}`}
      // Cards in the same row arrive one after another.
      style={{ "--reveal-delay": `${(index % 3) * 110}ms` }}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
    >
      <div className={`deal-card__visual ${topic.image ? "deal-card__visual--photo" : ""}`}>
        {topic.image ? (
          // Decorative: the card's title already says what it is.
          <img className="deal-card__photo" src={topic.image} alt="" loading="lazy" decoding="async" />
        ) : (
          <>
            <span className="deal-card__glow" aria-hidden="true" />
            <span className="deal-card__cube" aria-hidden="true">
              <span className="deal-card__emoji">{topic.icon}</span>
            </span>
          </>
        )}
        <span className="sticker">{topic.bestDiscount}</span>
      </div>

      <div className="deal-card__body">
        <div className="deal-card__meta">
          <span className="deal-card__store">{storeLine(topic.stores)}</span>
          <span className="deal-card__cat">{topic.category}</span>
        </div>
        <h3 className="deal-card__title">
          <button type="button" className="deal-card__link" onClick={() => onOpen(topic)}>
            {topic.name}
          </button>
        </h3>
        <p className="deal-card__desc">{topic.description}</p>
      </div>

      <div className="deal-card__perf" aria-hidden="true" />

      <div className="deal-card__foot topic-card__foot">
        {/* tabIndex -1: the title button is already the keyboard target. */}
        <button type="button" className="topic-card__cta" onClick={() => onOpen(topic)} tabIndex={-1}>
          See all {topic.offerCount} offers
          <Icon name="arrowRight" size={16} />
        </button>
      </div>
    </article>
  );
}

export default TopicCard;
