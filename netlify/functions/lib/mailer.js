// Resend send wrapper.
//
// WHY THIS EXISTS: the Resend SDK (v3) does NOT throw on API errors — it
// resolves with { data, error }. Every call site here was written as a bare
// `await resend.emails.send(...)` inside a try/catch, so an API-level failure
// was reported as success and execution carried on.
//
// That bit for real on 2026-08-23: the 273-recipient TALLBOY blast consumed the
// account's daily sending quota, and the next licence-delivery email came back
// 429 daily_quota_exceeded. The webhook logged "Delivery email sent", stored the
// buyer record and returned 200. A paying customer got no key and nothing
// surfaced anywhere.
//
// sendEmail() throws on both failure modes, so the existing try/catch blocks
// finally do what they look like they do.
async function sendEmail(resend, payload) {
  let result;
  try {
    result = await resend.emails.send(payload);
  } catch (err) {
    // Network/transport failure — already throws, just annotate.
    err.message = `Resend request failed: ${err.message}`;
    throw err;
  }

  const { data, error } = result || {};
  if (error) {
    const err = new Error(
      `Resend rejected the send: ${error.message || error.name || JSON.stringify(error)}`
    );
    err.resendError = error;
    // 429 = daily quota or rate limit. Callers that can be retried (the Stripe
    // webhook) use this to ask for a retry rather than dropping the mail.
    err.retryable = error.statusCode === 429 || error.statusCode >= 500;
    throw err;
  }

  return data;
}

module.exports = { sendEmail };
