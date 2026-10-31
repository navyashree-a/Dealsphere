// Talks to the backend's session and saved-deals endpoints (server/userApi.js).
// The session itself is an HttpOnly cookie set by the server after a WhatsApp
// code is verified - this file never sees the token.

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

// The signed-in phone number from the session cookie, or "" if none.
export const fetchSession = () =>
  request("/api/session")
    .then((data) => data.phone || "")
    .catch(() => "");

export const endServerSession = () => request("/api/session/logout", { method: "POST" }).catch(() => {});

export const fetchSavedIds = () => request("/api/me/saved").then((data) => data.ids || []);

export const saveSavedIds = (ids) => request("/api/me/saved", { method: "PUT", body: JSON.stringify({ ids }) });
