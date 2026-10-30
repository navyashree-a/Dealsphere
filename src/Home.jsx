import { useState, useEffect } from "react";
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
import { deals as searchDeals, categories, stores, toneFor } from "./data/deals";

const navLinks = [
  { href: "#home", label: "Home" },
  { href: "#categories", label: "Categories" },
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
  const stageTilt = useTilt(10);

  useEffect(() => {
    if (onDealOpened) {
      onDealOpened();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedDeal) {
      window.scrollTo(0, 0);
    }
  }, [selectedDeal]);

  const filteredSearchDeals = searchDeals.filter((deal) => {
    const query = searchTerm.trim().toLowerCase();

    return (
      deal.title.toLowerCase().includes(query) ||
      deal.store.toLowerCase().includes(query) ||
      deal.category.toLowerCase().includes(query) ||
      deal.description.toLowerCase().includes(query) ||
      deal.code.toLowerCase().includes(query)
    );
  });

  const filteredTrendingDeals =
    selectedCategory === "All"
      ? searchDeals
      : searchDeals.filter((deal) => deal.category === selectedCategory);

  const isSaved = (deal) => savedDeals.some((item) => item.id === deal.id);

  const toggleSave = (deal) => {
    if (isSaved(deal) && onRemoveDeal) {
      onRemoveDeal(deal.id);
    } else {
      onSaveDeal(deal);
    }
  };

  const selectCategory = (category) => {
    setSelectedCategory(category);
    setSelectedDeal(null);
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
    const otherDeals = searchDeals.filter((deal) => deal.id !== selectedDeal.id);
    const hasAlert = priceAlerts.some((a) => a.deal.id === selectedDeal.id);
    const saved = isSaved(selectedDeal);

    return (
      <div className="page page-enter" key={selectedDeal.id}>
        <TopBar
          {...topBarProps}
          onHome={() => setSelectedDeal(null)}
          back={{
            label: "Back to Deals",
            onClick: () => {
              setSelectedDeal(null);
              scrollToId("trending-deals");
            },
          }}
        />

        <main className="dotted">
          <DotPattern width={22} height={22} className="dot-pattern--page" />
          <div className="container">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <button type="button" onClick={() => setSelectedDeal(null)}>Home</button>
              <span aria-hidden="true">/</span>
              <button type="button" onClick={() => selectCategory(selectedDeal.category)}>
                {selectedDeal.category}
              </button>
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
                  <span className="detail-ticket__code">{selectedDeal.code}</span>
                </div>
                <div className="detail-stage__floor" aria-hidden="true" />
              </div>

              <div className="detail-info">
                <div className="detail-info__meta">
                  <span className="pill pill--lime">{selectedDeal.store}</span>
                  <span className="pill">{selectedDeal.category}</span>
                </div>

                <h1>{selectedDeal.title}</h1>
                <p className="detail-info__desc">{selectedDeal.description}</p>

                <div className="detail-offer">
                  <div>
                    <span className="detail-offer__label">Special offer</span>
                    <strong>{selectedDeal.discount}</strong>
                  </div>
                  <Icon name="tag" size={34} />
                </div>

                <p className="field-label">Your coupon code</p>
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
                <ol className="steps">
                  <li>Copy the coupon code above.</li>
                  <li>Visit the relevant store's website or mobile app.</li>
                  <li>Add your desired products to the shopping cart.</li>
                  <li>Enter the coupon code at checkout and check whether the discount applies.</li>
                </ol>
              </div>

              <div className="info-block">
                <span className="info-block__icon"><Icon name="shield" /></span>
                <h2>Terms &amp; Conditions</h2>
                <ul className="bullets">
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

  // HOMEPAGE
  const heroDeals = searchDeals.slice(0, 3);

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

              {heroDeals.map((deal, index) => (
                <button
                  key={deal.id}
                  type="button"
                  className={`float-ticket float-ticket--${index + 1} tone-${toneFor(deal.category)}`}
                  onClick={() => setSelectedDeal(deal)}
                  aria-label={`Open ${deal.store} deal: ${deal.discount}`}
                >
                  <span className="float-ticket__emoji" aria-hidden="true">{deal.icon}</span>
                  <span className="float-ticket__text">
                    <span>{deal.store}</span>
                    <strong>{deal.discount}</strong>
                  </span>
                </button>
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

        <section className="section container" id="categories">
          <div className="section-head">
            <div>
              <p className="eyebrow">Explore &amp; save</p>
              <h2>Shop by Category</h2>
              <p>Find the best deals in the things you love.</p>
            </div>
          </div>

          <div className="category-grid">
            {categories.map((category) => (
              <button
                type="button"
                key={category.name}
                className={`category-tile tone-${toneFor(category.name)} ${
                  selectedCategory === category.name ? "is-active" : ""
                }`}
                onClick={() => selectCategory(category.name)}
                aria-pressed={selectedCategory === category.name}
              >
                <span className="category-tile__block" aria-hidden="true">
                  {category.icon}
                </span>
                <span className="category-tile__name">{category.name}</span>
                <span className="category-tile__desc">{category.description}</span>
                <Icon name="arrowRight" size={18} className="category-tile__arrow" />
              </button>
            ))}
          </div>
        </section>

        <section className="section container" id="trending-deals">
          <div className="section-head">
            <div>
              <p className="eyebrow">Don't miss out</p>
              <h2>Trending Deals</h2>
              <p>
                {selectedCategory === "All" ? (
                  "Explore popular offers and save on your next purchase."
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
                onClick={() => setSelectedCategory(name)}
                aria-pressed={selectedCategory === name}
              >
                {name === "All" ? "All Deals" : name}
              </button>
            ))}
          </div>

          {filteredTrendingDeals.length > 0 ? (
            <div className="deal-grid">{filteredTrendingDeals.map(renderDealCard)}</div>
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
