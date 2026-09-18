# Lead analysis - 2026-09-11

Source: live `list-leads` on carbonatedaudio.com (token from `.leads-admin-token`), pulled 2026-09-11 ~12:30Z. HTTP 200.

## APD compliance
The APD window (2026-08-30T00:00Z to 2026-09-14T23:59:59Z, `components/apd-window.js`) is active today. Every draft here is about Still only: no bundle, no price, no code, no bundle link, no urgency line.

## Totals
- **581 leads** (the API's `total` field), vs 574 at the 2026-09-10 pull, so **+7 new rows** since yesterday's 12:54Z cutoff.
- All 7 are `still-download` on `/still`. **1 verified, 6 pending.**
- verification_status across all rows: {'pending': 171, 'verified': 115, 'not_required': 9, None: 286}
- Since 2026-09-10T00Z: 19 event rows (18 unique; veebanno@gmail.com submitted twice).
- Verified overnight: labellezzasalvailmondo8@gmail.com (Resend "Verified" notice 2026-09-11 10:33Z). It has been dropped from the Italian nudge.

## New since the 09-10 pull
| Captured | Contact | Status | Referrer | utm_source |
|---|---|---|---|---|
| 2026-09-10T16:06Z | gino.pasquini@alice.it | pending | (blank) | (none) |
| 2026-09-10T18:15Z | lacrotastudio@gmail.com | pending | (blank) | (none) |
| 2026-09-10T22:56Z | madanidhiaeddine@gmail.com | pending | https://www.kvraudio.com | kvr |
| 2026-09-11T02:37Z | monji_onesongs@ybb.ne.jp | verified | https://carbonatedaudio.com | (none) |
| 2026-09-11T03:52Z | 1844352914@qq.com | pending | (blank) | (none) |
| 2026-09-11T08:10Z | lynesabyofstudio29@gmail.com | pending | https://blog.worthytutors.com | (none) |
| 2026-09-11T09:06Z | debenedictisbruno@yahoo.it | pending | (blank) | (none) |

## Referrer vs UTM
- None of today's 7 has the azu-soundworks mismatch pattern. madanidhiaeddine@gmail.com has referrer kvraudio.com and utm kvr/referral/still_launch, which agree.
- **New referrer: blog.worthytutors.com** (lynesabyofstudio29@gmail.com). The site's own search for "carbonated" returns 0 posts, so the lead is unattributed. It may be a scraper or a spammy link. It hasn't been investigated beyond that one search.
- monji_onesongs@ybb.ne.jp (Japanese, verified) has referrer carbonatedaudio.com, which is internal navigation, so the original source is lost. It is plausibly the azu-soundworks tail but that is unconfirmed.
- From the 09-10 cohort (already counted yesterday), bluesman288@gmail.com came from **copilot.microsoft.com** with utm_source=copilot.com. That's an AI-assistant referral, worth noting for AI-SEO.
- 4 of 7 have a blank referrer. Two are Italian addresses (alice.it, yahoo.it), so the Italian cluster continues with no visible source.

## Yesterday's nudge drafts were NOT sent
I checked Gmail `in:sent` and the Resend sent log (last 100). Neither has the 09-10 "Your Still link is still good today" or the Italian nudge. Today's drafts fold that cohort in with the new pending leads. The CTA goes to carbonatedaudio.com/still, which mints a fresh token, never the old confirm link.

## Follow-ups drafted (Gmail drafts, not sent)
| Draft ID | Cohort | Recipients (BCC) |
|---|---|---|
| r4501662948977420150 | English | bluesman288, gazebodeluxe, deeastudioct, lacrotastudio, madanidhiaeddine, lynesabyofstudio29, yves@vcstudios.eu |
| r-7300838518375621933 | Italian | agostinoprovensal, pieri.federico, gino.pasquini, debenedictisbruno |
| r428467633692369414 | Simplified Chinese | 1844352914@qq.com |

Excluded: veebanno@gmail.com (the first request already verified), and everything older than 09-10 (the 160-odd backlog, which is a separate decision).
Supersedes 2026-09-10 files 01 and 03. File 02 (Yves personal) is also covered by the English draft; send one or the other, not both.
Body text is in `01-recapture-drafts.md`.

## Sales (Stripe live)
- Last 24h: **$0** (no succeeded charges since 2026-09-09).
- 2026-09-09: bundle **$109.00** (jcolon.gang123). A $109 bundle attempt from xoplane was declined the same day.
- 2026-09-06: FIZZFUEL $29 (metadata product=octane).
- pgreyy@gmail.com got a "5-in-1 Bundle" license email 2026-09-07 with no matching charge. It's probably a $0 coupon or comp checkout; I haven't verified it against checkout sessions.
