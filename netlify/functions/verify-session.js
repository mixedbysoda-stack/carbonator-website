const Stripe = require("stripe");
const { VERSION, DOWNLOAD_URLS } = require("./config");

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
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          verified: true,
          version: VERSION,
          downloads: DOWNLOAD_URLS,
          customer_email: session.customer_details?.email || null,
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
