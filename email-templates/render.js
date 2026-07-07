// Carbonated Audio — Email Template Renderer
// One module, four variants, one branded shell.
//
// Usage (Node):
//   const { buildEmail } = require("./render");
//   const html = buildEmail("personal", { name: "Mike", body: "<p>…</p>" });
//
// Usage (CLI — for Gmail MCP drafting):
//   echo '{"variant":"personal","tokens":{"name":"Mike","body":"<p>…</p>"}}' | node render.js
//
// Variants:
//   - personal  (A) — minimal 1:1 reply, no hero
//   - spotlight (B) — one product highlighted with hero + CTA
//   - bundle    (C) — promo / bundle push with code + expiry
//   - support   (D) — transactional / license delivery / support
//
// Gmail-safe: table layout, inline styles only, 600px max width,
// no flexbox/grid, no <style> blocks, no external CSS.

const BRAND = {
  site: "https://carbonatedaudio.com",
  logo: "https://carbonatedaudio.com/logo-wordmark.png",
  bgPage: "#0d0a1a",
  bgCard: "#1a1430",
  bgCardDeep: "#120e22",
  border: "#2a2440",
  textPrimary: "#ffffff",
  textSecondary: "#a09bb5",
  textMuted: "#6b6580",
  mono: "'SF Mono', 'Menlo', 'Consolas', 'Courier New', monospace",
  font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
};

const PRODUCT_ACCENTS = {
  fizzfuel: {
    name: "FIZZFUEL",
    color: "#ff6b2b",
    colorAlt: "#ffd700",
    gradient: "linear-gradient(135deg,#ff6b2b,#ffd700)",
    url: "https://carbonatedaudio.com/fizzfuel",
    price: 29,
  },
  carbonator: {
    name: "Carbonator",
    color: "#ff6b2b",
    colorAlt: "#ff3366",
    gradient: "linear-gradient(135deg,#ff6b2b,#ff3366)",
    url: "https://carbonatedaudio.com/carbonator",
    price: 20,
  },
  desipper: {
    name: "De-Sipper",
    color: "#00d4ff",
    colorAlt: "#0066ff",
    gradient: "linear-gradient(135deg,#00d4ff,#0066ff)",
    url: "https://carbonatedaudio.com/desipper",
    price: 20,
  },
  ontap: {
    name: "On Tap",
    color: "#a855f7",
    colorAlt: "#7c3aed",
    gradient: "linear-gradient(135deg,#a855f7,#7c3aed)",
    url: "https://carbonatedaudio.com/ontap",
    price: 20,
  },
  pour: {
    name: "Pour",
    color: "#4fb8d4",
    colorAlt: "#2a88a8",
    gradient: "linear-gradient(135deg,#4fb8d4,#2a88a8)",
    url: "https://carbonatedaudio.com/pour",
    price: 20,
  },
  tonic: {
    name: "Tonic",
    color: "#a855f7",
    colorAlt: "#7b2fff",
    gradient: "linear-gradient(135deg,#a855f7,#7b2fff)",
    url: "https://carbonatedaudio.com/tonic",
    price: 20,
  },
  bundle: {
    name: "Complete Bundle",
    color: "#cc33ff",
    colorAlt: "#ff6b2b",
    gradient: "linear-gradient(135deg,#ff6b2b,#cc33ff,#00d4ff)",
    url: "https://buy.stripe.com/aFa4gzbUZfRwdPXdHt3oA0g",
    price: 75,
  },
  vocal_bundle: {
    name: "Vocal Chain Bundle",
    color: "#ff6b2b",
    colorAlt: "#4fb8d4",
    gradient: "linear-gradient(135deg,#ff6b2b,#4fb8d4)",
    url: "https://buy.stripe.com/7sY28raQV34KeU1bzl3oA09",
    price: 35,
  },
  mixbus_bundle: {
    name: "Mix Bus Bundle",
    color: "#00d4ff",
    colorAlt: "#7b68ee",
    gradient: "linear-gradient(135deg,#00d4ff,#7b68ee)",
    url: "https://buy.stripe.com/28EeVdcZ3gVA27f1YL3oA0a",
    price: 30,
  },
};

function shell(innerHtml, { preheader } = {}) {
  const year = new Date().getFullYear();
  const pre = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${BRAND.bgPage};mso-hide:all;">${preheader}</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Carbonated Audio</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bgPage};font-family:${BRAND.font};color:${BRAND.textPrimary};-webkit-font-smoothing:antialiased;">
${pre}
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.bgPage};padding:40px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
        <!-- Logo header -->
        <tr>
          <td align="center" style="padding:0 0 32px;">
            <a href="${BRAND.site}" style="text-decoration:none;">
              <img src="${BRAND.logo}" alt="Carbonated Audio" width="220" style="display:block;width:220px;max-width:70%;height:auto;border:0;">
            </a>
          </td>
        </tr>
        <!-- Card -->
        <tr>
          <td style="background-color:${BRAND.bgCard};border-radius:16px;padding:40px 32px;border:1px solid ${BRAND.border};">
            ${innerHtml}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td align="center" style="padding:28px 8px 0;">
            <p style="color:${BRAND.textMuted};font-size:12px;line-height:1.6;margin:0 0 8px;">
              <a href="${BRAND.site}/carbonator" style="color:${BRAND.textMuted};text-decoration:none;">Carbonator</a>
              &nbsp;&middot;&nbsp;
              <a href="${BRAND.site}/desipper" style="color:${BRAND.textMuted};text-decoration:none;">De-Sipper</a>
              &nbsp;&middot;&nbsp;
              <a href="${BRAND.site}/ontap" style="color:${BRAND.textMuted};text-decoration:none;">On Tap</a>
              &nbsp;&middot;&nbsp;
              <a href="${BRAND.site}/pour" style="color:${BRAND.textMuted};text-decoration:none;">Pour</a>
            </p>
            <p style="color:${BRAND.textMuted};font-size:11px;line-height:1.6;margin:0;">
              &copy; ${year} Carbonated Audio &middot; <a href="${BRAND.site}" style="color:${BRAND.textMuted};text-decoration:none;">carbonatedaudio.com</a>
            </p>
            <p style="color:${BRAND.textMuted};font-size:11px;line-height:1.6;margin:8px 0 0;">
              Built by producers, for producers. Reply to this email and a human will read it.
            </p>
            <p style="color:#6b6580;font-size:11px;line-height:1.6;margin:8px 0 0;">
              Don't want these emails? <a href="mailto:hello@carbonatedaudio.com?subject=Unsubscribe" style="color:#6b6580;text-decoration:underline;">Unsubscribe</a> and we'll take you off the list.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function ctaButton({ href, text, gradient, textColor = "#ffffff" }) {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
  <tr>
    <td align="center" style="background:${gradient};border-radius:10px;">
      <a href="${href}" style="display:inline-block;padding:14px 36px;color:${textColor};text-decoration:none;font-family:${BRAND.font};font-size:15px;font-weight:700;letter-spacing:0.2px;">${text}</a>
    </td>
  </tr>
</table>`;
}

function heading1(text, { accent } = {}) {
  const color = accent || BRAND.textPrimary;
  return `<h1 style="color:${color};font-family:${BRAND.font};font-size:22px;font-weight:800;line-height:1.3;letter-spacing:-0.3px;margin:0 0 16px;">${text}</h1>`;
}

function paragraph(text) {
  return `<p style="color:${BRAND.textSecondary};font-family:${BRAND.font};font-size:15px;line-height:1.7;margin:0 0 16px;">${text}</p>`;
}

function divider() {
  return `<hr style="border:none;border-top:1px solid ${BRAND.border};margin:28px 0;">`;
}

function codeBlock(code, { accent = BRAND.textPrimary } = {}) {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;">
    <tr>
      <td style="background:${BRAND.bgCardDeep};border:1px solid ${BRAND.border};border-radius:8px;padding:16px;text-align:center;">
        <code style="font-family:${BRAND.mono};font-size:13px;color:${accent};letter-spacing:0.5px;word-break:break-all;">${code}</code>
      </td>
    </tr>
  </table>`;
}

function signature(name = "Soda") {
  return `<p style="color:${BRAND.textPrimary};font-family:${BRAND.font};font-size:15px;line-height:1.7;margin:24px 0 0;">&mdash; ${name}<br>
  <span style="color:${BRAND.textMuted};font-size:13px;">Carbonated Audio</span></p>`;
}

// ---------------------------------------------------------------
// VARIANT A — personal 1:1 reply
// tokens: { name, body (HTML), signatureName? }
// ---------------------------------------------------------------
function variantPersonal({ name, body, signatureName, preheader }) {
  const greeting = name ? `Hey ${name},` : "Hey,";
  const inner = `
    ${heading1(greeting)}
    ${body}
    ${signature(signatureName)}
  `;
  return shell(inner, { preheader });
}

// ---------------------------------------------------------------
// VARIANT B — product spotlight (one plugin hero + CTA)
// tokens: { product, name?, headline, body (HTML), ctaText?, ctaUrl?, features? (array), signatureName? }
// ---------------------------------------------------------------
function variantSpotlight({ product, name, headline, body, ctaText, ctaUrl, features, signatureName, preheader }) {
  const accent = PRODUCT_ACCENTS[product] || PRODUCT_ACCENTS.carbonator;
  const heroImg = `${BRAND.site}/${product}-screenshot.png`;
  const cta = ctaUrl || accent.url;
  const ctaLabel = ctaText || `Learn more about ${accent.name}`;
  const greeting = name ? `Hey ${name},` : "";

  const featuresBlock = features && features.length
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 24px;">
        ${features.map(f => `
        <tr>
          <td style="padding:6px 0;color:${BRAND.textSecondary};font-size:14px;line-height:1.6;">
            <span style="color:${accent.color};font-weight:700;">&#9632;</span>&nbsp;&nbsp;${f}
          </td>
        </tr>`).join("")}
      </table>`
    : "";

  const inner = `
    <!-- Hero -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
      <tr>
        <td align="center" style="background:radial-gradient(ellipse at center, ${accent.color}22 0%, ${BRAND.bgCard} 70%);border-radius:12px;padding:28px 16px;">
          <img src="${heroImg}" alt="${accent.name}" width="380" style="display:block;width:100%;max-width:380px;height:auto;border-radius:8px;border:0;">
        </td>
      </tr>
    </table>
    ${greeting ? paragraph(greeting) : ""}
    <h1 style="color:${BRAND.textPrimary};font-family:${BRAND.font};font-size:26px;font-weight:800;line-height:1.25;letter-spacing:-0.5px;margin:0 0 16px;">${headline}</h1>
    ${body}
    ${featuresBlock}
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 16px;">
      <tr>
        <td align="center">
          ${ctaButton({ href: cta, text: ctaLabel, gradient: accent.gradient })}
        </td>
      </tr>
    </table>
    ${signature(signatureName)}
  `;
  return shell(inner, { preheader });
}

// ---------------------------------------------------------------
// VARIANT C — bundle / promo pitch
// tokens: { name?, headline, body (HTML), bundlePrice, bundleOriginal, savings, promoCode, promoExpires, ctaText?, ctaUrl?, includes (array), signatureName? }
// ---------------------------------------------------------------
function variantBundle({ name, headline, body, bundlePrice = 60, bundleOriginal = 80, savings = 20, promoCode, promoExpires, ctaText, ctaUrl, includes, signatureName, preheader }) {
  const accent = PRODUCT_ACCENTS.bundle;
  const cta = ctaUrl || accent.url;
  const ctaLabel = ctaText || `Get the Bundle — $${bundlePrice}`;
  const greeting = name ? `Hey ${name},` : "";

  const promoBlock = promoCode ? `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 24px;">
      <tr>
        <td style="background:${BRAND.bgCardDeep};border:1px solid ${BRAND.border};border-radius:10px;padding:18px;text-align:center;">
          <p style="color:${BRAND.textMuted};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 6px;">Use code at checkout</p>
          <p style="color:${BRAND.textPrimary};font-family:${BRAND.mono};font-size:22px;font-weight:700;letter-spacing:2px;margin:0 0 4px;">${promoCode}</p>
          ${promoExpires ? `<p style="color:${BRAND.textMuted};font-size:12px;margin:4px 0 0;">Expires ${promoExpires}</p>` : ""}
        </td>
      </tr>
    </table>` : "";

  const includesBlock = includes && includes.length
    ? `<p style="color:${BRAND.textMuted};font-size:12px;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 10px;">What's inside</p>
       <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
         ${includes.map(inc => `
         <tr>
           <td style="padding:8px 0;color:${BRAND.textSecondary};font-size:14px;line-height:1.6;border-bottom:1px solid ${BRAND.border};">
             <strong style="color:${BRAND.textPrimary};">${inc.name}</strong>${inc.tagline ? ` &mdash; <span style="color:${BRAND.textMuted};">${inc.tagline}</span>` : ""}
           </td>
         </tr>`).join("")}
       </table>`
    : "";

  const inner = `
    <!-- Bundle hero -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
      <tr>
        <td align="center" style="background:radial-gradient(ellipse at center, #ff6b2b18 0%, #cc33ff15 50%, ${BRAND.bgCard} 85%);border-radius:12px;padding:32px 16px;">
          <p style="color:${BRAND.textMuted};font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Complete Bundle &mdash; Save $${savings}</p>
          <p style="margin:0 0 4px;font-size:14px;color:${BRAND.textMuted};"><span style="text-decoration:line-through;">$${bundleOriginal}</span></p>
          <p style="margin:0;font-family:${BRAND.mono};font-size:56px;font-weight:900;line-height:1;letter-spacing:-2px;color:${BRAND.textPrimary};">$${bundlePrice}</p>
          <p style="color:${BRAND.textMuted};font-size:12px;margin:8px 0 0;">one-time payment &middot; lifetime updates</p>
        </td>
      </tr>
    </table>
    ${greeting ? paragraph(greeting) : ""}
    <h1 style="color:${BRAND.textPrimary};font-family:${BRAND.font};font-size:26px;font-weight:800;line-height:1.25;letter-spacing:-0.5px;margin:0 0 16px;">${headline}</h1>
    ${body}
    ${promoBlock}
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
      <tr><td align="center">${ctaButton({ href: cta, text: ctaLabel, gradient: accent.gradient })}</td></tr>
    </table>
    ${includesBlock}
    ${signature(signatureName)}
  `;
  return shell(inner, { preheader });
}

// ---------------------------------------------------------------
// VARIANT D — transactional / support / license delivery
// Single-license: { product, licenseKey, downloadMac, downloadWin, ... }
// Bundle (multi-license): { product: "bundle", licenses: [{product, licenseKey, downloadMac, downloadWin}, ...], ... }
// ---------------------------------------------------------------
function variantSupport({ product, customerEmail, amount, orderId, licenseKey, licenses, downloadMac, downloadWin, version, quickStart, refCode, headline, body, preheader, signatureName }) {
  const accent = PRODUCT_ACCENTS[product] || PRODUCT_ACCENTS.carbonator;
  const isBundle = Array.isArray(licenses) && licenses.length > 0;
  const bundleLabel = accent && accent.name ? accent.name : "Bundle";
  const title = headline || (isBundle ? `Thank you for the ${bundleLabel}!` : "Thank you for your purchase!");

  // Single-license license + download blocks
  const singleLicenseBlock = (!isBundle && licenseKey) ? `
    <p style="color:${BRAND.textMuted};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 8px;text-align:center;">Your ${accent.name} License Key</p>
    ${codeBlock(licenseKey, { accent: accent.color })}
    <p style="color:${BRAND.textMuted};font-size:12px;text-align:center;margin:0 0 24px;">Paste into ${accent.name} to activate &middot; 3 machines per license</p>
  ` : "";

  const singleDownloads = [];
  if (!isBundle && downloadMac) singleDownloads.push({ os: "macOS", url: downloadMac });
  if (!isBundle && downloadWin) singleDownloads.push({ os: "Windows", url: downloadWin });
  const singleDownloadBlock = singleDownloads.length ? `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
      ${singleDownloads.map(d => `
      <tr>
        <td align="center" style="padding:0 0 10px;">
          ${ctaButton({ href: d.url, text: `Download for ${d.os}`, gradient: accent.gradient })}
        </td>
      </tr>`).join("")}
    </table>` : "";

  // Bundle: one card per plugin with its own license key + downloads
  const bundleBlocks = isBundle ? licenses.map(lic => {
    const pacc = PRODUCT_ACCENTS[lic.product] || accent;
    const dls = [];
    if (lic.downloadMac) dls.push({ os: "macOS", url: lic.downloadMac });
    if (lic.downloadWin) dls.push({ os: "Windows", url: lic.downloadWin });
    return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
      <tr>
        <td style="background:${BRAND.bgCardDeep};border:1px solid ${BRAND.border};border-radius:12px;padding:20px 18px;">
          <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:${pacc.color};letter-spacing:0.2px;">${pacc.name}</p>
          ${lic.licenseKey ? `
          <div style="background:${BRAND.bgCard};border:1px solid ${BRAND.border};border-radius:6px;padding:12px;text-align:center;margin:0 0 12px;">
            <code style="font-family:${BRAND.mono};font-size:12px;color:${pacc.color};letter-spacing:0.4px;word-break:break-all;">${lic.licenseKey}</code>
          </div>` : ""}
          ${dls.length ? `
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${dls.map(d => `
            <tr><td align="center" style="padding:0 0 6px;">
              <a href="${d.url}" style="display:inline-block;padding:10px 20px;background:${pacc.gradient};color:#ffffff;text-decoration:none;border-radius:8px;font-family:${BRAND.font};font-size:13px;font-weight:700;">Download ${d.os}</a>
            </td></tr>`).join("")}
          </table>` : ""}
        </td>
      </tr>
    </table>`;
  }).join("") : "";

  const licenseBlock = isBundle ? bundleBlocks : singleLicenseBlock;
  const downloadBlock = isBundle ? "" : singleDownloadBlock;

  const productLabel = isBundle
    ? `Carbonated Audio ${bundleLabel}`
    : `${accent.name}${version ? ` v${version}` : ""}`;
  const receiptBlock = (amount || orderId || customerEmail) ? `
    ${divider()}
    <p style="color:${BRAND.textMuted};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 12px;">Order details</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;margin:0 0 8px;">
      ${product ? `<tr><td style="color:${BRAND.textMuted};padding:4px 0;">Product</td><td align="right" style="color:${BRAND.textPrimary};padding:4px 0;">${productLabel}</td></tr>` : ""}
      ${isBundle ? `<tr><td style="color:${BRAND.textMuted};padding:4px 0;">Includes</td><td align="right" style="color:${BRAND.textPrimary};padding:4px 0;">${licenses.map(l => (PRODUCT_ACCENTS[l.product] || {}).name || l.product).join(" + ")}</td></tr>` : ""}
      ${amount ? `<tr><td style="color:${BRAND.textMuted};padding:4px 0;">Amount</td><td align="right" style="color:${BRAND.textPrimary};padding:4px 0;">${amount}</td></tr>` : ""}
      ${customerEmail ? `<tr><td style="color:${BRAND.textMuted};padding:4px 0;">Email</td><td align="right" style="color:${BRAND.textPrimary};padding:4px 0;">${customerEmail}</td></tr>` : ""}
      ${orderId ? `<tr><td style="color:${BRAND.textMuted};padding:4px 0;">Order ID</td><td align="right" style="color:${BRAND.textPrimary};padding:4px 0;font-family:${BRAND.mono};font-size:11px;word-break:break-all;">${orderId}</td></tr>` : ""}
    </table>` : "";

  const quickStartBlock = quickStart && quickStart.length ? `
    ${divider()}
    <p style="color:${BRAND.textMuted};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 12px;">Quick start</p>
    <ol style="color:${BRAND.textSecondary};font-size:14px;line-height:1.7;margin:0;padding:0 0 0 20px;">
      ${quickStart.map(step => `<li style="margin-bottom:8px;">${step}</li>`).join("")}
    </ol>` : "";

  const refBlock = refCode ? `
    ${divider()}
    <p style="color:${BRAND.textMuted};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 10px;">Share ${accent.name}, earn credit</p>
    <p style="color:${BRAND.textSecondary};font-size:14px;line-height:1.6;margin:0 0 12px;">Know a producer who'd love this? Share your link — when someone buys through it, you get our next plugin free.</p>
    ${codeBlock(`${BRAND.site}/.netlify/functions/referral?action=track&ref=${refCode}`, { accent: accent.color })}
  ` : "";

  const inner = `
    <!-- Success check -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
      <tr>
        <td align="center" style="padding:0 0 8px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center" style="width:56px;height:56px;border-radius:28px;background:${accent.gradient};color:#ffffff;font-size:28px;line-height:56px;font-weight:700;">&#10003;</td></tr>
          </table>
        </td>
      </tr>
    </table>
    <h1 style="color:${BRAND.textPrimary};font-family:${BRAND.font};font-size:24px;font-weight:800;line-height:1.25;letter-spacing:-0.3px;margin:0 0 8px;text-align:center;">${title}</h1>
    ${body ? `<div style="text-align:center;">${body}</div>` : ""}
    <div style="margin:24px 0 16px;">
    ${licenseBlock}
    ${downloadBlock}
    </div>
    ${quickStartBlock}
    ${receiptBlock}
    ${refBlock}
    ${divider()}
    <p style="color:${BRAND.textMuted};font-size:12px;line-height:1.6;text-align:center;margin:0;">
      Need help? Just reply — <a href="mailto:mixedbysoda@gmail.com" style="color:${BRAND.textSecondary};text-decoration:none;">mixedbysoda@gmail.com</a>
    </p>
    ${signatureName ? signature(signatureName) : ""}
  `;
  return shell(inner, { preheader });
}

function buildEmail(variant, tokens) {
  switch (variant) {
    case "personal":  return variantPersonal(tokens);
    case "spotlight": return variantSpotlight(tokens);
    case "bundle":    return variantBundle(tokens);
    case "support":   return variantSupport(tokens);
    default: throw new Error(`Unknown variant: ${variant}`);
  }
}

module.exports = { buildEmail, BRAND, PRODUCT_ACCENTS };

// CLI mode: read JSON payload from stdin, emit HTML to stdout
if (require.main === module) {
  let raw = "";
  process.stdin.on("data", d => raw += d);
  process.stdin.on("end", () => {
    try {
      const { variant, tokens } = JSON.parse(raw);
      process.stdout.write(buildEmail(variant, tokens));
    } catch (err) {
      process.stderr.write(`render error: ${err.message}\n`);
      process.exit(1);
    }
  });
}
