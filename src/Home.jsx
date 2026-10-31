import { useState, useEffect, useMemo } from "react";
import TopBar from "./components/TopBar";
import DealCard from "./components/DealCard";
import CouponCode from "./components/CouponCode";
import EmptyState from "./components/EmptyState";
import SiteFooter from "./components/SiteFooter";
import Icon from "./components/Icon";
import useTilt from "./components/useTilt";
import ViewDealLink from "./components/ViewDealLink";
import StoreLogo from "./components/StoreLogo";
import DotPattern from "./components/DotPattern";
import TopicCard from "./components/TopicCard";
import TopicOffers from "./components/TopicOffers";
import { categories, stores, toneFor } from "./data/deals";
import { useDeals } from "./data/dealsContext";
import { OFFER_TIME_ZONE, expiryLabel } from "./data/feeds/normalizeFeed";
import { offerTypeLabel, summarizeTopics } from "./data/topics";

const PAGE_SIZE = 9;

const formatExpiry = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: OFFER_TIME_ZONE });

const navLinks = [
  { href: "#home", label: "Home" },
  { href: "#trending-deals", label: "Trending Deals" },
  { href: "#stores", label: "Stores" },
];

const searchSuggestions = ["Myntra", "Amazon", "Travel", "Beauty"];

const scrollToId = (id) => {
  setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 0);
};

function Home({
  onOpenWishlist,
  onSaveDeal,
  onRemoveDeal,
  savedDeals = [],
  initialDeal = null,
  onDealOpened,
  initialTopicId = null,
  onTopicOpened,
  onRequestTopicSignIn,
  isLoggedIn = false,
  onOpenProfile,
  onSetAlert,
  priceAlerts = [],
  unreadCount = 0,
  onOpenNotifications,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDeal, setSelectedDeal] = useState(initialDeal);
  const [selectedTopicId, setSelectedTopicId] = useState(initialTopicId);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const searchDeals = useDeals();
  const topicSummaries = useMemo(() => summarizeTopics(searchDeals), [searchDeals]);
  // Topic offer pages are only shown to signed-in customers.
  const selectedTopic = isLoggedIn ? topicSummaries.find((topic) => topic.id === selectedTopicId) || null : null;
  const stageTilt = useTilt(10);

  useEffect(() => {
    if (onDealOpened) {
      onDealOpened();
    }
    if (onTopicOpened) {
      onTopicOpened();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedDeal || selectedTopicId) {
      window.scrollTo(0, 0);
    }
  }, [selectedDeal, selectedTopicId]);

  const filteredSearchDeals = searchDeals.filter((deal) => {
    const query = searchTerm.trim().toLowerCase();

    return (
      deal.title.toLowerCase().includes(query) ||
      deal.store.toLowerCase().includes(query) ||
      deal.category.toLowerCase().includes(query) ||
      deal.description.toLowerCase().includes(query) ||
      deal.code.toLowerCase().includes(query) ||
      (deal.topicName || "").toLowerCase().includes(query) ||
      (deal.partner || "").toLowerCase().includes(query)
    );
  });

  // Homepage cards are topics; opening one lists all of its offers.
  const filteredTopics =
    selectedCategory === "All"
      ? topicSummaries
      : topicSummaries.filter((topic) => topic.category === selectedCategory);

  const isSaved = (deal) => savedDeals.some((item) => item.id === deal.id);

  const toggleSave = (deal) => {
    if (isSaved(deal) && onRemoveDeal) {
      onRemoveDeal(deal.id);
    } else {
      onSaveDeal(deal);
    }
  };

  const goHome = () => {
    setSelectedDeal(null);
    setSelectedTopicId(null);
  };

  const openTopic = (topicId) => {
    if (!isLoggedIn) {
      onRequestTopicSignIn?.(topicId);
      return;
    }
    setSelectedDeal(null);
    setSelectedTopicId(topicId);
  };

  const selectCategory = (category) => {
    setSelectedCategory(category);
    setVisibleCount(PAGE_SIZE);
    goHome();
    scrollToId("trending-deals");
  };

  const topBarProps = {
    isLoggedIn,
    unreadCount,
    savedCount: savedDeals.length,
    onOpenWishlist,
    onOpenNotifications,
    onOpenProfile,
  };

  const renderDealCard = (deal) => (
    <DealCard
      key={deal.id}
      deal={deal}
      isSaved={isSaved(deal)}
      onOpen={setSelectedDeal}
      onToggleSave={toggleSave}
    />
  );

  // DEAL DETAILS PAGE
  if (selectedDeal) {
    // Same-topic offers first, then everything else.
    const otherDeals = searchDeals
      .filter((deal) => deal.id !== selectedDeal.id)
      .sort((a, b) => Number(b.topic === selectedDeal.topic) - Number(a.topic === selectedDeal.topic));
    const isPaymentOffer = selectedDeal.type === "bank_offer" || selectedDeal.type === "cashback";
    const hasAlert = priceAlerts.some((a) => a.deal.id === selectedDeal.id);
    const saved = isSaved(selectedDeal);

    return (
      <div className="page page-enter" key={selectedDeal.id}>
        <TopBar
          {...topBarProps}
          onHome={goHome}
          back={{
            label: selectedTopic ? `Back to ${selectedTopic.name}` : "Back to Deals",
            onClick: () => {
              setSelectedDeal(null);
              if (!selectedTopic) scrollToId("trending-deals");
            },
          }}
        />

        <main className="dotted">
          <DotPattern width={22} height={22} className="dot-pattern--page" />
          <div className="container">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <button type="button" onClick={goHome}>Home</button>
              <span aria-hidden="true">/</span>
              <button type="button" onClick={() => selectCategory(selectedDeal.category)}>
                {selectedDeal.category}
              </button>
              {selectedDeal.topic && (
                <>
                  <span aria-hidden="true">/</span>
                  <button type="button" onClick={() => openTopic(selectedDeal.topic)}>
                    {selectedDeal.topicName}
                  </button>
                </>
              )}
              <span aria-hidden="true">/</span>
              <span aria-current="page">{selectedDeal.store}</span>
            </nav>

            <section className={`detail-hero tone-${toneFor(selectedDeal.category)}`}>
              <div
                className="detail-stage"
                onPointerMove={stageTilt.onPointerMove}
                onPointerLeave={stageTilt.onPointerLeave}
              >
                <div className="detail-stage__ring" aria-hidden="true" />
                <div className="detail-ticket">
                  <span className="detail-ticket__emoji" aria-hidden="true">
                    {selectedDeal.icon}
                  </span>
                  <span className="detail-ticket__store">{selectedDeal.store}</span>
                  <strong className="detail-ticket__discount">{selectedDeal.discount}</strong>
                  <span className="detail-ticket__perf" aria-hidden="true" />
                  <span className="detail-ticket__code">{selectedDeal.code || "No code needed"}</span>
                </div>
                <div className="detail-stage__floor" aria-hidden="true" />
              </div>

              <div className="detail-info">
                <div className="detail-info__meta">
                  <span className="pill pill--lime">{selectedDeal.store}</span>
                  {selectedDeal.type ? (
                    <span className="pill">{offerTypeLabel(selectedDeal.type)}</span>
                  ) : (
                    <span className="pill">{selectedDeal.category}</span>
                  )}
                  {expiryLabel(selectedDeal) && <span className="pill pill--warn">{expiryLabel(selectedDeal)}</span>}
                </div>

                <h1>{selectedDeal.title}</h1>
                <p className="detail-info__desc">{selectedDeal.description}</p>
                {selectedDeal.partner && (
                  <p className="detail-partner">
                    <Icon name="wallet" size={18} />
                    Pay with <strong>{selectedDeal.partner}</strong>
                  </p>
                )}

                <div className="detail-offer">
                  <div>
                    <span className="detail-offer__label">Special offer</span>
                    <strong>{selectedDeal.discount}</strong>
                  </div>
                  <Icon name="tag" size={34} />
                </div>

                <p className="field-label">{selectedDeal.code ? "Your coupon code" : "No coupon code needed"}</p>
                <CouponCode code={selectedDeal.code} size="lg" deal={selectedDeal} />

                <div className="detail-actions">
                  <ViewDealLink deal={selectedDeal} variant="detail" />
                  <button
                    type="button"
                    className={`btn ${hasAlert ? "btn--ghost" : "btn--dark"}`}
                    onClick={() => onSetAlert(selectedDeal)}
                  >
                    <Icon name="bell" size={18} />
                    {hasAlert ? "Edit Price Alert" : "Set Price Alert"}
                  </button>
                  <button
                    type="button"
                    className={`btn btn--ghost ${saved ? "is-on" : ""}`}
                    onClick={() => toggleSave(selectedDeal)}
                    aria-pressed={saved}
                  >
                    <Icon name="heart" size={18} filled={saved} />
                    {saved ? "Saved" : "Save Deal"}
                  </button>
                </div>

                <p className="demo-note">
                  <Icon name="info" size={16} />
                  Demo offer. The coupon code and discount have not been verified.
                </p>
              </div>
            </section>

            <section className="detail-blocks">
              <div className="info-block">
                <span className="info-block__icon"><Icon name="store" /></span>
                <h2>About This Offer</h2>
                <p>
                  Explore {selectedDeal.category.toLowerCase()} offers from{" "}
                  {selectedDeal.store}. This demonstration page provides the offer
                  information and coupon code in one place.
                </p>
              </div>

              <div className="info-block info-block--wide">
                <span className="info-block__icon"><Icon name="sparkle" /></span>
                <h2>How to Use This Coupon</h2>
                {isPaymentOffer ? (
                  <ol className="steps">
                    <li>Select View Deal to open the store.</li>
                    <li>Add your desired products to the shopping cart.</li>
                    <li>At payment, pay with {selectedDeal.partner}.</li>
                    <li>
                      {selectedDeal.type === "cashback"
                        ? "The cashback is credited after the order, as per the terms."
                        : "The discount is applied at payment if the order is eligible."}
                    </li>
                  </ol>
                ) : selectedDeal.code ? (
                  <ol className="steps">
                    <li>Copy the coupon code above.</li>
                    <li>Visit the relevant store's website or mobile app.</li>
                    <li>Add your desired products to the shopping cart.</li>
                    <li>Enter the coupon code at checkout and check whether the discount applies.</li>
                  </ol>
                ) : (
                  <ol className="steps">
                    <li>Select View Deal to open the store.</li>
                    <li>Add your desired products to the shopping cart.</li>
                    <li>The offer price is shown by the store; no code is needed.</li>
                  </ol>
                )}
              </div>

              <div className="info-block">
                <span className="info-block__icon"><Icon name="shield" /></span>
                <h2>Terms &amp; Conditions</h2>
                <ul className="bullets">
                  {selectedDeal.expiresAt && <li>Valid until {formatExpiry(selectedDeal.expiresAt)}.</li>}
                  {selectedDeal.minOrder && <li>Minimum order ₹{selectedDeal.minOrder.toLocaleString("en-IN")}.</li>}
                  {(selectedDeal.terms || []).map((term) => <li key={term}>{term}</li>)}
                  <li>This offer is sample content for demonstration.</li>
                  <li>Actual eligibility may depend on the store and products purchased.</li>
                  <li>Minimum order values or other restrictions may apply.</li>
                  <li>Coupon validity and availability have not been verified.</li>
                </ul>
              </div>
            </section>

            <section className="section">
              <div className="section-head">
                <div>
                  <p className="eyebrow">More to explore</p>
                  <h2>You May Also Like</h2>
                  <p>Discover offers in other categories.</p>
                </div>
              </div>
              <div className="deal-grid">{otherDeals.slice(0, 3).map(renderDealCard)}</div>
            </section>
          </div>
        </main>

        <SiteFooter compact />
      </div>
    );
  }

  // TOPIC PAGE: every coupon, deal, bank offer and cashback for one topic
  if (selectedTopic) {
    return (
      <div className="page page-enter" key={selectedTopic.id}>
        <TopBar
          {...topBarProps}
          onHome={goHome}
          back={{
            label: "Back to Deals",
            onClick: () => {
              setSelectedTopicId(null);
              scrollToId("trending-deals");
            },
          }}
        />

        <main className="dotted">
          <DotPattern width={22} height={22} className="dot-pattern--page" />
          <div className="container">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <button type="button" onClick={goHome}>Home</button>
              <span aria-hidden="true">/</span>
              <button type="button" onClick={() => selectCategory(selectedTopic.category)}>
                {selectedTopic.category}
              </button>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{selectedTopic.name}</span>
            </nav>

            <TopicOffers
              topic={selectedTopic}
              offers={searchDeals.filter((deal) => deal.topic === selectedTopic.id)}
              renderDealCard={renderDealCard}
            />
          </div>
        </main>

        <SiteFooter compact />
      </div>
    );
  }

  // HOMEPAGE
  const heroTopics = topicSummaries.slice(0, 3);

  return (
    <div className="page page-enter">
      <TopBar
        {...topBarProps}
        onHome={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        navLinks={navLinks}
      />

      <main className="dotted">
        {/* Faint page-wide grid. It shares main's origin with the hero layers,
            so every dot lines up exactly where the two overlap. */}
        <DotPattern width={22} height={22} className="dot-pattern--page" />

        <section className="hero-band" id="home">
          {/* Grey base grid plus two sparse lime layers. Their periods are
              multiples of the 22px grid, so accents always sit on grid points
              but combine into an irregular scatter. */}
          <DotPattern width={22} height={22} className="dot-pattern--hero" />
          <DotPattern
            width={154}
            height={154}
            cr={1.5}
            className="dot-pattern--hero dot-pattern--accent"
          />
          <DotPattern
            width={242}
            height={242}
            x={88}
            y={44}
            cr={1.5}
            className="dot-pattern--hero dot-pattern--accent dot-pattern--accent-late"
          />

          <div className="hero container">
            <div className="hero__copy">
              <p className="eyebrow eyebrow--pill">
                <Icon name="sparkle" size={14} /> Smart shopping starts here
              </p>

              <h1 className="hero__title">
                Discover Deals.
                <br />
                <span className="hero__accent">Save More.</span>
              </h1>

              <p className="hero__lead">
                Find exciting offers, explore popular stores, and make smarter
                shopping decisions — all in one place.
              </p>

              <form
                className="search"
                role="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  scrollToId("search-results");
                }}
              >
                <Icon name="search" className="search__icon" />
                <label htmlFor="deal-search" className="sr-only">
                  Search products, stores, or coupons
                </label>
                <input
                  id="deal-search"
                  type="search"
                  placeholder="Search products, stores, or coupons..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  autoComplete="off"
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="search__clear"
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear search"
                  >
                    <Icon name="x" size={16} />
                  </button>
                )}
                <button type="submit" className="btn btn--lime search__submit">
                  Search
                </button>
              </form>

              <div className="suggestions">
                <span>Try:</span>
                {searchSuggestions.map((term) => (
                  <button
                    key={term}
                    type="button"
                    className="chip-btn"
                    onClick={() => {
                      setSearchTerm(term);
                      scrollToId("search-results");
                    }}
                  >
                    {term}
                  </button>
                ))}
              </div>

              <dl className="hero__stats">
                <div>
                  <dt>Demo offers</dt>
                  <dd>{searchDeals.length}</dd>
                </div>
                <div>
                  <dt>Categories</dt>
                  <dd>{categories.length}</dd>
                </div>
                <div>
                  <dt>Popular stores</dt>
                  <dd>{stores.length}</dd>
                </div>
              </dl>
            </div>

            <div className="hero-scene" aria-label="Featured deals">
              <div className="hero-scene__orbit" aria-hidden="true" />
              <div className="hero-scene__orbit hero-scene__orbit--tilted" aria-hidden="true" />
              <div className="orb" aria-hidden="true">
                <span className="orb__shine" />
                <span className="orb__symbol">%</span>
              </div>
              <div className="orb__shadow" aria-hidden="true" />

              {/* Decorative only: the topic cards below are where offers open. */}
              {heroTopics.map((topic, index) => (
                <div
                  key={topic.id}
                  className={`float-ticket float-ticket--${index + 1} tone-${toneFor(topic.category)}`}
                  aria-hidden="true"
                >
                  <span className="float-ticket__emoji">{topic.icon}</span>
                  <span className="float-ticket__text">
                    <span>{topic.name}</span>
                    <strong>{topic.bestDiscount}</strong>
                  </span>
                </div>
              ))}

              <span className="spark spark--1" aria-hidden="true" />
              <span className="spark spark--2" aria-hidden="true" />
              <span className="spark spark--3" aria-hidden="true" />
            </div>
          </div>
        </section>

        {searchTerm.trim() !== "" && (
          <section className="section container section--results" id="search-results">
            <div className="section-head">
              <div>
                <p className="eyebrow">Search results</p>
                <h2>Deals matching "{searchTerm}"</h2>
                <p>{filteredSearchDeals.length} result(s) found</p>
              </div>
              <button type="button" className="btn btn--ghost" onClick={() => setSearchTerm("")}>
                <Icon name="x" size={16} /> Clear search
              </button>
            </div>

            {filteredSearchDeals.length > 0 ? (
              <div className="deal-grid">{filteredSearchDeals.map(renderDealCard)}</div>
            ) : (
              <EmptyState icon="search" title="No matching deals found">
                Try another product, store, or category.
              </EmptyState>
            )}
          </section>
        )}

        <section className="section container" id="trending-deals">
          <div className="section-head">
            <div>
              <p className="eyebrow">Don't miss out</p>
              <h2>Trending Deals</h2>
              <p>
                {selectedCategory === "All" ? (
                  "Pick a topic to see every coupon, deal, bank offer and cashback for it."
                ) : (
                  <>
                    Showing deals for: <strong>{selectedCategory}</strong>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="filter-bar" role="toolbar" aria-label="Filter deals by category">
            {["All", ...categories.map((c) => c.name)].map((name) => (
              <button
                type="button"
                key={name}
                className={`filter-pill ${selectedCategory === name ? "is-active" : ""}`}
                onClick={() => {
                  setSelectedCategory(name);
                  setVisibleCount(PAGE_SIZE);
                }}
                aria-pressed={selectedCategory === name}
              >
                {name === "All" ? "All Deals" : name}
              </button>
            ))}
          </div>

          {filteredTopics.length > 0 ? (
            <>
              <div className="deal-grid">
                {filteredTopics.slice(0, visibleCount).map((topic) => (
                  <TopicCard key={topic.id} topic={topic} onOpen={() => openTopic(topic.id)} />
                ))}
              </div>
              {filteredTopics.length > visibleCount && (
                <div className="show-more">
                  <button type="button" className="btn btn--ghost" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
                    Show more deals
                  </button>
                  <span className="show-more__count">
                    Showing {visibleCount} of {filteredTopics.length}
                  </span>
                </div>
              )}
            </>
          ) : (
            <EmptyState title="No deals found in this category">
              Pick another category to keep exploring.
            </EmptyState>
          )}

          <p className="demo-note demo-note--center">
            <Icon name="info" size={16} />
            Demo offers for layout preview only. Coupon availability and discounts
            have not been verified.
          </p>
        </section>

        <section className="section container" id="stores">
          <div className="section-head">
            <div>
              <p className="eyebrow">Your favourite brands</p>
              <h2>Popular Stores</h2>
              <p>Explore stores and discover offers for your next purchase.</p>
            </div>
          </div>

          <div className="store-grid">
            {stores.map((store) => (
              <div className={`store-card tone-${store.tone}`} key={store.name}>
                <StoreLogo store={store} />
                <div>
                  <h3>{store.name}</h3>
                  <p>{store.tagline}</p>
                </div>
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => selectCategory(store.category)}
                >
                  Explore deals <Icon name="arrowRight" size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="benefits container">
          <div className="benefits__panel">
            <DotPattern width={20} height={20} className="dot-pattern--panel" />
            <div className="benefits__intro">
              <p className="eyebrow eyebrow--lime">Why DealSphere?</p>
              <h2>Smarter Shopping Starts Here</h2>
              <p>Everything you need to make better shopping decisions.</p>
            </div>

            <div className="benefits__list">
              <div className="benefit">
                <span className="benefit__icon"><Icon name="search" /></span>
                <h3>Easy Discovery</h3>
                <p>Explore deals across categories and stores in one place.</p>
              </div>
              <div className="benefit">
                <span className="benefit__icon"><Icon name="wallet" /></span>
                <h3>Save More</h3>
                <p>Find offers that help you shop within your budget.</p>
              </div>
              <div className="benefit">
                <span className="benefit__icon"><Icon name="heart" /></span>
                <h3>Your Favourites</h3>
                <p>Save the deals you want to revisit to your wishlist.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

export default Home;
