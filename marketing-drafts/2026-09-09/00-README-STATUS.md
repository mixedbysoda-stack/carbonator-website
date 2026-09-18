# Marketing run - 2026-09-09

## RUN CONDITIONS (verified this session, not assumed)
- **Leads API:** WORKING. `https://carbonatedaudio.com/.netlify/functions/list-leads?token=$(cat .leads-admin-token)`
  returned HTTP 200, 245 KB, **562 leads**. The legacy carbinated-audio.netlify.app URL was not used.
- **Gmail:** ABSENT from the tool list entirely. Not unauthenticated - not registered for this cwd.
  Zero threads read. Zero Gmail drafts created. See `press/00-README-STATUS.md`.
- **Reddit:** NO ACCESS THIS SESSION. Every route was tried and every route failed. Details below.
- **Telegram MCP:** failed to connect. Sent via Bot API instead.
- **Stripe MCP / Google Drive / PayPal / Vercel MCP:** all require OAuth, unavailable non-interactively.
  No sales figures in this run - none were readable, so none are reported.

## APD EXCLUSIVITY - COMPLIANCE STATEMENT
Window is `2026-08-30T00:00:00Z` to `2026-09-14T23:59:59Z` per `components/apd-window.js`.
Today 2026-09-09 is **inside** it. Everything drafted today contains:
no bundle price, no $55, no $129 bundle CTA, no "SAVE $74", no promo code, no bundle checkout link
(neither `dRmbJ16AFbBgcLT6f13oA0k` nor `8x2cN59MR20GfY5bzl3oA0n`), and no "price goes up October 1".

**I re-audited the site rather than trusting the note. The site is clean.** Every `$55` string in
`carbonator.html`, `desipper.html`, `ontap.html`, `pour.html` and `still.html` sits inside a
container carrying `data-apd-hide`, so it is removed from the DOM during the window. `bundle.html`
and `index.html` carry authored $129 twins. This is the fourth run to look at it; it is not a bug.

## !! NEW AND URGENT: THE APD LEAK IS OFF-SITE, NOT ON-SITE !!
KVR news item **68117**, "All 6 Carbonated Audio plugins $45", started **2026-08-17**, is **live
right now** and reads verbatim:

> "All 6 Carbonated Audio plugins are $45 through September 30, 2026 (normally $109)."
> links to `https://carbonatedaudio.com/bundle?utm_source=kvr&utm_medium=referral&utm_campaign=september_bundle&utm_content=deal_68117`

That is a public, still-running, non-APD advertisement of a bundle discount, posted nine days before
the 2026-08-26 written promise to APD that their page would be "the only discounted way to buy any
of it." The site defends itself - anyone who clicks lands on the $129 twin because `apd-window.js`
strips the discount markup - but the **advertisement itself** is the exposure, and the landing
experience is now bait-and-switch: KVR promises $45, the page charges $129.

It is also **factually stale twice over**: 6 plugins (there are 7, TALLBOY shipped) and $45/$109
(the sale is $55 off a $129 regular).

**ACTION FOR SODA, TODAY, HIGHEST PRIORITY IN THIS FILE:** pull or expire KVR deal 68117. If KVR
cannot expire it before Sep 15, mail your APD contact first and disclose it yourself. Re-post it
corrected (7 plugins, $55 / $129) on Sep 15 when the window closes.
This is the one item in today's run that can cost money if ignored.

## LEAD NUMBERS (2026-09-09)
| Metric | Value | vs 2026-09-08 |
|---|---|---|
| Total leads | 562 | - |
| New since last run (>2026-09-08T16:15Z) | **3** | - |
| Last 7 days | 25 | - |
| verification_status = pending | **160** | was 148 on 09-08 (+12) |
| verified | 107 | - |
| not_required | 9 | - |
| no verification field (pre-verification era) | 286 | - |

Source mix, last 7 days: still-download 20, still-footer-home 2, ontap-demo-gate 1, still-success 1,
exit-popup 1. Referrers, last 7 days: carbonatedaudio.com 6, none 6, kvraudio 5, youtube 3,
google 3, audiofanzine 1, vi-control 1.

All-time named-referrer standings (unchanged, re-confirmed): **audiofanzine 54, kvraudio 72**.
Correction to the standing note: KVR is ahead on the all-time count. The "audiofanzine 43 vs KVR 37"
figure holds only for the verification era, and even there KVR has since caught up - 22 of KVR's 72
are pending and 17 verified. Audiofanzine remains the top *editorial* referrer; KVR is the top
overall. Both framings are true, they measure different windows. Do not restate "Audiofanzine beats
KVR" without the qualifier.

## FILES IN THIS DIRECTORY
- `2026-09-09-new-leads-followups.md` - the 3 genuinely new leads, individually addressed
- `2026-09-09-audiofanzine-pending-french-recapture.md` - 21-lead French cohort recapture, accented
- `segment_NEW_since_last_run.csv` (3)
- `segment_audiofanzine_pending_FR.csv` (21)
- `segment_pending_all.csv` (160)
- `press/` - offline re-contact drafts, Gmail was never opened

## REDDIT: ZERO. NOT "NOTHING INTERESTING" - ZERO ACCESS AND ZERO FINDINGS.
Routes attempted and their failures:
1. `www.reddit.com/search.json`, browser UA - returns the HTML interstitial, not JSON
2. `api.reddit.com`, bot-style UA - same interstitial
3. `old.reddit.com` with `-L` - 302 into the same interstitial
4. `api.pullpush.io` (Pushshift successor) - HTTP 429, "does not provide free scraping resources for agents"
5. `WebSearch` with `allowed_domains: reddit.com` - HTTP 400, reddit.com blocks the search user agent
6. Reddit MCP `mcp-config-bc26yt` - present but unauthenticated, and OAuth cannot run non-interactively
7. Unrestricted WebSearch for the brand + reddit - surfaced only KVR and rekkerd pages, no Reddit threads

**Findings: zero mentions confirmed, and zero mentions refuted.** I could not see Reddit at all, so
"there are no mentions" is NOT something this run established. No reply copy was drafted, because
drafting replies to threads I never found would be fabrication.

To restore Reddit for the next run, cheapest first:
- run `/mcp` interactively once and authorise `mcp-config-bc26yt`, or
- create a Reddit script-type app and set `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET`, then hit
  `oauth.reddit.com` - the anonymous `.json` endpoints are gone for good, this will not come back.
