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
 * The license secret is never written to disk or echoed. The script prompts for
 * it itself with echo disabled, so there is nothing to export and nothing to
 * paste on a second line:
 *
 *   node scripts/generate-reseller-keys.js --product tallboy --reseller adsr --count 25
 *
 * (An earlier version of these instructions told you to run a `read -rs` line
 * and an `export` line before the script. Pasting all three at once makes the
 * shell hand `read` the SECOND pasted line, so the secret silently became the
 * string "export TALLBOY_LICENSE_SECRET". Prompting from inside the script
 * removes that whole class of mistake. The env var is still honoured if it is
 * already set, for CI.)
 *
 * Output lands in <product>-<reseller>-keys.txt (one key per line, ready to
 * hand over) plus a .csv audit trail. Both are gitignored - this repo is public.
 */

const crypto = require("crypto");
const fs = require("fs");
const { execSync } = require("child_process");
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

// Prompt on the terminal with echo off. Reading /dev/tty directly rather than
// stdin means this still works when the script's stdin is a pipe.
function promptHidden(label) {
  let fd;
  try {
    fd = fs.openSync("/dev/tty", "rs");
  } catch (err) {
    return null; // no terminal (CI, cron) - caller falls back to the env var
  }
  let echoDisabled = false;
  try {
    // -echo so the secret is not shown. -icanon min 0 time 0 makes reads return
    // immediately with whatever is there, which is how we drain below.
    execSync("stty -echo -icanon min 0 time 0 < /dev/tty", { shell: "/bin/sh" });
    echoDisabled = true;
  } catch (err) {
    /* no stty: the secret will echo, which is ugly but not wrong */
  }

  // Drain anything already sitting in the terminal's input buffer BEFORE
  // prompting. Pasting a block into a shell queues every line; any line the
  // shell has not consumed is still waiting when this opens /dev/tty, and an
  // undrained prompt reads that stale line instead of what the user types.
  // That is exactly how a prompt "answers itself" with a fragment of an
  // earlier command.
  let drained = 0;
  if (echoDisabled) {
    const scratch = Buffer.alloc(4096);
    for (;;) {
      let n;
      try {
        n = fs.readSync(fd, scratch, 0, scratch.length, null);
      } catch (err) {
        if (err.code === "EAGAIN") break;
        break;
      }
      if (n <= 0) break;
      drained += n;
      if (drained > 1 << 20) break; // something is piping at us; stop
    }
    // Back to line-at-a-time for the real read.
    try {
      execSync("stty icanon < /dev/tty", { shell: "/bin/sh" });
    } catch (err) {
      /* best effort */
    }
  }
  if (drained > 0) {
    process.stderr.write(
      `  (discarded ${drained} byte(s) of leftover terminal input before prompting)\n`
    );
  }

  process.stderr.write(`${label}: `);
  const one = Buffer.alloc(1);
  let acc = Buffer.alloc(0);
  try {
    for (;;) {
      let n;
      try {
        n = fs.readSync(fd, one, 0, 1, null);
      } catch (err) {
        if (err.code === "EAGAIN") continue;
        throw err;
      }
      if (n === 0 || one[0] === 0x0a || one[0] === 0x0d) break;
      acc = Buffer.concat([acc, Buffer.from(one)]);
    }
  } finally {
    if (echoDisabled) {
      try {
        execSync("stty echo icanon < /dev/tty", { shell: "/bin/sh" });
      } catch (err) {
        /* best effort */
      }
    }
    fs.closeSync(fd);
    process.stderr.write("\n");
  }
  return acc.toString("utf8").trim();
}

let secret = (process.env[product.secretEnv] || "").trim();
if (!secret) secret = promptHidden(product.secretEnv) || "";
if (!secret) {
  die(
    `No ${product.secretEnv} given.\n\n` +
    `  Run the script on a terminal and paste the secret at the prompt:\n` +
    `  node scripts/generate-reseller-keys.js --product ${productId} --reseller ${reseller} --count ${count}`
  );
}

// Catch the shell-paste accident explicitly: if the "secret" is obviously a
// fragment of a command line, say so instead of failing on format.
if (/\s/.test(secret) || /^(export|printf|read|node)\b/.test(secret)) {
  die(
    `That does not look like a secret - it looks like a piece of a shell command:\n\n` +
    `    ${secret.slice(0, 60)}${secret.length > 60 ? "..." : ""}\n\n` +
    `  This happens when several lines are pasted at once and the prompt reads\n` +
    `  the wrong one. Run the script on its own and paste ONLY the secret.`
  );
}

// The activation endpoints do Buffer.from(secret, "hex"). Node's hex parser
// stops at the first invalid character rather than throwing, so a non-hex
// secret is silently truncated - identically on both sides, which is why the
// live system still works. Warn rather than refuse: refusing here would block
// a secret the production endpoint accepts.
const parsedBytes = Buffer.from(secret, "hex").length;
if (!/^[0-9a-fA-F]+$/.test(secret) || parsedBytes * 2 !== secret.length) {
  console.error(
    `\n  Note: ${product.secretEnv} is not pure hex. activate-${productId}.js parses it\n` +
    `  with Buffer.from(secret, "hex"), which will use only the first ${parsedBytes} byte(s).\n` +
    `  Keys are still minted the same way the server verifies them, so they will\n` +
    `  work - but pass --verify-against with a known-good key to be certain.\n`
  );
}

// The real proof that the secret is correct. Round-tripping our own keys proves
// nothing, because a wrong secret signs and verifies consistently. Checking a
// key the LIVE system already issued is the only way to catch a wrong or
// mistyped secret before 25 dead keys reach a partner.
if (args["verify-against"]) {
  if (!validateActivationKey(args["verify-against"], secret)) {
    die(
      `The known-good key you passed does NOT validate against this secret.\n\n` +
      `  Either the secret is wrong, or that key is not a ${product.name} key.\n` +
      `  Nothing was written. Grab a ${product.name} key from a real delivery email\n` +
      `  and check ${product.secretEnv} in Netlify.`
    );
  }
  console.log(`\n  Secret verified against the known-good key you supplied.`);
} else {
  console.error(
    `  Tip: --verify-against "<a real ${product.name} key from a delivery email>"\n` +
    `  proves the secret is right before minting. Without it, a wrong secret\n` +
    `  produces 25 keys that look fine and fail in the buyer's DAW.\n`
  );
}

// The timestamp field must be Unix SECONDS, not milliseconds. Production signs
// with Stripe's session.created (see stripe-webhook.js and verify-session.js),
// which is seconds. The HMAC covers the field without interpreting it, so a
// millisecond value still validates - but it decodes to 1970 and looks nothing
// like every other key we have ever issued, which would mislead anyone reading
// a key during support. Match production.
//
// Distinct seconds AND distinct identities, so two keys cannot collide even
// when a whole batch is minted inside the same second.
const nowSeconds = Math.floor(Date.now() / 1000);
const batchStamp = new Date().toISOString().slice(0, 10);
const rows = [];
for (let i = 1; i <= count; i += 1) {
  const seq = String(i).padStart(4, "0");
  const identity = `${reseller}-${productId}-${batchStamp}-${seq}@resellers.carbonatedaudio.com`;
  const key = generateActivationKey(identity, nowSeconds + i, secret);
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
