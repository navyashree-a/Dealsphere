// Google Identity Services ("Sign in with Google") helpers.
//
// The OAuth Client ID is public configuration, not a secret, so it is read
// from a Vite env variable. Set VITE_GOOGLE_CLIENT_ID in .env.local (see
// .env.example). Without it, the Google button explains that sign-in isn't
// configured instead of pretending to sign the customer in.
//
// IMPORTANT: the ID token is only decoded here to show the customer's name,
// email and photo. It is NOT verified. A real account system must send the
// token to a backend that verifies its signature, audience and expiry before
// trusting it (ARD FR-06, §18).

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

// Reads the (unverified) profile claims from a Google ID token.
export const readGoogleProfile = (credential) => {
  const payload = credential.split(".")[1];
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
  const json = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join("")
  );
  const claims = JSON.parse(json);
  return {
    email: claims.email || "",
    name: claims.name || claims.given_name || "",
    picture: claims.picture || "",
    emailVerified: Boolean(claims.email_verified),
  };
};

// Stops Google from silently re-selecting the account after sign-out.
export const googleSignOut = () => {
  window.google?.accounts?.id?.disableAutoSelect();
};
