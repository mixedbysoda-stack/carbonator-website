// Minimal Stripe REST client for the operator scripts in scripts/.
//
// No SDK on purpose, same reasoning as generate-apd-codes.js: these scripts
// have to run on a machine where npm install has not happened, and they pin
// nothing, so they keep working when the SDK or the account's default API
// version moves. Everything Stripe needs here is form-encoded POST/GET.
//
// The key comes from STRIPE_SECRET_KEY in the environment. Load it without
// putting it in shell history:
//   printf 'Stripe secret key: '; read -rs STRIPE_SECRET_KEY; echo; export STRIPE_SECRET_KEY
const https = require("https");

function requireKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !/^(sk|rk)_(live|test)_/.test(key)) {
    console.error("STRIPE_SECRET_KEY is not set (or is not a secret/restricted key).");
    console.error("  printf 'Stripe secret key: '; read -rs STRIPE_SECRET_KEY; echo; export STRIPE_SECRET_KEY");
    process.exit(1);
  }
  return key;
}

// Stripe's form encoding: nested objects become a[b][c]=v, arrays a[0]=v.
function encode(obj, prefix, out = []) {
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item !== null && typeof item === "object") encode(item, `${key}[${i}]`, out);
        else out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`);
      });
    } else if (typeof v === "object") {
      encode(v, key, out);
    } else {
      out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
    }
  }
  return out.join("&");
}

function request(method, path, params, { idempotencyKey } = {}) {
  const key = requireKey();
  const body = method === "GET" ? "" : encode(params);
  const query = method === "GET" && params ? `?${encode(params)}` : "";
  const headers = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/x-www-form-urlencoded",
    "Content-Length": Buffer.byteLength(body),
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: "api.stripe.com", path: `/v1/${path}${query}`, method, headers },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let parsed;
          try { parsed = JSON.parse(data); } catch { return reject(new Error(`Stripe ${method} ${path}: non-JSON response (${res.statusCode})`)); }
          if (res.statusCode >= 400) {
            const err = new Error(`Stripe ${method} ${path}: ${parsed.error?.message || res.statusCode}`);
            err.code = parsed.error?.code;
            err.status = res.statusCode;
            return reject(err);
          }
          resolve(parsed);
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

const stripe = {
  get: (path, params) => request("GET", path, params),
  post: (path, params, opts) => request("POST", path, params, opts),
  // Walk a paginated list endpoint to the end (or until `limit` items).
  async list(path, params = {}, { max = 5000 } = {}) {
    const out = [];
    let starting_after;
    while (out.length < max) {
      const page = await request("GET", path, { limit: 100, ...params, starting_after });
      out.push(...page.data);
      if (!page.has_more || page.data.length === 0) break;
      starting_after = page.data[page.data.length - 1].id;
    }
    return out;
  },
};

module.exports = { stripe, encode };
