#!/usr/bin/env node
/**
 * Mint a batch of activation keys for a reseller (ADSR, Plugivery, KVR...).
 *
 * Why this exists: resellers sell our plugins on their own storefront and hand
 * the buyer a key from a batch we supply in advance. Those keys have no real
 * purchase behind them, so they cannot come out of the Stripe webhook path.
 * Before this script they were minted by hand, which is how you end up with no
 * record of which key went to which partner.
 *
 * The key format is identical to a real purchase key - activate-<product>.js
 * validates the HMAC over (emailHash || timestamp) and does not care whether
 * the email ever bought anything. So we mint against a synthetic per-key
 * identity, which also gives support a way to trace a key back to its batch
 * when a buyer writes in.
 *
 * The license secret is read from the environment and is never written to disk
 * or echoed. Run it like this (works in both bash and zsh):
 *
 *   printf 'TALLBOY_LICENSE_SECRET: '; read -rs TALLBOY_LICENSE_SECRET; echo
 *   export TALLBOY_LICENSE_SECRET
 *   node scripts/generate-reseller-keys.js --product tallboy --reseller adsr --count 25
 *
 * Output lands in <product>-<reseller>-keys.txt (one key per line, ready to
 * hand over) plus a .csv audit trail. Both are gitignored - this repo is public.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const { PRODUCTS } = require(path.join(__dirname, "..", "netlify", "functions", "config.js"));

function parseArgs(argv) {
  const out = { count: 25 };
  for (let i = 2; i < argv.length; i += 2) {
    const k = argv[i];
    const v = argv[i + 1];
    if (!k || !k.startsWith("--")) die(`Unexpected argument: ${k}`);
    if (v === undefined) die(`Missing value for ${k}`);
    out[k.slice(2)] = v;
  }
  return out;
}

function die(msg) {
  console.error(`\n  ${msg}\n`);
  process.exit(1);
}

function generateActivationKey(email, timestampMs, secret) {
  const emailHash = crypto
    .createHash("sha256")
    .update(String(email).toLowerCase().trim())
    .digest()
    .slice(0, 16);

  const timestamp = Buffer.alloc(8);
  timestamp.writeBigUInt64BE(BigInt(timestampMs));

  const payload = Buffer.concat([emailHash, timestamp]);
  const hmac = crypto
    .createHmac("sha256", Buffer.from(secret, "hex"))
    .update(payload)
    .digest()
    .slice(0, 8);

  return Buffer.concat([emailHash, timestamp, hmac])
    .toString("hex")
    .toUpperCase()
    .match(/.{8}/g)
    .join("-");
}

// Same check activate-<product>.js runs. We verify every key we mint before
// writing it out, so a bad secret fails here instead of in a buyer's DAW.
function validateActivationKey(keyHex, secret) {
  const clean = keyHex.replace(/-/g, "").toLowerCase();
  if (clean.length !== 64) return false;
  const buf = Buffer.from(clean, "hex");
  if (buf.length !== 32) return false;
  const payload = buf.slice(0, 24);
  const provided = buf.slice(24, 32);
  const expected = crypto
    .createHmac("sha256", Buffer.from(secret, "hex"))
    .update(payload)
    .digest()
    .slice(0, 8);
  return crypto.timingSafeEqual(provided, expected);
}

const args = parseArgs(process.argv);
const productId = (args.product || "").toLowerCase();
const reseller = (args.reseller || "").toLowerCase();
const count = Number(args.count);

if (!productId) die("--product is required (e.g. --product tallboy)");
if (!reseller) die("--reseller is required (e.g. --reseller adsr)");
if (!/^[a-z0-9-]+$/.test(reseller)) die("--reseller must be lowercase letters, digits or hyphens");
if (!Number.isInteger(count) || count < 1 || count > 5000) die("--count must be a whole number between 1 and 5000");

const product = PRODUCTS[productId];
if (!product) {
  die(`Unknown product "${productId}". Known: ${Object.keys(PRODUCTS).sort().join(", ")}`);
}
if (product.isBundle) die(`"${productId}" is a bundle. Mint keys per plugin instead.`);
if (!product.secretEnv) die(`"${productId}" has no secretEnv in config.js - nothing to sign with.`);

const secret = process.env[product.secretEnv];
if (!secret) {
  die(
    `${product.secretEnv} is not set.\n\n` +
    `  printf '${product.secretEnv}: '; read -rs ${product.secretEnv}; echo\n` +
    `  export ${product.secretEnv}\n` +
    `  node scripts/generate-reseller-keys.js --product ${productId} --reseller ${reseller} --count ${count}`
  );
}
if (!/^[0-9a-fA-F]+$/.test(secret) || secret.length < 32) {
  die(`${product.secretEnv} does not look like a hex secret. Copy it from Netlify env, not from a note.`);
}

// Distinct timestamps AND distinct identities, so two keys can never collide
// even if the batch is regenerated in the same millisecond.
const batchStamp = new Date().toISOString().slice(0, 10);
const rows = [];
for (let i = 1; i <= count; i += 1) {
  const seq = String(i).padStart(4, "0");
  const identity = `${reseller}-${productId}-${batchStamp}-${seq}@resellers.carbonatedaudio.com`;
  const key = generateActivationKey(identity, Date.now() + i, secret);
  if (!validateActivationKey(key, secret)) {
    die(`Key ${seq} failed its own validation check. Nothing was written. Check ${product.secretEnv}.`);
  }
  rows.push({ seq, key, identity });
}

const uniqueKeys = new Set(rows.map((r) => r.key));
if (uniqueKeys.size !== rows.length) die("Duplicate key generated. Nothing was written.");

const base = `${productId}-${reseller}-keys`;
const txtPath = path.join(process.cwd(), `${base}.txt`);
const csvPath = path.join(process.cwd(), `${base}.csv`);

fs.writeFileSync(txtPath, rows.map((r) => r.key).join("\n") + "\n", { mode: 0o600 });
fs.writeFileSync(
  csvPath,
  "seq,key,identity,product,reseller,minted\n" +
    rows.map((r) => `${r.seq},${r.key},${r.identity},${productId},${reseller},${batchStamp}`).join("\n") +
    "\n",
  { mode: 0o600 }
);

console.log(`\n  ${count} ${product.name} keys minted and each one validated.\n`);
console.log(`  Hand to ${reseller}:  ${txtPath}`);
console.log(`  Keep for support:     ${csvPath}\n`);
console.log(`  Both files are gitignored. Do not commit them.\n`);
