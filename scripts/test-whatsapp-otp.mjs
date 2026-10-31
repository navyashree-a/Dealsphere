// Checks WhatsApp sign-in codes (server/whatsappOtp.js) against a FAKE
// Pinnacle - no real messages are sent. Run: npm run test:data
import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryStore, sendOtp, verifyOtp } from "../server/whatsappOtp.js";

const PHONE = "+919876543210";
const env = {
  PINNACLE_API_URL: "https://partnersv1.pinbot.ai ",
  PINNACLE_WABA_NUMBER_ID: "123456789012345",
  PINNACLE_API_KEY: " test-key\n",
  PINNACLE_OTP_TEMPLATE: "dealsphere_login_code",
  PINNACLE_OTP_LANGUAGE: "en",
};

const post = (path, body) =>
  new Request(`http://localhost/api/otp/whatsapp/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

// Fake Pinnacle: records each call and answers like the Meta Cloud API.
const fakePinnacle = (reply = { messages: [{ id: "wamid.TEST" }] }, status = 200) => {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
    return new Response(JSON.stringify(reply), { status, headers: { "content-type": "application/json" } });
  };
  return { calls, fetch };
};

const setup = (reply, status) => {
  const pinnacle = fakePinnacle(reply, status);
  return { pinnacle, deps: { store: memoryStore(), fetch: pinnacle.fetch } };
};

const sentCode = (pinnacle) => pinnacle.calls.at(-1).body.template.components[0].parameters[0].text;

test("sends the approved template to Pinnacle in the expected format", async () => {
  const { pinnacle, deps } = setup();
  const response = await sendOtp(post("send", { phone: PHONE }), env, deps);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.expiresIn, 300);
  assert.equal(body.demoCode, undefined); // never returned when Pinnacle is configured

  const call = pinnacle.calls[0];
  assert.equal(call.url, "https://partnersv1.pinbot.ai/v3/123456789012345/messages");
  assert.equal(call.headers.apikey, "test-key"); // trimmed
  assert.equal(call.body.to, "919876543210");
  assert.equal(call.body.template.name, "dealsphere_login_code");
  assert.equal(call.body.template.language.code, "en");
  const [bodyPart, button] = call.body.template.components;
  assert.match(bodyPart.parameters[0].text, /^\d{6}$/);
  assert.deepEqual(button, { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: bodyPart.parameters[0].text }] });
});

test("the right code signs in once; it can't be reused", async () => {
  const { pinnacle, deps } = setup();
  await sendOtp(post("send", { phone: PHONE }), env, deps);
  const code = sentCode(pinnacle);
  const ok = await verifyOtp(post("verify", { phone: PHONE, code }), env, deps);
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).phone, PHONE);
  const again = await verifyOtp(post("verify", { phone: PHONE, code }), env, deps);
  assert.equal(again.status, 400);
});

test("wrong codes count down and lock after 5 tries", async () => {
  const { pinnacle, deps } = setup();
  await sendOtp(post("send", { phone: PHONE }), env, deps);
  const code = sentCode(pinnacle);
  const wrong = code === "000000" ? "111111" : "000000";
  for (let left = 4; left >= 1; left -= 1) {
    const r = await verifyOtp(post("verify", { phone: PHONE, code: wrong }), env, deps);
    assert.equal(r.status, 400);
    assert.match((await r.json()).error, new RegExp(`${left} attempt`));
  }
  assert.equal((await verifyOtp(post("verify", { phone: PHONE, code: wrong }), env, deps)).status, 429);
  // Even the right code no longer works after the lock.
  assert.equal((await verifyOtp(post("verify", { phone: PHONE, code }), env, deps)).status, 400);
});

test("a number can't request codes too often", async () => {
  const { deps } = setup();
  assert.equal((await sendOtp(post("send", { phone: PHONE }), env, deps)).status, 200);
  assert.equal((await sendOtp(post("send", { phone: PHONE }), env, deps)).status, 429);
});

test("if Pinnacle rejects the message, the customer gets an error and no code is stored", async () => {
  const { deps } = setup({ error: { message: "Template not found" } }, 400);
  const r = await sendOtp(post("send", { phone: PHONE }), env, deps);
  assert.equal(r.status, 502);
  assert.equal((await verifyOtp(post("verify", { phone: PHONE, code: "123456" }), env, deps)).status, 400);
});

test("a 200 reply without a message id still counts as a rejection", async () => {
  const { deps } = setup({ message: "Authentication Failed" }, 200);
  assert.equal((await sendOtp(post("send", { phone: PHONE }), env, deps)).status, 502);
});

test("bad numbers are refused before anything is sent", async () => {
  const { pinnacle, deps } = setup();
  for (const phone of ["", "12345", "+0123456789", "not a number"]) {
    assert.equal((await sendOtp(post("send", { phone }), env, deps)).status, 400, phone);
  }
  assert.equal(pinnacle.calls.length, 0);
});

test("without Pinnacle settings: live answers 'not set up', local shows a labelled demo code", async () => {
  const live = await sendOtp(post("send", { phone: PHONE }), {}, { store: memoryStore() });
  assert.equal(live.status, 503);

  const deps = { store: memoryStore(), devFallback: true };
  const local = await (await sendOtp(post("send", { phone: PHONE }), {}, deps)).json();
  assert.match(local.demoCode, /^\d{6}$/);
  assert.equal((await verifyOtp(post("verify", { phone: PHONE, code: local.demoCode }), {}, deps)).status, 200);
});
