// Download links for add-ons (expansion packs, Pro Tools templates).
//
// The link carries the Stripe Checkout Session id, not a file URL. The session
// id is unguessable, and download-addon.js re-checks it against Stripe on every
// click (paid, not refunded, and actually entitled to this item) before it
// redirects to a short-lived signed URL for the private release asset. So a
// link keeps working for the buyer forever, a refund kills it, and there is no
// public URL for the file to leak.
const SITE = "https://carbonatedaudio.com";

function addonDownloadUrl(sessionId, itemId) {
  return `${SITE}/.netlify/functions/download-addon?session=${encodeURIComponent(sessionId)}&item=${encodeURIComponent(itemId)}`;
}

// Which catalog ids a purchased product entitles the buyer to.
function entitledIds(PRODUCTS, productId) {
  const product = PRODUCTS[productId];
  if (!product) return [];
  if (product.isBundle) return product.includes || [];
  return [productId];
}

// One delivery line per included product, in the shape render.js and
// success.html already understand, extended with kind/downloadFile/pending.
function addonLine(PRODUCTS, sessionId, itemId) {
  const item = PRODUCTS[itemId];
  return {
    product: itemId,
    kind: "addon",
    licenseKey: null,
    downloadMac: null,
    downloadWin: null,
    downloadFile: item.released ? addonDownloadUrl(sessionId, itemId) : null,
    pending: !item.released,
  };
}

module.exports = { addonDownloadUrl, entitledIds, addonLine };
