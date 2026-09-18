# Task 2 - press / influencer - OFFLINE RE-CONTACT DRAFTS - 2026-09-09

## PROVENANCE. READ THIS BEFORE SENDING ANYTHING.
**Gmail was OFFLINE for this run. I read ZERO threads and created ZERO Gmail drafts.**
Nothing in this folder is a reply to a thread I read. For every contact the honest status is
UNKNOWN, not "they did not reply."

Cause, isolated 2026-09-02 and NOT re-investigated today: the `gmail` MCP server is registered in
`~/.claude.json` only under project scopes `/Users/soda` and `/Users/soda/Desktop/carbonator-website`.
This session's cwd is `/`, so no gmail tool exists in the tool list at all. Dead ends already
exhausted and deliberately not retried: `~/.gmail-mcp/`, `~/.claude/gmail-mcp/credentials.json`,
`~/.gmail-agent/emails.db`, the gcloud CLI, the `mcp.google.com` SSE entry.

ONE-LINE FIX, needs one interactive session:
    claude mcp add --scope user --transport http gmail https://gmail.run.tools
then `/mcp` to finish OAuth, then `claude mcp remove gmail -s local` from
`~/Desktop/carbonator-website` to kill the dead SSE entry.

Drafts were also staged on 08-25, 08-30, 09-01, 09-03, 09-05, 09-06, 09-07 and 09-08 with
UNVERIFIABLE send status. **Check Sent Mail before sending anything here or you may be firing
touch 5 or 6.**

## WHAT IS ACTUALLY NEW TODAY
1. **`02-kvr-deal-68117-pull.md` - new, and it is the most urgent item in the entire run.** A live
   KVR deal listing is advertising a bundle discount during the APD exclusivity window. This is
   partner-relations work, not press work, but it is outreach and it belongs here.
2. **BPB is day 34.** The blocking condition was re-measured, not assumed: `mixedbysoda-stack/still`
   last commit is still **2026-07-14T21:02:03Z**, verified today via the GitHub API. 57 days, zero
   commits. Variant (C) remains disqualified. See `01-bedroom-producers-blog.md`.

## CARRIED FORWARD UNCHANGED FROM 2026-09-08
Nothing about these six changed in 24 hours, and rewriting them would only make the record harder to
read. Use the 09-08 files as-is:
`/Users/soda/carbonator-website-seo/marketing-drafts/2026-09-08/press/`
- `02-musictech.md` - social DM to James Langley only. HOLD forever on email.
- `03-plugin-boutique.md` - SEND the Asana resubmit today, needs no inbox. HOLD the Gareth email.
- `04-audio-plugin-guy.md` - SEND submission A today. Submission B (the deal) is dead, drop it.
- `05-rekkerd.md` - HOLD until 2026-09-15. He is a distribution channel, not a lead. Now 6 days out.
- `06-warren-huart.md` - highest blind-send risk on the list. Do not send without reading Sent Mail.
- `07-in-the-mix.md` - gated on the phase fix, which has zero commits behind it.

Note that `05-rekkerd.md` says "HOLD until 2026-09-15" and `04-audio-plugin-guy.md` says the APD
window "closes Sep 13." The authoritative date is **2026-09-14T23:59:59Z**, from
`components/apd-window.js`. Sep 15 is the correct first safe day. The Sep 13 line is a stale
paraphrase of the padded bound, not a second source.
