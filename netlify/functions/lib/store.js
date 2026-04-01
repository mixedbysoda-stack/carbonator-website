const { getStore } = require("@netlify/blobs");

function getBlobStore(name) {
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const token = process.env.NETLIFY_API_TOKEN;

  if (siteID && token) {
    return getStore({ name, siteID, token });
  }
  return getStore(name);
}

module.exports = { getBlobStore };
