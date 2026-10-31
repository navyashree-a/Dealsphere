import Logo from "./Logo";

function SiteFooter({ compact = false }) {
  return (
    <footer className={`site-footer ${compact ? "site-footer--compact" : ""}`}>
      {!compact && (
        <div className="site-footer__main">
          <div className="site-footer__brand">
            <Logo as="span" />
            <p>Discover deals, explore stores, and shop smarter.</p>
          </div>

          <div className="site-footer__links">
            <h3>Explore</h3>
            <a href="#home">Home</a>
            <a href="#trending-deals">Trending Deals</a>
            <a href="#stores">Popular Stores</a>
          </div>

          <div className="site-footer__links">
            <h3>Help</h3>
            <a href="mailto:support@dealsphere.example">Contact Us</a>
            <span className="site-footer__soon">FAQs coming soon</span>
          </div>
        </div>
      )}

      <div className="site-footer__bottom">
        <p>© 2026 DealSphere by Tamada Media. All rights reserved.</p>
        <p>Made for smarter shopping.</p>
      </div>
    </footer>
  );
}

export default SiteFooter;
