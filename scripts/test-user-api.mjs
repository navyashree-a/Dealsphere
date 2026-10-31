// Checks sign-in sessions and saved deals (server/session.js, server/userApi.js).
// Run: npm run test:data
import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryStore } from "../server/storage.js";
import { routeUserRequest } from "../server/userApi.js";
import { sendOtp, verifyOtp } from "../server/whatsappOtp.js";

const BASE = "https://dealsphere.pages.dev";
const PHONE = "+919876543210";

const call = (store, method, path, { cookie = "", body } = {}) =>
  routeUserRequest(
    new Request(`${BASE}${path}`, {
      method,
      headers: { "content-type": "application/json", cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    store,
  );

// Signs in through the real WhatsApp flow (local demo mode) and returns the cookie.
const signIn = async (users, phone = PHONE) => {
  const deps = { store: memoryStore(), devFallback: true, sessionStore: users };
  const post = (path, body) => new Request(`${BASE}/api/otp/whatsapp/${path}`, { method: "POST", body: JSON.stringify(body) });
  const { demoCode } = await (await sendOtp(post("send", { phone }), {}, deps)).json();
  const response = await verifyOtp(post("verify", { phone, code: demoCode }), {}, deps);
  const setCookie = response.headers.get("set-cookie");
  return { setCookie, cookie: setCookie.split(";")[0] };
};

test("a correct WhatsApp code sets a secure, HttpOnly session cookie", async () => {
  const { setCookie } = await signIn(memoryStore());
  assert.match(setCookie, /^ds_session=[a-f0-9]{64}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure$/);
});

test("the session says who is signed in; without it, 401", async () => {
  const users = memoryStore();
  const { cookie } = await signIn(users);
  assert.deepEqual(await (await call(users, "GET", "/api/session", { cookie })).json(), { phone: PHONE });
  assert.equal((await call(users, "GET", "/api/session")).status, 401);
  assert.equal((await call(users, "GET", "/api/session", { cookie: "ds_session=" + "0".repeat(64) })).status, 401);
});

test("saved deals survive sign-out and come back on the next sign-in", async () => {
  const users = memoryStore();
  const first = await signIn(users);
  assert.deepEqual((await (await call(users, "GET", "/api/me/saved", { cookie: first.cookie })).json()).ids, []);
  await call(users, "PUT", "/api/me/saved", { cookie: first.cookie, body: { ids: [103, 401] } });

  const out = await call(users, "POST", "/api/session/logout", { cookie: first.cookie });
  assert.match(out.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal((await call(users, "GET", "/api/me/saved", { cookie: first.cookie })).status, 401); // old cookie is dead

  const second = await signIn(users);
  assert.deepEqual((await (await call(users, "GET", "/api/me/saved", { cookie: second.cookie })).json()).ids, [103, 401]);
});

test("each number only sees its own saved deals", async () => {
  const users = memoryStore();
  const a = await signIn(users, "+919876543210");
  const b = await signIn(users, "+919876543211");
  await call(users, "PUT", "/api/me/saved", { cookie: a.cookie, body: { ids: [101] } });
  assert.deepEqual((await (await call(users, "GET", "/api/me/saved", { cookie: b.cookie })).json()).ids, []);
});

test("saved ids are cleaned: numbers only, no duplicates, signed-in only", async () => {
  const users = memoryStore();
  const { cookie } = await signIn(users);
  const r = await call(users, "PUT", "/api/me/saved", { cookie, body: { ids: [5, "5", 7, -1, 2.5, "x", 7] } });
  assert.deepEqual((await r.json()).ids, [5, 7]);
  assert.equal((await call(users, "PUT", "/api/me/saved", { cookie, body: { ids: "nope" } })).status, 400);
  assert.equal((await call(users, "PUT", "/api/me/saved", { body: { ids: [1] } })).status, 401);
});
