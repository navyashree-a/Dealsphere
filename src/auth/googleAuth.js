// Google Identity Services ("Sign in with Google") helpers.
//
// The OAuth Client ID is public configuration, not a secret. It is set once,
// as GOOGLE_CLIENT_ID in wrangler.toml, and vite.config.js passes it to the
// website as VITE_GOOGLE_CLIENT_ID (.env.local can override it locally).
// Without it, the Google button explains that sign-in isn't set up instead of
// pretending to sign the customer in.
//
// The ID token Google returns is never trusted here: the button sends it to
// the server (server/googleAuth.js), which checks Google's signature, the
// Client ID and expiry before starting a session.

export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

export const isGoogleConfigured = () => GOOGLE_CLIENT_ID.length > 0;

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let scriptPromise = null;

export const loadGoogleScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () =>
      window.google?.accounts?.id ? resolve(window.google) : reject(new Error("Google sign-in failed to initialise."));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Couldn't reach Google. Check your connection and try again."));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
};

// Stops Google from silently re-selecting the account after sign-out.
export const googleSignOut = () => {
  window.google?.accounts?.id?.disableAutoSelect();
};
