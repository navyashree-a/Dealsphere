// Checks when a price alert counts as reached (src/utils/priceAlerts.js).
// Run: npm run test:data
import { test } from "node:test";
import assert from "node:assert/strict";
import { acknowledgeAlerts, currentPrice, reachedAlertNotifications } from "../src/utils/priceAlerts.js";
import { deals } from "../src/data/deals.js";

const deal = { id: 1, title: "Shoes", store: "Amazon", price: 3000 };
const catalogAt = (price) => [{ ...deal, price }];
const alert = (fields = {}) => ({ deal, targetPrice: 2500, ...fields });

test("no notification while the price is above the target", () => {
  assert.deepEqual(reachedAlertNotifications([alert()], catalogAt(2501)), []);
});

test("notifies when the price reaches or falls below the target", () => {
  for (const price of [2500, 2000]) {
    const [n] = reachedAlertNotifications([alert()], catalogAt(price));
    assert.equal(n.read, false);
    assert.equal(n.alertDealId, 1);
    assert.match(n.message, /Shoes at Amazon/);
    assert.match(n.message, new RegExp(`₹${price.toLocaleString("en-IN")}`));
    assert.match(n.message, /target: ₹2,500/);
  }
});

test("the live price is used, not the price when the alert was set", () => {
  assert.equal(currentPrice(deal, catalogAt(2000)), 2000);
  assert.equal(reachedAlertNotifications([alert()], catalogAt(2000)).length, 1);
});

test("once acknowledged it stays quiet, until the price falls further", () => {
  const [seen] = acknowledgeAlerts([alert()], [1], catalogAt(2400));
  assert.equal(seen.seenPrice, 2400);
  assert.deepEqual(reachedAlertNotifications([seen], catalogAt(2400)), []);
  assert.deepEqual(reachedAlertNotifications([seen], catalogAt(2450)), []);
  assert.equal(reachedAlertNotifications([seen], catalogAt(2300)).length, 1);
});

test("acknowledging one alert leaves the others alone", () => {
  const other = { deal: { ...deal, id: 2 }, targetPrice: 100 };
  const [a, b] = acknowledgeAlerts([alert(), other], [1], catalogAt(2400));
  assert.equal(a.seenPrice, 2400);
  assert.equal(b.seenPrice, undefined);
});

test("a deal with no known price never notifies", () => {
  const noPrice = { ...deal, price: null };
  assert.deepEqual(reachedAlertNotifications([{ deal: noPrice, targetPrice: 100 }], [noPrice]), []);
});

test("every live dummy offer has a price to compare against", () => {
  assert.ok(deals.length > 50);
  deals.forEach((d) => assert.ok(d.price > 0, `deal ${d.id} has no price`));
});
