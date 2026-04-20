const Stripe = require("stripe");
const { Resend } = require("resend");
const { getBlobStore } = require("./lib/store");
const { PRODUCTS, generateActivationKey } = require("./config");
const { generateRefCode } = require("./referral");
const { buildEmail } = require("../../email-templates/render");

const FROM_EMAIL = "Carbonated Audio <hello@carbonatedaudio.com>";

const SUBJECTS = {
  carbonator: "Your Carbonator License Key & Download Links",
  desipper: "Your De-Sipper License Key & Download Links",
  ontap: "Your On Tap License Key & Download Links",
  pour: "Your Pour License Key & Download Links",
  bundle: "Your Carbonated Audio Bundle — License Keys & Downloads",
};

const QUICK_START = {
  carbonator: [
    '<strong style="color:#ffffff;">macOS:</strong> Open the .pkg installer and choose your formats (VST3, AU, AAX, Standalone).',
    '<strong style="color:#ffffff;">Windows:</strong> Extract the .zip and copy the VST3 to <code style="background:#2a2440;padding:2px 6px;border-radius:4px;">C:\\Program Files\\Common Files\\VST3\\</code>',
    '<strong style="color:#ffffff;">Activate:</strong> Open the plugin, paste your license key, click Activate.',
    '<strong style="color:#ffffff;">Rescan plugins</strong> in your DAW, then drop Carbonator on a track.',
  ],
  desipper: [
    '<strong style="color:#ffffff;">macOS:</strong> Open the .pkg installer and pick your formats.',
    '<strong style="color:#ffffff;">Windows:</strong> Run the .exe — it places the VST3 in the standard plugin folder automatically.',
    '<strong style="color:#ffffff;">Activate:</strong> Open De-Sipper, paste your license key, click Activate.',
    '<strong style="color:#ffffff;">Rescan plugins</strong> in your DAW, then insert De-Sipper on a vocal track.',
  ],
  ontap: [
    '<strong style="color:#ffffff;">macOS:</strong> Open the .pkg installer — it installs VST3, AU, and AAX automatically.',
    '<strong style="color:#ffffff;">Windows:</strong> Run the .exe installer — it places the VST3 in the standard plugin folder automatically.',
    '<strong style="color:#ffffff;">Activate:</strong> Open On Tap, paste your license key, click Activate.',
    '<strong style="color:#ffffff;">Use it:</strong> Insert On Tap on bass, synths, or pads. Pick a curve and adjust mix.',
  ],
  pour: [
    '<strong style="color:#ffffff;">macOS:</strong> Open the .pkg installer and pick your formats (VST3, AU, AAX).',
    '<strong style="color:#ffffff;">Windows:</strong> Run the .exe installer — it places the VST3 in the standard plugin folder automatically.',
    '<strong style="color:#ffffff;">Activate:</strong> Open Pour, paste your license key, click Activate.',
    '<strong style="color:#ffffff;">Use it:</strong> Drop Pour on a stereo track or bus and start widening.',
  ],
  bundle: [
    '<strong style="color:#ffffff;">Install all four plugins</strong> using the download links above.',
    '<strong style="color:#ffffff;">Activate each plugin</strong> with its matching license key — each key is plugin-specific.',
    '<strong style="color:#ffffff;">Rescan plugins</strong> in your DAW.',
    '<strong style="color:#ffffff;">Stack them:</strong> Carbonator for saturation, De-Sipper for vocals, On Tap for sidechain, Pour for imaging.',
  ],
};

const BODY_COPY = {
  single: (productName) =>
    `<p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0;">Your ${productName} license key and downloads are below. If anything breaks on install, just reply to this email.</p>`,
  bundle:
    `<p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0;">You now own all four Carbonated Audio plugins. Each license key, download pair, and a quick-start checklist are below.</p>`,
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = event.headers["stripe-signature"];

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type !== "checkout.session.completed") {
    return { statusCode: 200, body: "OK" };
  }

  const session = stripeEvent.data.object;
  if (session.payment_status !== "paid") {
    return { statusCode: 200, body: "Not paid — skipped" };
  }

  const email = session.customer_details?.email;
  if (!email) {
    console.error("No customer email in session");
    return { statusCode: 200, body: "No email — skipped" };
  }

  const productId = session.metadata?.product || "carbonator";
  const product = PRODUCTS[productId] || PRODUCTS.carbonator;

  const amountPaid = session.amount_total
    ? `$${(session.amount_total / 100).toFixed(2)}`
    : `$${product.price}.00`;
  const orderId = session.id;
  const refCode = generateRefCode(email);

  let emailHtml;
  let emailSubject;

  if (product.isBundle) {
    const licenses = [];
    const metadataUpdate = { product: "bundle" };
    for (const includedId of product.includes) {
      const included = PRODUCTS[includedId];
      const secret = process.env[included.secretEnv];
      const licenseKey = secret
        ? generateActivationKey(email, session.created, secret)
        : null;
      if (licenseKey) {
        metadataUpdate[`license_key_${includedId}`] = licenseKey;
      }
      licenses.push({
        product: includedId,
        licenseKey,
        downloadMac: included.downloads.mac,
        downloadWin: included.downloads.windows,
      });
    }

    try {
      await stripe.checkout.sessions.update(session.id, { metadata: metadataUpdate });
    } catch (err) {
      console.error("Failed to store bundle keys on session:", err.message);
    }

    emailHtml = buildEmail("support", {
      product: "bundle",
      customerEmail: email,
      amount: amountPaid,
      orderId,
      licenses,
      body: BODY_COPY.bundle,
      quickStart: QUICK_START.bundle,
      refCode,
      preheader: "Your 4 license keys + downloads",
    });
    emailSubject = SUBJECTS.bundle;
  } else {
    const licenseSecret = process.env[product.secretEnv];
    let licenseKey = session.metadata?.license_key;
    if (!licenseKey && licenseSecret) {
      licenseKey = generateActivationKey(email, session.created, licenseSecret);
      try {
        await stripe.checkout.sessions.update(session.id, {
          metadata: { license_key: licenseKey, product: productId },
        });
      } catch (err) {
        console.error("Failed to store license key on session:", err.message);
      }
    }

    emailHtml = buildEmail("support", {
      product: productId,
      customerEmail: email,
      amount: amountPaid,
      orderId,
      licenseKey,
      downloadMac: product.downloads.mac,
      downloadWin: product.downloads.windows,
      version: product.version,
      body: BODY_COPY.single(product.name),
      quickStart: QUICK_START[productId] || QUICK_START.carbonator,
      refCode,
      preheader: `Your ${product.name} license key + downloads`,
    });
    emailSubject = SUBJECTS[productId] || SUBJECTS.carbonator;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: emailSubject,
      html: emailHtml,
    });
    console.log(`Delivery email sent to ${email} (${productId})`);
  } catch (err) {
    console.error("Failed to send delivery email:", err.message);
    return { statusCode: 200, body: "Email send failed" };
  }

  try {
    const buyerStore = getBlobStore("buyers");
    await buyerStore.setJSON(`buyer_${email}`, {
      email,
      product: productId,
      purchased_at: new Date().toISOString(),
      amount: amountPaid,
      order_id: orderId,
    });
  } catch (err) {
    console.error("Failed to store buyer:", err.message);
  }

  return { statusCode: 200, body: "OK" };
};
