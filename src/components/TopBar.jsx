import { useState } from "react";
import Icon from "./Icon";
import Logo from "./Logo";

// Shared sticky navigation used on every signed-in and browsing screen.
function TopBar({
  onHome,
  back,
  navLinks = [],
  active,
  isLoggedIn = false,
  unreadCount = 0,
  savedCount = 0,
  onOpenWishlist,
  onOpenNotifications,
  onOpenProfile,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <div className="topbar__left">
          <Logo onClick={onHome} />
          {back && (
            <button type="button" className="chip-btn topbar__back" onClick={back.onClick}>
              <Icon name="arrowLeft" size={16} />
              <span>{back.label}</span>
            </button>
          )}
        </div>

        {navLinks.length > 0 && (
          <nav
            className={`topbar__links ${menuOpen ? "is-open" : ""}`}
            aria-label="Page sections"
          >
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                {link.label}
              </a>
            ))}
          </nav>
        )}

        <div className="topbar__actions">
          <button
            type="button"
            className={`icon-btn ${active === "wishlist" ? "is-active" : ""}`}
            onClick={onOpenWishlist}
            aria-label={`Wishlist${savedCount ? `, ${savedCount} saved` : ""}`}
            data-tip="Wishlist"
          >
            <Icon name="heart" filled={savedCount > 0} />
            {savedCount > 0 && <span className="icon-btn__count">{savedCount}</span>}
          </button>

          <button
            type="button"
            className={`icon-btn ${active === "notifications" ? "is-active" : ""}`}
            onClick={onOpenNotifications}
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
            data-tip="Notifications"
          >
            <Icon name="bell" />
            {unreadCount > 0 && (
              <span className="icon-btn__count icon-btn__count--alert">{unreadCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`profile-pill ${active === "profile" ? "is-active" : ""}`}
            onClick={onOpenProfile}
            aria-label={isLoggedIn ? "Open my profile" : "Sign in to DealSphere"}
          >
            <Icon name="user" size={18} />
            <span className="profile-pill__label">{isLoggedIn ? "Profile" : "Sign in"}</span>
          </button>

          {navLinks.length > 0 && (
            <button
              type="button"
              className="icon-btn topbar__menu"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              <Icon name={menuOpen ? "x" : "menu"} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopBar;
