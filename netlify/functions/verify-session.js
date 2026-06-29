const Stripe = require("stripe");
const {
  VERSION,
  DOWNLOAD_URLS,
  PRODUCTS,
  generateActivationKey,
} = require("./config");

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

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const sessionId = event.queryStringParameters?.session_id;

  if (!sessionId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing session_id" }),
    };
  }

  // Basic format check — Stripe checkout session IDs start with cs_
  if (!sessionId.startsWith("cs_")) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid session_id" }),
    };
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      const email = session.customer_details?.email || null;

      // Detect product from session metadata or default to carbonator
      const productId = session.metadata?.product || "carbonator";
      const product = PRODUCTS[productId] || PRODUCTS.carbonator;

      // Bundle: return one item per included plugin (name, downloads, key).
      // Keys are regenerated deterministically from email + session.created, so
      // this works even if the webhook's metadata writeback failed (restricted key).
      if (product.isBundle) {
        const items = (product.includes || []).map((id) => {
          const inc = PRODUCTS[id];
          const secret = process.env[inc.secretEnv];
          const key =
            session.metadata?.[`license_key_${id}`] ||
            (secret && email
              ? generateActivationKey(email, session.created, secret)
              : null);
          return {
            product: id,
            product_name: inc.name,
            version: inc.version,
            downloads: inc.downloads,
            license_key: key,
          };
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            verified: true,
            product: productId,
            product_name: product.name,
            is_bundle: true,
            items,
            customer_email: email,
          }),
        };
      }

      const licenseSecret = process.env[product.secretEnv];

      let licenseKey = session.metadata?.license_key || null;

      if (!licenseKey && licenseSecret && email) {
        licenseKey = generateActivationKey(
          email,
          session.created,
          licenseSecret
        );
        // Store for future retrievals
        try {
          await stripe.checkout.sessions.update(sessionId, {
            metadata: { license_key: licenseKey, product: productId },
          });
        } catch (err) {
          console.error("Failed to store license key:", err.message);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          verified: true,
          product: productId,
          product_name: product.name,
          version: product.version,
          downloads: product.downloads,
          customer_email: email,
          license_key: licenseKey,
        }),
      };
    }

    return {
      statusCode: 402,
      headers,
      body: JSON.stringify({
        verified: false,
        error: "Payment not completed",
      }),
    };
  } catch (err) {
    console.error("Stripe session verification error:", err.message);

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        verified: false,
        error: "Could not verify payment session",
      }),
    };
  }
};
