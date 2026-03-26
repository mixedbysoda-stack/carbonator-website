const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");
const { validateActivationKey } = require("./config");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // Handle CORS preflight
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
      body: JSON.stringify({
        success: false,
        error: "Missing key or machineID",
      }),
    };
  }

  const secret = process.env.CARBONATOR_LICENSE_SECRET;
  if (!secret) {
    console.error("CARBONATOR_LICENSE_SECRET not configured");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: "Server configuration error" }),
    };
  }

  // Strip dashes, lowercase for consistent storage
  const keyClean = key.replace(/-/g, "").toLowerCase();

  // Validate HMAC signature
  if (!validateActivationKey(keyClean, secret)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: "Invalid license key" }),
    };
  }

  // Validate machineID format (expect 32-char hex)
  if (!/^[a-f0-9]{32}$/i.test(machineID)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: "Invalid machine ID" }),
    };
  }

  try {
    const store = getStore("activations");
    let record = await store.get(keyClean, { type: "json" });

    if (!record) {
      record = { machines: [] };
    }

    // Compute deterministic token for this key+machine pair
    const token = crypto
      .createHmac("sha256", Buffer.from(secret, "hex"))
      .update(keyClean + machineID.toLowerCase())
      .digest("hex");

    // Check if already activated on this machine (idempotent)
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

    // Check machine limit
    if (record.machines.length >= 3) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error:
            "Maximum activations reached (3/3). Contact support@carbonatedaudio.com for help.",
        }),
      };
    }

    // Register new machine
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
    console.error("Activation error:", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: "Server error. Please try again.",
      }),
    };
  }
};
