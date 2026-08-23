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

/**
 * Cached wrapper around loadBuyerEmails().
 *
 * The uncached call walks up to 20 pages of Stripe (10 of charges, 10 of
 * checkout sessions) plus every record in the buyers store. That is a large
 * fixed cost to pay at the top of a scheduled function that also has a whole
 * lead store to walk, and it was a material part of why the drip passes were
 * running out of time (see lib/drip-scan.js).
 *
 * The cache is deliberately short-lived and fail-safe in one direction only:
 * a stale-but-present cache can only ever contain FEWER buyers than reality if
 * someone bought in the last few minutes, and that person is nearly always
 * already excluded by the drip's own status checks. A cache miss or a read
 * error falls through to the authoritative lookup.
 *
 * Never returns a cached EMPTY set — an empty result means "unknown", and
 * caching it would let purchase pitches through to real customers.
 */
async function loadBuyerEmailsCached(maxAgeMs = 6 * 60 * 60 * 1000) {
  const store = getBlobStore("buyers-cache");
  try {
    const cached = await store.get("emails", { type: "json" });
    const age = cached && cached.cached_at ? Date.now() - new Date(cached.cached_at).getTime() : Infinity;
    if (cached && Array.isArray(cached.emails) && cached.emails.length && age < maxAgeMs) {
      return new Set(cached.emails);
    }
  } catch (err) {
    console.error("Buyer cache read failed (falling back to a live lookup):", err.message);
  }

  const emails = await loadBuyerEmails();
  if (emails.size) {
    try {
      await store.setJSON("emails", { emails: [...emails], cached_at: new Date().toISOString() });
    } catch (err) {
      console.error("Buyer cache write failed (non-fatal):", err.message);
    }
  }
  return emails;
}

module.exports = { loadBuyerEmails, loadBuyerEmailsCached };
