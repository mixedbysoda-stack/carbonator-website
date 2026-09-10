// HTML-escape untrusted strings before interpolating them into email or page
// markup. capture-lead and verify-still-download used to drop the submitted
// contact and source straight into the owner notification HTML, so a payload
// like <a href=...> rendered live in the inbox. Email clients strip scripts,
// so this was content injection rather than XSS, but there is no reason to
// let a form field author HTML that lands in front of the owner.
function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

module.exports = { escapeHtml };
