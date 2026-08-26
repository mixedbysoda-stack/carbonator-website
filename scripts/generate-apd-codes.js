#!/usr/bin/env node
/*
 * Mint single-use Stripe promotion codes for a partner campaign and export a CSV.
 *
 *   printf 'Stripe secret key: '; read -rs STRIPE_SECRET_KEY; echo; export STRIPE_SECRET_KEY
 *   node scripts/generate-apd-codes.js --count=500
 *
 * That form works in both bash and zsh and keeps the key out of your shell
 * history. `read -s -p` is bash-only; in zsh -p means read from a coprocess.
 * Do not paste the key as a literal on the command line.
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
 * run dies at 300 of 500 you run it again and it finishes the remaining 200.
 *
 * No dependencies on purpose. This has to work on a machine where npm install
 * has not been run, and it pins nothing, so it keeps working when the Stripe SDK
 * or the account's default API version moves.
 *
 * Why the odd alphabet: no O/0 or I/1. These codes get read off a screen and
 * retyped by hand, and the June campaign generated support mail from exactly
 * that kind of confusion.
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const crypto = require("crypto");

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
const EXPIRES_DAY = args.expires || "2026-12-31";
const EXPIRES_AT = Math.floor(new Date(`${EXPIRES_DAY}T23:59:59Z`).getTime() / 1000);

if (!Number.isFinite(COUNT) || COUNT < 1 || COUNT > 5000) {
  console.error("--count must be between 1 and 5000");
  process.exit(1);
}
if (!Number.isFinite(EXPIRES_AT)) {
  console.error("--expires must be YYYY-MM-DD");
  process.exit(1);
}

function randomChunk(n) {
  const bytes = crypto.randomBytes(n);
  let out = "";
  for (let i = 0; i < n; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
function newCode() {
  return `${PREFIX}-${randomChunk(4)}-${randomChunk(4)}`;
}

function stripe(method, endpoint, form) {
  const body = form
    ? Object.entries(form)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&")
    : "";
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: "api.stripe.com",
        path: endpoint,
        method,
        headers: {
          Authorization: "Bearer " + process.env.STRIPE_SECRET_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let parsed;
          try { parsed = JSON.parse(data); } catch { return reject(new Error(`Bad response: ${data.slice(0, 200)}`)); }
          if (res.statusCode >= 400) {
            const e = new Error(parsed.error?.message || `HTTP ${res.statusCode}`);
            e.statusCode = res.statusCode;
            e.stripeCode = parsed.error?.code;
            return reject(e);
          }
          resolve(parsed);
        });
      }
    );
    req.on("error", reject);
    req.end(body);
  });
}

// Newer Stripe API versions replaced the flat `coupon` param on promotion codes
// with a nested `promotion` object. Detect once, then stick with what worked.
let promotionParams = null;
function couponParams(shape) {
  return shape === "nested"
    ? { "promotion[type]": "coupon", "promotion[coupon]": COUPON }
    : { coupon: COUPON };
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
    console.log(`Dry run. ${remaining} codes, expiring ${EXPIRES_DAY}:`);
    const seen = new Set();
    while (seen.size < remaining) seen.add(newCode());
    [...seen].slice(0, 10).forEach((c) => console.log("  " + c));
    if (remaining > 10) console.log(`  ... and ${remaining - 10} more`);
    console.log("\nNo Stripe calls were made. Drop --dry-run to mint for real.");
    return;
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error(
      "STRIPE_SECRET_KEY is not set. Run (bash or zsh):\n" +
      "  printf 'Stripe secret key: '; read -rs STRIPE_SECRET_KEY; echo; export STRIPE_SECRET_KEY"
    );
    process.exit(1);
  }
  if (/\.\.\.|^sk_live_\.{3}$/.test(key) || key.length < 20) {
    console.error("STRIPE_SECRET_KEY looks like a placeholder, not a real key.");
    process.exit(1);
  }

  // Fail early and loudly rather than minting 500 codes onto a coupon that is
  // expired, deleted, or pointed at the wrong products.
  const coupon = await stripe("GET", `/v1/coupons/${encodeURIComponent(COUPON)}?expand[]=applies_to`);
  if (!coupon.valid) {
    console.error(`Coupon ${COUPON} is not valid (expired or fully redeemed). Aborting.`);
    process.exit(1);
  }
  const products = coupon.applies_to?.products;
  console.log(`Coupon: ${coupon.name} (${coupon.percent_off}% off)`);
  if (products?.length) {
    console.log(`Restricted to products: ${products.join(", ")}`);
  } else {
    console.log("WARNING: this coupon is not restricted to any product. A leaked code could be spent on anything in the store.");
  }
  console.log(`Minting ${remaining} codes, expiring ${EXPIRES_DAY}\n`);

  const stream = fs.createWriteStream(OUT, { flags: "a" });
  let made = 0;
  let collisions = 0;

  async function mintOne() {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = newCode();
      if (existing.has(code)) continue;
      const shape = promotionParams || "flat";
      try {
        await stripe("POST", "/v1/promotion_codes", {
          ...couponParams(shape),
          code,
          max_redemptions: 1,
          expires_at: EXPIRES_AT,
          "metadata[partner]": "audio_plugin_deals",
          "metadata[campaign]": COUPON,
        });
        promotionParams = shape;
        existing.add(code);
        stream.write(code + "\n");
        made++;
        if (made % 50 === 0) console.log(`  ${made}/${remaining}`);
        return;
      } catch (err) {
        if (/already exists/i.test(err.message)) { collisions++; continue; }
        if (shape === "flat" && /promotion/i.test(err.message) && err.statusCode === 400) {
          promotionParams = "nested";
          continue;
        }
        if (err.statusCode === 429) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
    throw new Error("Gave up after 8 attempts on one code.");
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
  console.log("Send that CSV to Yemi. Do not commit it - this repo is public.");
})().catch((err) => {
  console.error("\nFailed:", err.message);
  console.error("Re-run the same command to pick up where it stopped.");
  process.exit(1);
});
