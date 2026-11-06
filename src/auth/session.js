// Talks to the backend's session and saved-deals endpoints (server/userApi.js).
// The session itself is an HttpOnly cookie set by the server after a WhatsApp
// code or a Google sign-in is verified - this file never sees the token.

const request = async (path, options = {}) => {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || "Request failed"), { status: response.status });
  return data;
};

// Who the session cookie belongs to, or null:
// { provider: "whatsapp", phone } or { provider: "google", email, name, picture }.
export const fetchSession = () =>
  request("/api/session")
    .then((data) => (data.provider ? data : data.phone ? { provider: "whatsapp", phone: data.phone } : null))
    .catch(() => null);

// Sends Google's ID token to the server, which checks it and starts a session.
// Resolves to { provider: "google", email, name, picture }.
export const signInWithGoogleCredential = (credential) =>
  request("/api/session/google", { method: "POST", body: JSON.stringify({ credential }) });

export const endServerSession = () => request("/api/session/logout", { method: "POST" }).catch(() => {});

export const fetchSavedIds = () => request("/api/me/saved").then((data) => data.ids || []);

export const saveSavedIds = (ids) => request("/api/me/saved", { method: "PUT", body: JSON.stringify({ ids }) });

// Price alerts are stored as [{ dealId, targetPrice, seenPrice? }].
export const fetchAlerts = () => request("/api/me/alerts").then((data) => data.alerts || []);

export const saveAlerts = (alerts) => request("/api/me/alerts", { method: "PUT", body: JSON.stringify({ alerts }) });
