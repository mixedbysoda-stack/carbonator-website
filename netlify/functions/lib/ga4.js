const GA4_MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID || "G-Z9L20HJ4M0";

function decodeClientReference(reference) {
  if (!reference || !reference.startsWith("ca_")) return null;
  try {
    return Buffer.from(reference.slice(3), "base64url").toString("utf8");
  } catch {
    return null;
  }
}

// A Stripe Checkout Session for a 100%-off promo code comes back with
// payment_status "paid", amount_total 0 and no payment_intent. It is a
// redemption, not a sale, and must never be reported as `purchase` -- `purchase`
// is a GA4 key event, so counting giveaways there inflates conversion rate,
// purchaser rate and ecommerce purchase counts against $0 of revenue.
// It is still worth recording, so it goes out as `free_redemption` instead.
// (The July 2026 phantom $60 was three Audio Plugin Deals redemptions like this,
// priced by an old client-side lookup table at $20 each.)
async function reportPurchase({ clientId, transactionId, product, amountCents, currency }) {
  const secret = process.env.GA4_API_SECRET;
  if (!secret || !clientId) return { skipped: true };

  const value = (amountCents || 0) / 100;
  const isSale = value > 0;
  const eventName = isSale ? "purchase" : "free_redemption";
  const response = await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(GA4_MEASUREMENT_ID)}&api_secret=${encodeURIComponent(secret)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        events: [{
          name: eventName,
          params: {
            transaction_id: transactionId,
            currency: String(currency || "usd").toUpperCase(),
            value,
            items: [{
              item_id: product.id,
              item_name: product.name,
              price: value,
              quantity: 1,
            }],
          },
        }],
      }),
    }
  );
  if (!response.ok) throw new Error(`GA4 Measurement Protocol returned ${response.status}`);
  return { sent: true, event: eventName, value };
}

module.exports = { decodeClientReference, reportPurchase };
