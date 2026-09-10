// Sink for Content-Security-Policy-Report-Only violation reports.
//
// The site ships a report-only CSP (see netlify.toml). Browsers POST a JSON
// document here whenever a page would have violated it. Nothing is stored:
// the report is reduced to one log line, readable in the Netlify function
// logs, so the policy can be tightened from evidence before it is enforced.
// Browser extensions generate a steady trickle of noise (inline styles,
// chrome-extension:// sources); ignore anything whose blocked-uri is not
// an https URL or "inline"/"eval".
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "" };
  }
  try {
    const raw = event.body ? JSON.parse(event.body) : {};
    // Reporting API sends an array of {body:{...}}; the legacy report-uri
    // format sends {"csp-report": {...}}.
    const reports = Array.isArray(raw) ? raw.map((r) => r.body || r) : [raw["csp-report"] || raw];
    for (const r of reports) {
      const blocked = String(r["blocked-uri"] || r.blockedURL || "");
      if (blocked && !/^https?:/.test(blocked) && !/^(inline|eval|data|blob)/.test(blocked)) continue;
      console.log(
        "csp-report",
        JSON.stringify({
          doc: r["document-uri"] || r.documentURL || "",
          directive: r["effective-directive"] || r.effectiveDirective || r["violated-directive"] || "",
          blocked,
          sample: String(r["script-sample"] || r.sample || "").slice(0, 80),
        })
      );
    }
  } catch (err) {
    console.log("csp-report unparseable:", err.message);
  }
  return { statusCode: 204, body: "" };
};
