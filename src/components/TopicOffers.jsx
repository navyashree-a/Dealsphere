import { useState } from "react";
import EmptyState from "./EmptyState";
import Icon from "./Icon";
import { toneFor } from "../data/deals";
import { OFFER_TYPES, discountPercent } from "../data/topics";

const SORTS = [
  { id: "recommended", label: "Recommended" },
  { id: "ending", label: "Ending soon" },
  { id: "discount", label: "Highest % off" },
];

const sorters = {
  recommended: (a, b) => Number(b.featured) - Number(a.featured),
  ending: (a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity),
  discount: (a, b) => discountPercent(b.discount) - discountPercent(a.discount),
};

// Topic page: every coupon, deal, bank offer and cashback for one topic, with
// filters by offer type and store, and sorting. Each offer card has its own
// "View Deal" that opens the matching products on the store's site.
function TopicOffers({ topic, offers, renderDealCard }) {
  const [type, setType] = useState("all");
  const [store, setStore] = useState("all");
  const [sort, setSort] = useState("recommended");

  const stores = [...new Set(offers.map((offer) => offer.store))];
  const matches = (offer, typeId, storeName) =>
    (typeId === "all" || offer.type === typeId) && (storeName === "all" || offer.store === storeName);

  const visible = offers.filter((offer) => matches(offer, type, store)).sort(sorters[sort]);

  const hasFilters = type !== "all" || store !== "all";
  const clearFilters = () => {
    setType("all");
    setStore("all");
  };

  return (
    <>
      <section className={`topic-hero tone-${toneFor(topic.category)}`}>
        <span className="topic-hero__icon" aria-hidden="true">{topic.icon}</span>
        <div>
          <p className="eyebrow">{topic.category}</p>
          <h1>{topic.name} offers</h1>
        </div>
      </section>

      <section className="topic-filters" aria-label="Filter offers">
        <div className="topic-filters__row">
          <label className="topic-filters__field">
            <span className="sr-only">Offer type</span>
            <select className="input" value={type} onChange={(event) => setType(event.target.value)}>
              {[{ id: "all", label: "All offers" }, ...OFFER_TYPES].map((option) => {
                const count = offers.filter((offer) => matches(offer, option.id, store)).length;
                return (
                  <option key={option.id} value={option.id} disabled={count === 0 && type !== option.id}>
                    {option.label} ({count})
                  </option>
                );
              })}
            </select>
          </label>

          <label className="topic-filters__field">
            <span className="sr-only">Store</span>
            <select className="input" value={store} onChange={(event) => setStore(event.target.value)}>
              {["all", ...stores].map((name) => {
                const count = offers.filter((offer) => matches(offer, type, name)).length;
                return (
                  <option key={name} value={name} disabled={count === 0 && store !== name}>
                    {name === "all" ? "All stores" : name} ({count})
                  </option>
                );
              })}
            </select>
          </label>

          <label className="topic-filters__field topic-filters__sort">
            <span>Sort by</span>
            <select className="input" value={sort} onChange={(event) => setSort(event.target.value)}>
              {SORTS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <p className="topic-filters__summary" aria-live="polite">
          Showing {visible.length} of {offers.length} offers
          {hasFilters && (
            <button type="button" className="link-btn" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </p>
      </section>

      {visible.length > 0 ? (
        <div className="deal-grid">{visible.map(renderDealCard)}</div>
      ) : (
        <EmptyState
          icon="search"
          title="No offers match these filters"
          action={
            <button type="button" className="btn btn--ghost" onClick={clearFilters}>
              <Icon name="x" size={16} /> Clear filters
            </button>
          }
        >
          Try another offer type or store.
        </EmptyState>
      )}

      <p className="demo-note demo-note--center">
        <Icon name="info" size={16} />
        Dummy offers for testing. Codes, bank offers and cashback have not been verified.
      </p>
    </>
  );
}

export default TopicOffers;
