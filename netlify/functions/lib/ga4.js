const GA4_MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID || "G-Z9L20HJ4M0";

function decodeClientReference(reference) {
  if (!reference || !reference.startsWith("ca_")) return null;
  try {
    return Buffer.from(reference.slice(3), "base64url").toString("utf8");
  } catch {
    return null;
  }
}

async function reportPurchase({ clientId, transactionId, product, amountCents, currency }) {
  const secret = process.env.GA4_API_SECRET;
  if (!secret || !clientId) return { skipped: true };

  const value = (amountCents || 0) / 100;
  const response = await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(GA4_MEASUREMENT_ID)}&api_secret=${encodeURIComponent(secret)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        events: [{
          name: "purchase",
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
  return { sent: true };
}

module.exports = { decodeClientReference, reportPurchase };
