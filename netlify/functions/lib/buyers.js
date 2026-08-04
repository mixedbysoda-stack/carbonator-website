// Buyer lookup — shared by the drip functions.
//
// A lead who buys stays in the `leads` store forever. Without this guard the
// drip keeps sending purchase pitches ("$20, no subscription") to people who
// already own the plugin. Observed in production on the APD 3-in-1 bundle
// buyers, who received Carbonator drip mail in July 2026 after buying
// Carbonator as part of the bundle.
//
// Keys in the `buyers` store are written by stripe-webhook.js as
// `buyer_<email>` with a record containing `email`.

const { getBlobStore } = require("./store");

/**
 * Returns a Set of lowercased buyer email addresses.
 *
 * Sources, unioned:
 *   1. the `buyers` blob store (fast, but stripe-webhook.js writes it inside a
 *      swallow-all try/catch, so a silent write failure leaves gaps)
 *   2. live Stripe succeeded charges (authoritative)
 *
 * Depending on the blob store alone is the same fragility that let the APD
 * bundle buyers keep receiving Carbonator purchase pitches. Stripe is the
 * source of truth for "has this person paid us".
 *
 * Never throws — on total failure it returns an empty Set. Callers MUST treat
 * an empty Set as "unknown", not as "there are no buyers".
 */
async function loadBuyerEmails() {
  const emails = new Set();

  try {
    const store = getBlobStore("buyers");
    const { blobs } = await store.list();

    for (const blob of blobs) {
      // Prefer the record body; fall back to parsing the key so a malformed
      // record still suppresses mail rather than letting it through.
      let email = null;
      try {
        const rec = await store.get(blob.key, { type: "json" });
        email = rec && rec.email;
      } catch {
        email = null;
      }
      if (!email && blob.key && blob.key.startsWith("buyer_")) {
        email = blob.key.slice("buyer_".length);
      }
      if (email) emails.add(String(email).trim().toLowerCase());
    }
  } catch (err) {
    console.error("loadBuyerEmails: blob store lookup failed:", err.message);
  }

  // Authoritative pass — live Stripe.
  //
  // TWO sources are required, and missing the second one is a real bug we hit:
  //   charges           — normal paid orders. Guest checkouts have no customer
  //                       object, so read the email off the charge itself.
  //   checkout sessions — a 100%-off coupon redemption creates NO charge object
  //                       at all. The APD bundle buyers exist only as $0 paid
  //                       checkout sessions. They own the plugins, so they must
  //                       count as buyers or they keep getting sold what they
  //                       already have.
  if (process.env.STRIPE_SECRET_KEY) {
    const Stripe = require("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const collect = async (label, fetchPage, extract) => {
      try {
        let startingAfter;
        for (let page = 0; page < 10; page++) {
          const params = { limit: 100 };
          if (startingAfter) params.starting_after = startingAfter;
          const res = await fetchPage(params);

          for (const obj of res.data || []) {
            const email = extract(obj);
            if (email) emails.add(String(email).trim().toLowerCase());
          }

          if (!res.has_more || !res.data.length) break;
          startingAfter = res.data[res.data.length - 1].id;
        }
      } catch (err) {
        console.error(`loadBuyerEmails: ${label} lookup failed:`, err.message);
      }
    };

    await collect(
      "charges",
      (p) => stripe.charges.list(p),
      (ch) =>
        ch.status === "succeeded"
          ? (ch.billing_details && ch.billing_details.email) || ch.receipt_email
          : null
    );

    await collect(
      "checkout sessions",
      (p) => stripe.checkout.sessions.list(p),
      (s) =>
        s.payment_status === "paid"
          ? (s.customer_details && s.customer_details.email) || null
          : null
    );
  }

  return emails;
}

module.exports = { loadBuyerEmails };
