// Metadata writeback for Checkout Sessions.
//
// package.json pins stripe-node 14.x, which predates checkout.sessions.update —
// so every writeback threw "stripe.checkout.sessions.update is not a function"
// and no licence key was ever stored on the order (seen in the live webhook log,
// 2026-08-22, for every product). Customers still got their key by email; the
// Stripe order just never carried it.
//
// Hit the REST endpoint directly. Stripe merges metadata keys on update, so a
// partial object never wipes what is already there. If a future SDK upgrade
// adds the method, prefer it.
async function updateSessionMetadata(stripe, sessionId, metadata) {
  const sdk = stripe && stripe.checkout && stripe.checkout.sessions;
  if (sdk && typeof sdk.update === "function") {
    return sdk.update(sessionId, { metadata });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(metadata || {})) {
    if (v === undefined || v === null) continue;
    params.append(`metadata[${k}]`, String(v));
  }

  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json.error && json.error.message) || `Stripe responded ${res.status}`);
  }
  return json;
}

module.exports = { updateSessionMetadata };
