import { useEffect, useRef, useState } from "react";
import "./App.css";
import Home from "./Home";
import TopBar from "./components/TopBar";
import DealCard from "./components/DealCard";
import EmptyState from "./components/EmptyState";
import SiteFooter from "./components/SiteFooter";
import Logo from "./components/Logo";
import Icon from "./components/Icon";
import DotPattern from "./components/DotPattern";
import CouponCode from "./components/CouponCode";
import { CouponActivityContext } from "./components/couponActivity";
import { DealAccessContext } from "./components/dealAccess";
import { topics } from "./data/topics";
import { toneFor } from "./data/deals";
import GoogleSignInButton from "./auth/GoogleSignInButton";
import WhatsAppOtpLogin from "./auth/WhatsAppOtpLogin";
import { maskPhone } from "./auth/whatsappOtp";
import { googleSignOut } from "./auth/googleAuth";
import { prepareAvatar } from "./utils/avatarImage";

function App() {
  const [page, setPage] = useState("home");
  const [showPassword, setShowPassword] = useState(false);
  const [returnPage, setReturnPage] = useState("home");
  const [savedDeals, setSavedDeals] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pendingDeal, setPendingDeal] = useState(null);
  const [dealToOpen, setDealToOpen] = useState(null);
  // Deal whose "View Deal" was clicked while signed out; reopened after sign-in.
  const [dealToView, setDealToView] = useState(null);
  // Topic page opened while signed out (id); shown after sign-in.
  const [topicToView, setTopicToView] = useState(null);
  const [topicToOpen, setTopicToOpen] = useState(null);
  const [priceAlerts, setPriceAlerts] = useState([]);
  const [alertDeal, setAlertDeal] = useState(null);
  const [alertPrice, setAlertPrice] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [authProvider, setAuthProvider] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  // Coupon history: one entry per deal the signed-in customer copied or opened.
  const [couponHistory, setCouponHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [photoStatus, setPhotoStatus] = useState(null);
  const photoInputRef = useRef(null);

  // Scroll to top whenever the screen changes.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  // Auto-hide the toast.
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const addNotification = (message) => {
    setNotifications((previous) => [
      {
        id: Date.now() + Math.random(),
        message,
        read: false,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
      ...previous,
    ]);
    setToast((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
  };

  const goAuth = (authPage) => {
    setAuthNotice("");
    setShowPassword(false);
    setPage(authPage);
  };

  const startAlert = (deal) => {
    const existing = priceAlerts.find((a) => a.deal.id === deal.id);
    setAlertDeal(deal);
    setAlertPrice(existing ? String(existing.targetPrice) : "");
    setPendingDeal(null);
    setDealToView(null);
    setTopicToView(null);

    if (isLoggedIn) {
      setPage("create-alert");
    } else {
      setReturnPage("create-alert");
      goAuth("login");
    }
  };

  const saveAlert = (e) => {
    e.preventDefault();
    const target = Number(alertPrice);
    if (!alertDeal || !target || target <= 0) return;

    setPriceAlerts((previous) => [
      ...previous.filter((a) => a.deal.id !== alertDeal.id),
      { deal: alertDeal, targetPrice: target },
    ]);
    addNotification(`Price alert set for ${alertDeal.store} at ₹${target}.`);
    setAlertDeal(null);
    setAlertPrice("");
    setPage("alerts");
  };

  const removeAlert = (dealId) => {
    setPriceAlerts((previous) => previous.filter((a) => a.deal.id !== dealId));
  };

  const displayName =
    userName || (userEmail ? userEmail.split("@")[0] : userPhone ? maskPhone(userPhone) : "DealSphere User");

  const handleSignOut = () => {
    setIsLoggedIn(false);
    setSavedDeals([]);
    setPriceAlerts([]);
    setNotifications([]);
    setCouponHistory([]);
    setHistoryFilter("all");
    setAlertDeal(null);
    setAlertPrice("");
    setPendingDeal(null);
    setDealToView(null);
    setTopicToView(null);
    setUserEmail("");
    setUserName("");
    setUserAvatar("");
    setPhotoStatus(null);
    if (authProvider === "google") googleSignOut();
    setAuthProvider("");
    setUserPhone("");
    setIsEditingName(false);
    setReturnPage("home");
    setPage("home");
  };

  // Records what a signed-in customer did with a coupon on DealSphere.
  // DealSphere can't see merchant orders, so "used" is marked by the customer.
  const recordCouponActivity = (deal, type) => {
    if (!isLoggedIn) return;
    setCouponHistory((previous) => {
      const at = new Date().toISOString();
      const existing = previous.find((entry) => entry.deal.id === deal.id);
      const updated = existing
        ? { ...existing, [type]: existing[type] + 1, lastAt: at }
        : { deal, copied: 0, visited: 0, [type]: 1, status: null, firstAt: at, lastAt: at };
      return [updated, ...previous.filter((entry) => entry.deal.id !== deal.id)];
    });
  };

  const markCouponStatus = (dealId, status) => {
    setCouponHistory((previous) =>
      previous.map((entry) =>
        entry.deal.id === dealId ? { ...entry, status: entry.status === status ? null : status } : entry
      )
    );
  };

  // Profile photo chosen from the device's gallery/files. Processed locally.
  const openPhotoPicker = () => photoInputRef.current?.click();

  const handlePhotoSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow picking the same photo again
    if (!file) return;
    setPhotoStatus({ type: "busy", text: "Updating your photo..." });
    try {
      setUserAvatar(await prepareAvatar(file));
      setPhotoStatus({ type: "success", text: "Profile photo updated." });
    } catch (error) {
      setPhotoStatus({ type: "error", text: error.message });
    }
  };

  const removePhoto = () => {
    setUserAvatar("");
    setPhotoStatus({ type: "success", text: "Profile photo removed." });
  };

  const removeDeal = (dealId) => {
    setSavedDeals((previous) => previous.filter((item) => item.id !== dealId));
  };

  const addDealToWishlist = (deal) => {
    if (savedDeals.some((item) => item.id === deal.id)) return;
    setSavedDeals((previous) => [...previous, deal]);
    addNotification(`${deal.store} deal saved to your Wishlist.`);
  };

  // Shared by email and Google sign-in: completes any action the guest
  // started (e.g. saving a deal) and returns them to where they were going.
  const completeSignIn = (message) => {
    setIsLoggedIn(true);
    addNotification(message);

    if (pendingDeal) {
      addDealToWishlist(pendingDeal);
      setPendingDeal(null);
    }

    if (dealToView) {
      setDealToOpen(dealToView);
      setDealToView(null);
      setTopicToView(null);
      setPage("home");
      return;
    }

    if (topicToView) {
      setTopicToOpen(topicToView);
      setTopicToView(null);
      setPage("home");
      return;
    }

    setPage(returnPage);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setAuthProvider("email");
    completeSignIn("Welcome to DealSphere! You're signed in.");
  };

  // WhatsApp OTP sign-in (see src/auth/whatsappOtp.js for the backend contract).
  const handleWhatsAppSignIn = ({ phone, name }) => {
    setUserPhone(phone);
    setUserEmail("");
    setUserName(name || "");
    setUserAvatar("");
    setAuthProvider("whatsapp");
    completeSignIn("Welcome to DealSphere! You're signed in with WhatsApp.");
  };

  const handleGoogleSignIn = (profile) => {
    setUserEmail(profile.email);
    setUserName(profile.name);
    setUserAvatar(profile.picture);
    setAuthProvider("google");
    completeSignIn(`Welcome${profile.name ? `, ${profile.name.split(" ")[0]}` : ""}! You're signed in with Google.`);
  };

  const requireLogin = (destination) => {
    if (isLoggedIn) {
      setPage(destination);
    } else {
      setPendingDeal(null);
      setDealToView(null);
      setTopicToView(null);
      setReturnPage(destination);
      goAuth("login");
    }
  };

  // "View Deal" while signed out: sign in first, then come back to the deal.
  const requestSignInForDeal = (deal) => {
    setPendingDeal(null);
    setTopicToView(null);
    setDealToView(deal);
    setReturnPage("home");
    goAuth("login");
  };

  // Topic offer pages are for signed-in customers too.
  const requestSignInForTopic = (topicId) => {
    setPendingDeal(null);
    setDealToView(null);
    setTopicToView(topicId);
    setReturnPage("home");
    goAuth("login");
  };

  const openDeal = (deal) => {
    setDealToOpen(deal);
    setPage("home");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = (id) =>
    setNotifications((previous) =>
      previous.map((item) => (item.id === id ? { ...item, read: true } : item))
    );

  // Shared frame for the signed-in screens.
  const renderShell = ({ active, back, children }) => (
    <div className="page page-enter" key={page}>
      <TopBar
        onHome={() => setPage("home")}
        back={back}
        active={active}
        isLoggedIn={isLoggedIn}
        unreadCount={unreadCount}
        savedCount={savedDeals.length}
        onOpenWishlist={() => requireLogin("wishlist")}
        onOpenNotifications={() => requireLogin("notifications")}
        onOpenProfile={() => requireLogin("profile")}
      />
      <main className="dotted page-main">
        <DotPattern width={22} height={22} className="dot-pattern--page" />
        <div className="container">{children}</div>
      </main>
      <SiteFooter compact />
    </div>
  );

  const backHome = { label: "Back to Home", onClick: () => setPage("home") };

  const renderPage = () => {
    if (page === "wishlist") {
      return renderShell({
        active: "wishlist",
        back: backHome,
        children:
          savedDeals.length === 0 ? (
            <EmptyState
              icon="heart"
              title="Your wishlist is empty"
              action={
                <button type="button" className="btn btn--lime" onClick={() => setPage("home")}>
                  Explore Deals <Icon name="arrowRight" size={18} />
                </button>
              }
            >
              You haven't saved any deals yet. Browse the latest offers and tap
              the heart on the ones you like.
            </EmptyState>
          ) : (
            <>
              <div className="page-head">
                <div>
                  <p className="eyebrow">Your favourites</p>
                  <h1>My Wishlist</h1>
                  <p>You have saved {savedDeals.length} deal(s).</p>
                </div>
                <button type="button" className="btn btn--ghost" onClick={() => setPage("home")}>
                  Browse More Deals <Icon name="arrowRight" size={18} />
                </button>
              </div>

              <div className="deal-grid">
                {savedDeals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} onOpen={openDeal} onRemove={removeDeal} />
                ))}
              </div>

              <p className="demo-note demo-note--center">
                <Icon name="info" size={16} />
                Demo offers only. Coupon availability and discounts have not been verified.
              </p>
            </>
          ),
      });
    }

    if (page === "notifications") {
      return renderShell({
        active: "notifications",
        back: backHome,
        children: (
          <div className="narrow">
            {notifications.length === 0 ? (
              <EmptyState
                icon="bell"
                title="No notifications yet"
                action={
                  <button type="button" className="btn btn--lime" onClick={() => setPage("home")}>
                    Explore Deals <Icon name="arrowRight" size={18} />
                  </button>
                }
              >
                Save a deal or set a price alert and updates will show up here.
              </EmptyState>
            ) : (
              <>
                <div className="page-head">
                  <div>
                    <p className="eyebrow">Activity</p>
                    <h1>Notifications</h1>
                    <p>
                      <span className="pill pill--lime">{unreadCount} unread</span>
                    </p>
                  </div>
                  <div className="btn-row">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      disabled={unreadCount === 0}
                      onClick={() =>
                        setNotifications((previous) => previous.map((n) => ({ ...n, read: true })))
                      }
                    >
                      <Icon name="check" size={16} /> Mark all as read
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setNotifications([])}
                    >
                      <Icon name="trash" size={16} /> Clear all
                    </button>
                  </div>
                </div>

                <ul className="notif-list">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        className={`notif ${n.read ? "" : "is-unread"}`}
                        onClick={() => markRead(n.id)}
                        aria-label={`${n.message} ${n.read ? "" : "(unread — mark as read)"}`}
                      >
                        <span className="notif__icon" aria-hidden="true">
                          <Icon name="bell" size={18} />
                        </span>
                        <span className="notif__message">{n.message}</span>
                        <span className="notif__time">{n.time}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="demo-note demo-note--center">
              <Icon name="info" size={16} />
              Demo notifications. They are created by your actions on this page and
              are not sent by email or phone.
            </p>
          </div>
        ),
      });
    }

    if (page === "create-alert" && alertDeal) {
      const cancelAlert = () => {
        setDealToOpen(alertDeal);
        setAlertDeal(null);
        setPage("home");
      };

      return renderShell({
        back: { label: "Back to Deal", onClick: cancelAlert },
        children: (
          <div className="narrow">
            <div className={`alert-builder tone-${toneFor(alertDeal.category)}`}>
              <div className="alert-builder__preview">
                <span className="alert-builder__emoji" aria-hidden="true">{alertDeal.icon}</span>
                <span className="pill pill--light">{alertDeal.store}</span>
                <strong>{alertDeal.discount}</strong>
                <span>{alertDeal.title}</span>
              </div>

              <form className="alert-builder__form" onSubmit={saveAlert}>
                <p className="eyebrow">Price alert</p>
                <h1>Set a Price Alert</h1>
                <p className="muted">{alertDeal.title}</p>

                <label htmlFor="alert-price" className="field-label">
                  Alert me when the price drops to (₹)
                </label>
                <div className="input-affix">
                  <span aria-hidden="true">₹</span>
                  <input
                    id="alert-price"
                    className="input"
                    type="number"
                    min="1"
                    step="1"
                    value={alertPrice}
                    onChange={(e) => setAlertPrice(e.target.value)}
                    placeholder="e.g. 1999"
                    required
                    autoFocus
                  />
                </div>

                <div className="btn-row">
                  <button type="submit" className="btn btn--lime">
                    <Icon name="bell" size={18} /> Save alert
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={cancelAlert}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>

            <p className="demo-note demo-note--center">
              <Icon name="info" size={16} />
              Demo alert. Prices are not tracked and no notifications are sent yet.
            </p>
          </div>
        ),
      });
    }

    if (page === "history") {
      const formatTime = (iso) =>
        new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
      const filters = [
        { id: "all", label: "All", match: () => true },
        { id: "used", label: "Used", match: (e) => e.status === "used" },
        { id: "unmarked", label: "Not marked", match: (e) => !e.status },
        { id: "failed", label: "Didn't work", match: (e) => e.status === "failed" },
      ];
      const activeFilter = filters.find((f) => f.id === historyFilter) || filters[0];
      const visible = couponHistory.filter(activeFilter.match);
      const total = (key) => couponHistory.reduce((sum, entry) => sum + entry[key], 0);

      return renderShell({
        active: "profile",
        back: { label: "Back to Profile", onClick: () => setPage("profile") },
        children: (
          <div className="narrow">
            {couponHistory.length === 0 ? (
              <EmptyState
                icon="tag"
                title="No coupon activity yet"
                action={
                  <button type="button" className="btn btn--lime" onClick={() => setPage("home")}>
                    Explore Deals <Icon name="arrowRight" size={18} />
                  </button>
                }
              >
                Copy a coupon code or open a deal while you're signed in, and it will show up here.
              </EmptyState>
            ) : (
              <>
                <div className="page-head">
                  <div>
                    <p className="eyebrow">Your activity</p>
                    <h1>My Coupons</h1>
                    <p>{couponHistory.length} coupon(s) you've copied or opened.</p>
                  </div>
                </div>

                <dl className="coupon-summary">
                  <div>
                    <dt>Codes copied</dt>
                    <dd>{total("copied")}</dd>
                  </div>
                  <div>
                    <dt>Store visits</dt>
                    <dd>{total("visited")}</dd>
                  </div>
                  <div>
                    <dt>Marked as used</dt>
                    <dd>{couponHistory.filter((e) => e.status === "used").length}</dd>
                  </div>
                </dl>

                <div className="filter-bar" role="toolbar" aria-label="Filter coupon history">
                  {filters.map((f) => (
                    <button
                      type="button"
                      key={f.id}
                      className={`filter-pill ${activeFilter.id === f.id ? "is-active" : ""}`}
                      onClick={() => setHistoryFilter(f.id)}
                      aria-pressed={activeFilter.id === f.id}
                    >
                      {f.label} ({couponHistory.filter(f.match).length})
                    </button>
                  ))}
                </div>

                {visible.length === 0 ? (
                  <p className="muted coupon-history__none">No coupons in this filter.</p>
                ) : (
                  <ul className="coupon-history">
                    {visible.map(({ deal, copied, visited, status, lastAt }) => (
                      <li key={deal.id} className={`coupon-row tone-${toneFor(deal.category)}`}>
                        <span className="alert-row__emoji" aria-hidden="true">{deal.icon}</span>
                        <div className="coupon-row__info">
                          <span className="alert-row__store">{deal.store}</span>
                          <h3>{deal.title}</h3>
                          <p className="coupon-row__meta">
                            {copied > 0 && <span>Copied {copied}×</span>}
                            {visited > 0 && <span>Opened at merchant {visited}×</span>}
                            <span>Last activity {formatTime(lastAt)}</span>
                          </p>
                        </div>
                        <div className="coupon-row__code">
                          <CouponCode code={deal.code} size="sm" deal={deal} />
                          {status && (
                            <span className={`coupon-status coupon-status--${status}`}>
                              <Icon name={status === "used" ? "check" : "x"} size={14} />
                              {status === "used" ? "Used" : "Didn't work"}
                            </span>
                          )}
                        </div>
                        <div className="coupon-row__actions">
                          <button
                            type="button"
                            className={`chip-btn ${status === "used" ? "is-on" : ""}`}
                            aria-pressed={status === "used"}
                            onClick={() => markCouponStatus(deal.id, "used")}
                          >
                            <Icon name="check" size={15} /> I used it
                          </button>
                          <button
                            type="button"
                            className={`chip-btn ${status === "failed" ? "is-on is-on--failed" : ""}`}
                            aria-pressed={status === "failed"}
                            onClick={() => markCouponStatus(deal.id, "failed")}
                          >
                            <Icon name="x" size={15} /> Didn't work
                          </button>
                          <button type="button" className="text-btn" onClick={() => openDeal(deal)}>
                            View deal <Icon name="arrowRight" size={16} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            <p className="demo-note demo-note--center">
              <Icon name="info" size={16} />
              DealSphere can't see your orders on merchant websites, so this isn't a store order history. It lists
              coupons you copied and deals you opened here while signed in, plus anything you mark as used. Demo:
              kept only while this page stays open.
            </p>
          </div>
        ),
      });
    }

    if (page === "alerts") {
      return renderShell({
        back: { label: "Back to Profile", onClick: () => setPage("profile") },
        children: (
          <div className="narrow">
            {priceAlerts.length === 0 ? (
              <EmptyState
                icon="bell"
                title="No price alerts yet"
                action={
                  <button type="button" className="btn btn--lime" onClick={() => setPage("home")}>
                    Explore Deals <Icon name="arrowRight" size={18} />
                  </button>
                }
              >
                Open any deal and tap "Set Price Alert" to add one.
              </EmptyState>
            ) : (
              <>
                <div className="page-head">
                  <div>
                    <p className="eyebrow">Watching</p>
                    <h1>My Price Alerts</h1>
                    <p>{priceAlerts.length} active alert(s).</p>
                  </div>
                  <button type="button" className="btn btn--lime" onClick={() => setPage("home")}>
                    Browse More Deals <Icon name="arrowRight" size={18} />
                  </button>
                </div>

                <ul className="alert-list">
                  {priceAlerts.map((alert) => (
                    <li className={`alert-row tone-${toneFor(alert.deal.category)}`} key={alert.deal.id}>
                      <span className="alert-row__emoji" aria-hidden="true">{alert.deal.icon}</span>
                      <div className="alert-row__info">
                        <span className="alert-row__store">{alert.deal.store}</span>
                        <h3>{alert.deal.title}</h3>
                      </div>
                      <div className="alert-row__target">
                        <span>Target price</span>
                        <strong>₹{alert.targetPrice}</strong>
                      </div>
                      <div className="alert-row__actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => openDeal(alert.deal)}
                        >
                          View deal
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          onClick={() => removeAlert(alert.deal.id)}
                          aria-label={`Remove price alert for ${alert.deal.store}`}
                          data-tip="Remove"
                        >
                          <Icon name="trash" size={18} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="demo-note demo-note--center">
              <Icon name="info" size={16} />
              Demo alerts only. Prices are not tracked and no notifications are sent yet.
            </p>
          </div>
        ),
      });
    }

    if (page === "profile") {
      return renderShell({
        active: "profile",
        back: backHome,
        children: (
          <div className="profile">
            <section className="profile-card" data-spotlight="off">
              <div className="profile-card__banner" aria-hidden="true">
                <span className="spark spark--1" />
                <span className="spark spark--2" />
              </div>
              <div className="avatar-edit">
                <div className={`avatar-orb ${userAvatar ? "avatar-orb--photo" : ""}`} aria-hidden="true">
                  {userAvatar ? (
                    <img src={userAvatar} alt="" referrerPolicy="no-referrer" onError={() => setUserAvatar("")} />
                  ) : (
                    <span>{displayName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="avatar-edit__btn"
                  onClick={openPhotoPicker}
                  aria-label={userAvatar ? "Change profile photo" : "Add profile photo"}
                  data-tip={userAvatar ? "Change photo" : "Add photo"}
                >
                  <Icon name="camera" size={17} />
                </button>
                {/* Opens the photo gallery / file picker on the customer's device */}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                  onChange={handlePhotoSelected}
                />
              </div>

              {isEditingName ? (
                <form
                  className="profile-card__form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setUserName(nameDraft.trim());
                    setIsEditingName(false);
                  }}
                >
                  <label htmlFor="profile-name" className="field-label">Display name</label>
                  <input
                    id="profile-name"
                    className="input"
                    type="text"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    maxLength={40}
                    placeholder="Your name"
                    autoFocus
                  />
                  <div className="btn-row btn-row--center">
                    <button type="submit" className="btn btn--lime btn--sm">Save name</button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setIsEditingName(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <h1>{displayName}</h1>
                  <p className="muted">{userEmail || (userPhone && maskPhone(userPhone))}</p>
                  {authProvider === "google" && <span className="pill">Signed in with Google</span>}
                  {authProvider === "whatsapp" && <span className="pill">Signed in with WhatsApp</span>}
                  <div className="profile-card__actions">
                    <button
                      type="button"
                      className="chip-btn"
                      onClick={() => {
                        setNameDraft(displayName);
                        setIsEditingName(true);
                      }}
                    >
                      <Icon name="edit" size={15} /> Edit name
                    </button>
                    <button type="button" className="chip-btn" onClick={openPhotoPicker}>
                      <Icon name="camera" size={15} /> {userAvatar ? "Change photo" : "Add photo"}
                    </button>
                    {userAvatar && (
                      <button type="button" className="chip-btn" onClick={removePhoto}>
                        <Icon name="trash" size={15} /> Remove photo
                      </button>
                    )}
                  </div>
                </>
              )}
              <p
                className={`profile-photo-status ${photoStatus ? `is-${photoStatus.type}` : ""}`}
                role={photoStatus?.type === "error" ? "alert" : "status"}
              >
                {photoStatus?.text}
              </p>
            </section>

            <section className="profile-side">
              <div className="stat-grid">
                <button type="button" className="stat-tile" onClick={() => setPage("wishlist")}>
                  <span className="stat-tile__icon"><Icon name="heart" /></span>
                  <strong>{savedDeals.length}</strong>
                  <span>Saved deals</span>
                  <Icon name="arrowRight" size={18} className="stat-tile__arrow" />
                </button>
                <button type="button" className="stat-tile" onClick={() => setPage("alerts")}>
                  <span className="stat-tile__icon"><Icon name="bell" /></span>
                  <strong>{priceAlerts.length}</strong>
                  <span>Price alerts</span>
                  <Icon name="arrowRight" size={18} className="stat-tile__arrow" />
                </button>
                <button type="button" className="stat-tile" onClick={() => setPage("history")}>
                  <span className="stat-tile__icon"><Icon name="tag" /></span>
                  <strong>{couponHistory.length}</strong>
                  <span>My coupons</span>
                  <Icon name="arrowRight" size={18} className="stat-tile__arrow" />
                </button>
              </div>

              <div className="menu-card">
                <button type="button" className="menu-card__item" onClick={() => setPage("wishlist")}>
                  <Icon name="heart" /> <span>View Wishlist</span>
                  <Icon name="arrowRight" size={18} />
                </button>
                <button type="button" className="menu-card__item" onClick={() => setPage("alerts")}>
                  <Icon name="bell" /> <span>Price Alerts</span>
                  <Icon name="arrowRight" size={18} />
                </button>
                <button type="button" className="menu-card__item" onClick={() => setPage("history")}>
                  <Icon name="history" /> <span>My Coupons</span>
                  <Icon name="arrowRight" size={18} />
                </button>
                <button type="button" className="menu-card__item" onClick={() => setPage("notifications")}>
                  <Icon name="mail" /> <span>Notifications</span>
                  {unreadCount > 0 && <span className="pill pill--lime">{unreadCount}</span>}
                  <Icon name="arrowRight" size={18} />
                </button>
                <button
                  type="button"
                  className="menu-card__item menu-card__item--danger"
                  onClick={handleSignOut}
                >
                  <Icon name="logout" /> <span>Sign out</span>
                </button>
              </div>

              <p className="demo-note">
                <Icon name="info" size={16} />
                Demo profile. Your details are kept only while this page stays open
                and are not saved anywhere.
              </p>
            </section>
          </div>
        ),
      });
    }

    if (page === "home") {
      return (
        <Home
          key="home"
          savedDeals={savedDeals}
          isLoggedIn={isLoggedIn}
          unreadCount={unreadCount}
          onOpenNotifications={() => requireLogin("notifications")}
          onSetAlert={startAlert}
          priceAlerts={priceAlerts}
          onOpenProfile={() => requireLogin("profile")}
          initialDeal={dealToOpen}
          onDealOpened={() => setDealToOpen(null)}
          initialTopicId={topicToOpen}
          onTopicOpened={() => setTopicToOpen(null)}
          onRequestTopicSignIn={requestSignInForTopic}
          onOpenWishlist={() => requireLogin("wishlist")}
          onRemoveDeal={removeDeal}
          onSaveDeal={(deal) => {
            if (isLoggedIn) {
              addDealToWishlist(deal);
            } else {
              setPendingDeal(deal);
              setDealToView(null);
              setTopicToView(null);
              setReturnPage("home");
              goAuth("login");
            }
          }}
        />
      );
    }

    return renderAuth();
  };

  const renderAuth = () => {
    const passwordsMatch = signupPassword === confirmPassword;
    const topicName = topics.find((topic) => topic.id === topicToView)?.name;
    const authContext = dealToView
      ? `Sign in to view the ${dealToView.store} deal: ${dealToView.title}.`
      : topicName
      ? `Sign in to see all ${topicName} offers.`
      : pendingDeal
      ? `Sign in to save the ${pendingDeal.store} deal to your wishlist.`
      : returnPage === "create-alert" && alertDeal
      ? `Sign in to set a price alert for ${alertDeal.store}.`
      : returnPage !== "home"
      ? `Sign in to open your ${returnPage.replace("-", " ")}.`
      : "";

    const passwordToggle = (
      <button
        type="button"
        className="password-toggle"
        onClick={() => setShowPassword(!showPassword)}
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        <Icon name={showPassword ? "eyeOff" : "eye"} size={18} />
      </button>
    );

    return (
      <div className="auth" key={page}>
        <section className="auth__form-side dotted">
          <DotPattern width={22} height={22} className="dot-pattern--page dot-pattern--auth" />
          <div className="auth__top">
            <Logo onClick={() => setPage("home")} />
            <button type="button" className="chip-btn" onClick={() => setPage("home")}>
              <Icon name="arrowLeft" size={16} /> Browse deals
            </button>
          </div>

          <div className="auth__form page-enter" key={page}>
            {page === "login" && (
              <div>
                <p className="eyebrow">Welcome back</p>
                <h1>Good deals start here.</h1>
                <p className="auth__subtitle">Sign in to discover offers picked for you.</p>

                {authContext && (
                  <p className="notice notice--lime">
                    <Icon name="sparkle" size={16} /> {authContext}
                  </p>
                )}

                <div className="auth__social">
                  <GoogleSignInButton onSuccess={handleGoogleSignIn} />
                  <WhatsAppOtpLogin onSuccess={handleWhatsAppSignIn} />
                </div>
                <div className="auth__divider"><span>or sign in with email</span></div>

                <form onSubmit={handleLogin} className="form">
                  <div className="field">
                    <label htmlFor="login-email" className="field-label">Email address</label>
                    <input
                      id="login-email"
                      className="input"
                      type="email"
                      placeholder="you@example.com"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div className="field">
                    <div className="field-row">
                      <label htmlFor="login-password" className="field-label">Password</label>
                      <button type="button" className="link-btn" onClick={() => goAuth("forgot")}>
                        Forgot password?
                      </button>
                    </div>
                    <div className="password-field">
                      <input
                        id="login-password"
                        className="input"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        required
                      />
                      {passwordToggle}
                    </div>
                  </div>

                  <button className="btn btn--lime btn--block btn--lg" type="submit">
                    Sign in <Icon name="arrowRight" size={18} />
                  </button>
                </form>

                <p className="auth__switch">
                  New to DealSphere?{" "}
                  <button type="button" className="link-btn" onClick={() => goAuth("signup")}>
                    Create an account
                  </button>
                </p>
              </div>
            )}

            {page === "signup" && (
              <div>
                <button type="button" className="back-link" onClick={() => goAuth("login")}>
                  <Icon name="arrowLeft" size={16} /> Back to sign in
                </button>

                <p className="eyebrow">Join DealSphere</p>
                <h1>Create your account.</h1>
                <p className="auth__subtitle">Create an account and start finding great deals.</p>

                <div className="auth__social">
                  <GoogleSignInButton onSuccess={handleGoogleSignIn} mode="signup" />
                  <WhatsAppOtpLogin onSuccess={handleWhatsAppSignIn} mode="signup" />
                </div>
                <div className="auth__divider"><span>or sign up with email</span></div>

                <form
                  className="form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!passwordsMatch) return;
                    setAuthNotice("Demo only: connect a backend to create an account.");
                  }}
                >
                  <div className="field">
                    <label htmlFor="signup-name" className="field-label">Full name</label>
                    <input id="signup-name" className="input" type="text" placeholder="Your name" autoComplete="name" required />
                  </div>

                  <div className="field">
                    <label htmlFor="signup-email" className="field-label">Email address</label>
                    <input id="signup-email" className="input" type="email" placeholder="you@example.com" autoComplete="email" required />
                  </div>

                  <div className="field">
                    <label htmlFor="signup-password" className="field-label">Create password</label>
                    <div className="password-field">
                      <input
                        id="signup-password"
                        className="input"
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 8 characters"
                        minLength="8"
                        autoComplete="new-password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                      />
                      {passwordToggle}
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="confirm-password" className="field-label">Confirm password</label>
                    <input
                      id="confirm-password"
                      className={`input ${
                        confirmPassword ? (passwordsMatch ? "is-valid" : "is-invalid") : ""
                      }`}
                      type="password"
                      placeholder="Re-enter your password"
                      minLength="8"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      aria-describedby="password-message"
                      required
                    />
                    <p
                      id="password-message"
                      className={`password-message ${
                        confirmPassword ? (passwordsMatch ? "success" : "error") : ""
                      }`}
                      aria-live="polite"
                    >
                      {confirmPassword &&
                        (passwordsMatch ? "✓ Passwords match" : "✕ Passwords do not match")}
                    </p>
                  </div>

                  {authNotice && (
                    <p className="notice" role="status">
                      <Icon name="info" size={16} /> {authNotice}
                    </p>
                  )}

                  <button className="btn btn--lime btn--block btn--lg" type="submit">
                    Create account <Icon name="arrowRight" size={18} />
                  </button>
                </form>

                <p className="auth__switch">
                  Already registered?{" "}
                  <button type="button" className="link-btn" onClick={() => goAuth("login")}>
                    Sign in
                  </button>
                </p>
              </div>
            )}

            {page === "forgot" && (
              <div>
                <button type="button" className="back-link" onClick={() => goAuth("login")}>
                  <Icon name="arrowLeft" size={16} /> Back to sign in
                </button>

                <div className="reset-badge" aria-hidden="true">
                  <Icon name="mail" size={28} />
                </div>
                <p className="eyebrow">Account recovery</p>
                <h1>Forgot your password?</h1>
                <p className="auth__subtitle">
                  Enter your email address to request a password reset.
                </p>

                <form
                  className="form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setAuthNotice("Demo only: password reset requires a backend.");
                  }}
                >
                  <div className="field">
                    <label htmlFor="forgot-email" className="field-label">Email address</label>
                    <input id="forgot-email" className="input" type="email" placeholder="you@example.com" autoComplete="email" required />
                  </div>

                  {authNotice && (
                    <p className="notice" role="status">
                      <Icon name="info" size={16} /> {authNotice}
                    </p>
                  )}

                  <button className="btn btn--lime btn--block btn--lg" type="submit">
                    Send reset link <Icon name="arrowRight" size={18} />
                  </button>
                </form>
              </div>
            )}
          </div>

          <footer className="auth__footer">© 2026 DealSphere by Tamada Media. Made for smarter shopping.</footer>
        </section>

        <aside className="auth__promo" aria-label="About DealSphere">
          <DotPattern width={20} height={20} className="dot-pattern--panel" />
          <div className="auth__promo-top">
            <span><Icon name="sparkle" size={14} /> The smarter way to shop</span>
            <span className="live-dot">Offers worth finding</span>
          </div>

          <div className="promo-scene" aria-hidden="true">
            <div className="orb orb--promo">
              <span className="orb__shine" />
              <span className="orb__symbol">%</span>
            </div>
            <div className="orb__shadow orb__shadow--promo" />

            <div className="promo-ticket promo-ticket--back">
              <span>TECH20</span>
              <strong>20%</strong>
            </div>
            <div className="promo-ticket promo-ticket--front">
              <span className="promo-ticket__icon"><Icon name="sparkle" size={18} /></span>
              <div>
                <strong>A little treat for you</strong>
                <p>Your next great deal awaits.</p>
              </div>
            </div>
          </div>

          <div className="auth__promo-copy">
            <p className="eyebrow eyebrow--lime">Your next favorite find</p>
            <h2>
              Spend less.
              <br />
              Live <span>more.</span>
            </h2>
            <p>Discover deals, unlock savings, and make every purchase count.</p>

            <ul className="promo-benefits">
              <li><Icon name="check" size={16} /> Curated offers</li>
              <li><Icon name="check" size={16} /> Easy discovery</li>
              <li><Icon name="check" size={16} /> Smarter shopping</li>
            </ul>
          </div>

          <div className="auth__promo-bottom">Good deals. Good feelings.</div>
        </aside>
      </div>
    );
  };

  return (
    <>
      <CouponActivityContext.Provider value={recordCouponActivity}>
        <DealAccessContext.Provider value={{ isLoggedIn, requestSignIn: requestSignInForDeal }}>
          {renderPage()}
        </DealAccessContext.Provider>
      </CouponActivityContext.Provider>
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.id}>
            <span className="toast__icon"><Icon name="check" size={16} /></span>
            {toast.message}
          </div>
        )}
      </div>
    </>
  );
}

export default App;
