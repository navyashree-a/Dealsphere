// Checks "Sign in with Google" on the server (server/googleAuth.js): only a
// token Google signed for DealSphere's Client ID starts a session, and Google
// accounts get their own saved deals, separate from WhatsApp numbers.
// Uses a test RSA key standing in for Google's - no network, no real accounts.
// Run: npm run test:data
import { test } from "node:test";
import assert from "node:assert/strict";
import { signInWithGoogle, verifyGoogleIdToken } from "../server/googleAuth.js";
import { startSession } from "../server/session.js";
import { memoryStore } from "../server/storage.js";
import { routeUserRequest } from "../server/userApi.js";

const CLIENT_ID = "test-client.apps.googleusercontent.com";
const NOW = Date.UTC(2026, 10, 6, 6);
const nowSeconds = NOW / 1000;

const algorithm = { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" };
const googleKey = await crypto.subtle.generateKey(algorithm, true, ["sign", "verify"]);
const otherKey = await crypto.subtle.generateKey(algorithm, true, ["sign", "verify"]);
const publicJwk = { ...(await crypto.subtle.exportKey("jwk", googleKey.publicKey)), kid: "key-1", alg: "RS256", use: "sig" };
const getKeys = async () => [publicJwk];

const b64url = (bytes) => Buffer.from(bytes).toString("base64url");
const sign = async (claims = {}, { key = googleKey.privateKey, header = {} } = {}) => {
  const head = b64url(JSON.stringify({ alg: "RS256", kid: "key-1", typ: "JWT", ...header }));
  const body = b64url(
    JSON.stringify({
      iss: "https://accounts.google.com",
      aud: CLIENT_ID,
      sub: "1234567890",
      email: "shopper@example.com",
      email_verified: true,
      name: "Test Shopper",
      picture: "https://lh3.googleusercontent.com/a/test-photo",
      iat: nowSeconds - 10,
      exp: nowSeconds + 3600,
      ...claims,
    })
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(new Uint8Array(signature))}`;
};
const verify = (token) => verifyGoogleIdToken(token, { clientId: CLIENT_ID, getKeys, now: NOW });

const post = (credential, cookie = "") =>
  new Request("https://dealsphere.pages.dev/api/session/google", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ credential }),
  });
const env = { GOOGLE_CLIENT_ID: CLIENT_ID };
const cookieOf = (response) => response.headers.get("set-cookie").split(";")[0];
const call = (store, path, cookie, method = "GET", body) =>
  routeUserRequest(new Request(`https://dealsphere.pages.dev${path}`, { method, headers: { cookie, "content-type": "application/json" }, body }), store);

test("accepts a token Google signed for DealSphere", async () => {
  const claims = await verify(await sign());
  assert.equal(claims.sub, "1234567890");
  assert.equal(claims.email, "shopper@example.com");
});

test("refuses forged, expired, wrong-app and unverified tokens", async () => {
  const cases = {
    "signed by someone else": await sign({}, { key: otherKey.privateKey }),
    "edited after signing": (await sign()).replace(/\.([^.]+)\./, (_, body) => `.${b64url(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url")), email: "boss@example.com" }))}.`),
    "for a different app": await sign({ aud: "someone-else.apps.googleusercontent.com" }),
    "not from Google": await sign({ iss: "https://evil.example" }),
    expired: await sign({ exp: nowSeconds - 3600 }),
    "issued in the future": await sign({ iat: nowSeconds + 3600 }),
    "email not verified": await sign({ email_verified: false }),
    "no account id": await sign({ sub: "" }),
    "unknown key": await sign({}, { header: { kid: "key-2" } }),
    "unsigned (alg none)": (await sign({}, { header: { alg: "none" } })).replace(/\.[^.]+$/, ".x"),
    "not a token": "hello",
  };
  for (const [name, token] of Object.entries(cases)) {
    await assert.rejects(verify(token), (error) => error.invalidToken === true, name);
  }
});

test("a verified sign-in starts a session that /api/session recognises", async () => {
  const store = memoryStore();
  const response = await signInWithGoogle(post(await sign()), env, { sessionStore: store, getKeys, now: NOW });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    provider: "google",
    email: "shopper@example.com",
    name: "Test Shopper",
    picture: "https://lh3.googleusercontent.com/a/test-photo",
  });
  const cookie = response.headers.get("set-cookie");
  assert.match(cookie, /^ds_session=[a-f0-9]{64}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=\d+; Secure$/);
  const session = await call(store, "/api/session", cookieOf(response));
  assert.equal(session.status, 200);
  assert.equal((await session.json()).email, "shopper@example.com");
});

test("a rejected token starts no session", async () => {
  const store = memoryStore();
  const response = await signInWithGoogle(post(await sign({ aud: "other" })), env, { sessionStore: store, getKeys, now: NOW });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("without a Client ID, Google sign-in says it isn't set up", async () => {
  const response = await signInWithGoogle(post(await sign()), {}, { sessionStore: memoryStore(), getKeys, now: NOW });
  assert.equal(response.status, 503);
});

test("if Google's keys can't be fetched, nobody is signed in", async () => {
  const getKeysDown = async () => {
    throw new Error("network down");
  };
  const response = await signInWithGoogle(post(await sign()), env, { sessionStore: memoryStore(), getKeys: getKeysDown, now: NOW });
  assert.equal(response.status, 502);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("a photo URL from outside Google is dropped", async () => {
  const response = await signInWithGoogle(post(await sign({ picture: "https://evil.example/x.png" })), env, { sessionStore: memoryStore(), getKeys, now: NOW });
  assert.equal((await response.json()).picture, "");
});

test("Google accounts keep their own saved deals, across sign-ins, apart from WhatsApp numbers", async () => {
  const store = memoryStore();
  const signIn = async (claims) => cookieOf(await signInWithGoogle(post(await sign(claims)), env, { sessionStore: store, getKeys, now: NOW }));
  const first = await signIn({});
  await call(store, "/api/me/saved", first, "PUT", JSON.stringify({ ids: [101, 401] }));

  // Signing in again later (new session, same Google account) finds them.
  const again = await signIn({});
  assert.notEqual(again, first);
  assert.deepEqual((await (await call(store, "/api/me/saved", again)).json()).ids, [101, 401]);

  // A different Google account and a WhatsApp number each start empty.
  const other = await signIn({ sub: "999", email: "other@example.com" });
  assert.deepEqual((await (await call(store, "/api/me/saved", other)).json()).ids, []);
  const request = new Request("https://dealsphere.pages.dev/");
  const whatsapp = (await startSession(request, store, "919000000000")).split(";")[0];
  assert.deepEqual((await (await call(store, "/api/me/saved", whatsapp)).json()).ids, []);
  assert.equal((await (await call(store, "/api/session", whatsapp)).json()).phone, "919000000000");
});
