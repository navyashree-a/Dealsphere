import { useEffect, useRef, useState } from "react";
import Icon from "../components/Icon";
import { GOOGLE_CLIENT_ID, isGoogleConfigured, loadGoogleScript, readGoogleProfile } from "./googleAuth";

// Google's multicolour "G" mark, used only on the not-configured fallback
// button. When configured, Google renders its own official button.
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.9 6.2C12.5 13.6 17.8 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7Z" />
      <path fill="#FBBC05" d="M10.6 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.2A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l8-6.2Z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.2 0-11.5-4.2-13.4-9.9l-8 6.2C6.6 42.6 14.6 48 24 48Z" />
    </svg>
  );
}

function GoogleSignInButton({ onSuccess, mode = "signin" }) {
  const slotRef = useRef(null);
  const onSuccessRef = useRef(onSuccess);
  const configured = isGoogleConfigured();
  const [status, setStatus] = useState(configured ? "loading" : "unconfigured");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (!configured) return undefined;
    let cancelled = false;

    loadGoogleScript()
      .then((google) => {
        if (cancelled || !slotRef.current) return;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          ux_mode: "popup",
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: (response) => {
            try {
              const profile = readGoogleProfile(response.credential);
              if (!profile.email) throw new Error("missing email");
              setMessage("");
              onSuccessRef.current(profile);
            } catch {
              setStatus("error");
              setMessage("Google didn't return your account details. Please try again.");
            }
          },
        });
        const width = Math.round(Math.min(400, Math.max(220, slotRef.current.offsetWidth || 320)));
        slotRef.current.replaceChildren();
        google.accounts.id.renderButton(slotRef.current, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text: mode === "signup" ? "signup_with" : "continue_with",
          logo_alignment: "left",
          width,
        });
        setStatus("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [configured, mode, attempt]);

  if (!configured) {
    return (
      <div className="google-auth">
        <button
          type="button"
          className="google-btn"
          onClick={() =>
            setMessage(
              "Sign in with Google isn't set up yet. A Google OAuth Client ID (VITE_GOOGLE_CLIENT_ID) is needed - use email for now."
            )
          }
        >
          <GoogleMark />
          {mode === "signup" ? "Sign up with Google" : "Continue with Google"}
        </button>
        {message && (
          <p className="notice" role="status">
            <Icon name="info" size={16} /> {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="google-auth">
      <div className={`google-slot ${status === "ready" ? "is-ready" : ""}`} ref={slotRef} />
      {status === "loading" && (
        <div className="google-btn google-btn--loading" aria-live="polite">
          <GoogleMark /> Loading Google sign-in…
        </div>
      )}
      {status === "error" && (
        <div className="notice notice--error" role="alert">
          <Icon name="alert" size={16} />
          <span>{message}</span>
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setMessage("");
              setStatus("loading");
              setAttempt((n) => n + 1);
            }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

export default GoogleSignInButton;
