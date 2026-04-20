const crypto = require("crypto");
const { getBlobStore } = require("./lib/store");

/**
 * Pour Activation Endpoint
 * POST { key, machineID }
 * Validates HMAC-signed serial key, locks to machine (max 3), returns token.
 */

function generateActivationKey(email, sessionCreated, secret) {
  const emailHash = crypto
    .createHash("sha256")
    .update((email || "").toLowerCase().trim())
    .digest()
    .slice(0, 16);

  const timestamp = Buffer.alloc(8);
  timestamp.writeBigUInt64BE(BigInt(sessionCreated));

  const payload = Buffer.concat([emailHash, timestamp]);
  const hmac = crypto
    .createHmac("sha256", Buffer.from(secret, "hex"))
    .update(payload)
    .digest()
    .slice(0, 8);

  const raw = Buffer.concat([emailHash, timestamp, hmac])
    .toString("hex")
    .toUpperCase();
  return raw.match(/.{8}/g).join("-");
}

function validateActivationKey(keyHex, secret) {
  const clean = keyHex.replace(/-/g, "").toLowerCase();
  if (clean.length !== 64) return false;

  const buf = Buffer.from(clean, "hex");
  if (buf.length !== 32) return false;

  const emailHash = buf.slice(0, 16);
  const timestamp = buf.slice(16, 24);
  const providedHmac = buf.slice(24, 32);

  const payload = Buffer.concat([emailHash, timestamp]);
  const expectedHmac = crypto
    .createHmac("sha256", Buffer.from(secret, "hex"))
    .update(payload)
    .digest()
    .slice(0, 8);

  return crypto.timingSafeEqual(providedHmac, expectedHmac);
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: "Method not allowed" }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: "Invalid request body" }),
    };
  }

  const { key, machineID } = body;

  if (!key || !machineID) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: "Missing key or machineID" }),
    };
  }

  const secret = process.env.POUR_LICENSE_SECRET;
  if (!secret) {
    console.error("POUR_LICENSE_SECRET not configured");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: "Server configuration error" }),
    };
  }

  const keyClean = key.replace(/-/g, "").toLowerCase();

  if (!validateActivationKey(keyClean, secret)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: "Invalid license key" }),
    };
  }

  if (!/^[a-f0-9]{32}$/i.test(machineID)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: "Invalid machine ID" }),
    };
  }

  try {
    const store = getBlobStore("pour-activations");
    let record = await store.get(keyClean, { type: "json" });

    if (!record) {
      record = { machines: [] };
    }

    const token = crypto
      .createHmac("sha256", Buffer.from(secret, "hex"))
      .update(keyClean + machineID.toLowerCase())
      .digest("hex");

    // Idempotent — already activated on this machine
    const existing = record.machines.find(
      (m) => m.id === machineID.toLowerCase()
    );
    if (existing) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          token,
          machinesUsed: record.machines.length,
          machinesMax: 3,
        }),
      };
    }

    // Max 3 machines per key
    if (record.machines.length >= 3) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: "Maximum activations reached (3/3). Contact hello@carbonatedaudio.com for help.",
        }),
      };
    }

    record.machines.push({
      id: machineID.toLowerCase(),
      activatedAt: new Date().toISOString(),
    });

    await store.setJSON(keyClean, record);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        token,
        machinesUsed: record.machines.length,
        machinesMax: 3,
      }),
    };
  } catch (err) {
    console.error("Pour activation error:", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: "Server error. Please try again." }),
    };
  }
};

module.exports.generateActivationKey = generateActivationKey;
module.exports.validateActivationKey = validateActivationKey;
