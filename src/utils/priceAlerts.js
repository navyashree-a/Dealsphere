// Decides which price alerts have been reached. Pure functions, so they can be
// tested without the website.
//
// An alert is { deal, targetPrice, seenPrice? }. seenPrice is the price when the
// customer last acknowledged the notification (read it or cleared it): they are
// told again only if the price falls below that, not on every visit.

export const currentPrice = (deal, catalog) => {
  const live = catalog.find((item) => item.id === deal.id);
  const price = live?.price ?? deal.price;
  return price > 0 ? price : null;
};

const isReached = (alert, catalog) => {
  const price = currentPrice(alert.deal, catalog);
  return price !== null && price <= alert.targetPrice;
};

export const isAlertReached = isReached;

const formatRupees = (amount) => `₹${amount.toLocaleString("en-IN")}`;

// Reached alerts the customer hasn't acknowledged at this price yet, as
// notifications for the bell.
export const reachedAlertNotifications = (alerts, catalog) =>
  alerts
    .filter((alert) => {
      if (!isReached(alert, catalog)) return false;
      return !(alert.seenPrice > 0) || currentPrice(alert.deal, catalog) < alert.seenPrice;
    })
    .map((alert) => ({
      id: `alert-${alert.deal.id}`,
      alertDealId: alert.deal.id,
      message: `Price alert reached: ${alert.deal.title} at ${alert.deal.store} is now ${formatRupees(
        currentPrice(alert.deal, catalog)
      )} (your target: ${formatRupees(alert.targetPrice)}).`,
      read: false,
      time: "Price alert",
    }));

// Records that the customer has acknowledged the given deals' alerts.
export const acknowledgeAlerts = (alerts, dealIds, catalog) =>
  alerts.map((alert) =>
    dealIds.includes(alert.deal.id) ? { ...alert, seenPrice: currentPrice(alert.deal, catalog) ?? alert.seenPrice } : alert
  );
