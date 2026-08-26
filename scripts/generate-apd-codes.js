#!/usr/bin/env node
/*
 * Mint single-use Stripe promotion codes for a partner campaign and export a CSV.
 *
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/generate-apd-codes.js
 *
 * Options (all optional):
 *   --count=500                     how many codes to mint
 *   --coupon=APD_BUNDLE_AUG2026     coupon the codes attach to
 *   --prefix=APD                    code prefix, becomes APD-XXXX-XXXX
 *   --expires=2026-12-31            last day a code can be redeemed (end of day UTC)
 *   --out=apd-codes-<coupon>.csv    output file
 *   --dry-run                       generate and print codes without calling Stripe
 *
 * Safe to re-run. It appends to the CSV and skips codes already in it, so if the
 * run dies at 300 of 500 you just run it again and it finishes the remaining 200.
 *
 * Why the odd alphabet: no O/0 or I/1. These codes get read off a screen and
 * retyped by hand, and the June campaign generated support mail from exactly
 * that kind of confusion.
 */
const fs = require("fs");
const path = require("path");

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v === undefined ? true : v];
  })
);

const COUNT = parseInt(args.count || "500", 10);
const COUPON = args.coupon || "APD_BUNDLE_AUG2026";
const PREFIX = (args.prefix || "APD").toUpperCase();
const DRY_RUN = !!args["dry-run"];
const OUT = path.resolve(args.out || `apd-codes-${COUPON}.csv`);
const EXPIRES_AT = Math.floor(
  new Date(`${args.expires || "2026-12-31"}T23:59:59Z`).getTime() / 1000
);

if (!Number.isFinite(COUNT) || COUNT < 1 || COUNT > 5000) {
  console.error("--count must be between 1 and 5000");
  process.exit(1);
}
if (!Number.isFinite(EXPIRES_AT)) {
  console.error("--expires must be YYYY-MM-DD");
  process.exit(1);
}

function randomChunk(n) {
  const bytes = require("crypto").randomBytes(n);
  let out = "";
  for (let i = 0; i < n; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
function newCode() {
  return `${PREFIX}-${randomChunk(4)}-${randomChunk(4)}`;
}

// Resume: anything already written to the CSV is done.
const existing = new Set();
if (fs.existsSync(OUT)) {
  for (const line of fs.readFileSync(OUT, "utf8").split("\n")) {
    const code = line.split(",")[0].trim();
    if (code && code !== "code") existing.add(code);
  }
  console.log(`${OUT} already holds ${existing.size} codes, resuming.`);
} else if (!DRY_RUN) {
  fs.writeFileSync(OUT, "code\n");
}

const remaining = COUNT - existing.size;
if (remaining <= 0) {
  console.log(`Nothing to do: ${existing.size} of ${COUNT} already minted.`);
  process.exit(0);
}

(async () => {
  if (DRY_RUN) {
    console.log(`Dry run. ${remaining} codes, expiring ${args.expires || "2026-12-31"}:`);
    const seen = new Set();
    while (seen.size < remaining) seen.add(newCode());
    [...seen].slice(0, 10).forEach((c) => console.log("  " + c));
    if (remaining > 10) console.log(`  ... and ${remaining - 10} more`);
    console.log("\nNo Stripe calls were made. Drop --dry-run to mint for real.");
    return;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("STRIPE_SECRET_KEY is not set.");
    process.exit(1);
  }
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

  // Fail early and loudly rather than minting 500 codes onto a coupon that is
  // expired, deleted, or pointed at the wrong products.
  const coupon = await stripe.coupons.retrieve(COUPON, { expand: ["applies_to"] });
  if (!coupon.valid) {
    console.error(`Coupon ${COUPON} is not valid (expired or fully redeemed). Aborting.`);
    process.exit(1);
  }
  console.log(`Coupon: ${coupon.name} (${coupon.percent_off}% off)`);
  console.log(`Restricted to products: ${(coupon.applies_to?.products || ["ANY PRODUCT - check this"]).join(", ")}`);
  console.log(`Minting ${remaining} codes, expiring ${new Date(EXPIRES_AT * 1000).toISOString()}\n`);

  const stream = fs.createWriteStream(OUT, { flags: "a" });
  let made = 0;
  let collisions = 0;

  async function mintOne() {
    for (let attempt = 0; attempt < 6; attempt++) {
      const code = newCode();
      if (existing.has(code)) continue;
      try {
        await stripe.promotionCodes.create({
          coupon: COUPON,
          code,
          max_redemptions: 1,
          expires_at: EXPIRES_AT,
          metadata: { partner: "audio_plugin_deals", campaign: COUPON },
        });
        existing.add(code);
        stream.write(code + "\n");
        made++;
        if (made % 50 === 0) console.log(`  ${made}/${remaining}`);
        return;
      } catch (err) {
        if (/already exists/i.test(err.message)) { collisions++; continue; }
        if (err.type === "StripeRateLimitError" || err.statusCode === 429) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
    throw new Error("Gave up after 6 attempts on one code.");
  }

  // Small pool. Stripe's write limit is 100/s in live mode and there is no
  // reason to race it.
  const POOL = 5;
  let launched = 0;
  await Promise.all(
    Array.from({ length: POOL }, async () => {
      while (launched < remaining) { launched++; await mintOne(); }
    })
  );

  await new Promise((r) => stream.end(r));
  console.log(`\nDone. ${made} codes written to ${OUT}`);
  if (collisions) console.log(`(${collisions} random collisions retried, harmless)`);
  console.log("Send that CSV to Yemi. Do not post it anywhere public.");
})().catch((err) => {
  console.error("\nFailed:", err.message);
  console.error("Re-run the same command to pick up where it stopped.");
  process.exit(1);
});
