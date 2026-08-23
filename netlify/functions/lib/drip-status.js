// The order a lead moves through the nurture sequence.
//
// One email address can hold several lead records — a repeat visitor gets a new
// `lead_<ts>_<rand>` key every capture, and the 398-record store holds addresses
// with six of them. Anything that reduces those records to a single answer (the
// Sheet has one row per address) has to pick the furthest-along status, not
// whichever record it happened to read last, or a reconcile can walk a lead
// *backwards* — reporting "unverified" for somebody already on email 3.

const DRIP_PROGRESSION = [
  "unverified",
  "verification_sent",
  "email1_pending",
  "email1_sent",
  "email2_sent",
  "email3_sent",
];

function dripRank(status) {
  const i = DRIP_PROGRESSION.indexOf(String(status || ""));
  // An unrecognised status ranks below everything known, so it can never
  // displace a real one — but it still beats having no value at all.
  return i < 0 ? -1 : i;
}

/** Returns whichever of the two statuses is further along the sequence. */
function furthestAlong(a, b) {
  if (!a) return b;
  if (!b) return a;
  return dripRank(b) > dripRank(a) ? b : a;
}

module.exports = { DRIP_PROGRESSION, dripRank, furthestAlong };
