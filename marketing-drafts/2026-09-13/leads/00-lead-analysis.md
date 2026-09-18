# Lead analysis — 2026-09-13

Source: live `list-leads` on `carbonatedaudio.com`, token from `.leads-admin-token` (64 chars). HTTP 200.
Raw pull saved at `/tmp/leads-2026-09-13.json`.

## APD compliance — window is ACTIVE

Read live from `components/apd-window.js`:

```js
var START = Date.parse('2026-08-30T00:00:00Z');
var END   = Date.parse('2026-09-14T23:59:59Z');
```

Today is 2026-09-13, so the window is **active with ~35h left**. Everything in this folder is
Still-only: free product, no bundle, no price, no promo code, no bundle link, no urgency line.

**Discrepancy worth fixing:** the prose comment directly above those constants says
"2026-08-31 through 2026-09-13", which contradicts the constants it introduces. The code is
authoritative and the code says 08-30 → 09-14. The comment is the third place this window has been
mis-stated. Fix the comment, not the constants.

Also relevant: the sent thread to Joe at APD (2026-08-26) states the exclusive as
"August 31 to September 13" to the partner in writing. The code goes dark a day earlier on each
side, which is the safe direction, but partner-facing copy and code disagree by a day at both ends.

## Counts — rows vs people

| | Rows | Unique contacts |
|---|---|---|
| 2026-09-12 baseline | 585 | 482 (as reported) |
| **2026-09-13 now** | **589** | **483** |

- 62 contacts have more than one row. Top repeater `saxophonephone@mail.com` has 10 rows, never
  verified, all Apr 2026 — a loop or bot, not a person to email.
- The 09-12 figure of "482 unique" was counted **without case-normalizing**. There is exactly one
  case-duplicate pair in the database: `reeft@free.fr` / `Reeft@free.fr`. Normalized, the 09-12
  baseline was 481, not 482. Today is 483 normalized / 484 raw. Small, but it means the dedupe
  needs `.lower()` or the count drifts by one permanently.
- Baseline pins exactly to a 2026-09-12T12:00Z cutoff (585 rows / 481 normalized). Reconciles clean:
  585 + 4 = 589, 481 + 2 = 483.

## What is genuinely new since the 09-12 run

**4 new rows, 2 new unique contacts.** That is the whole delta. Complete list:

| Captured | Contact | Status | Referrer | New contact? |
|---|---|---|---|---|
| 09-12T16:53Z | heyjoe@cj.mintemail.com | pending | web.telegram.org | yes |
| 09-12T23:01Z | pieri.federico@ymail.com | pending (2nd row) | carbonatedaudio.com | no |
| 09-13T00:18Z | gino.pasquini@alice.it | **verified** (2nd row) | google.com | no |
| 09-13T07:32Z | renato.ravarino@gmail.com | **verified** | (direct) | yes |

Referrer breakdown for the new ones: 1 Telegram, 1 internal nav, 1 Google, 1 direct. No new
placement signal. All 4 are `still-download` on `/still`.

## The big correction: the 09-11 drafts were SENT, not left unsent

The 09-11 notes say "Gmail drafts, not sent." They **were sent on 2026-09-12T22:47–22:48Z** — I
found them in `in:sent`. Six sends went out: English batch (7 BCC), Italian batch (4 BCC), Chinese,
plus bespoke notes to `yyad04086`, `enewsom` and `dietzmix`. Anyone planning today's copy off the
09-11 file would have re-sent the same recapture to the same people ~24h later.

Two consequences, one good and one bad:

**It worked.** `gino.pasquini@alice.it` received the Italian batch at 22:48Z and verified at
00:18Z — 90 minutes later. That is a direct, attributable recapture conversion. He must now be
**excluded** from every future recapture; his best-ever state is verified.

**One hard bounce.** `freefrqncesco81@gmail.com` returned `550 5.1.1 address not found`. The address
is dead. It is a lead row that can never convert and should go on the suppression list.

## The lead that actually matters today: pieri.federico@ymail.com

He is the only genuinely interesting signal in the delta, and the generic recapture is **wrong** for
him:

- 09-10T10:52Z — requested Still, welcome email sent, never verified.
- 09-12T22:48Z — received the Italian recapture asking him to enter his email again.
- 09-12T23:01Z — **he did exactly that, 13 minutes later.** Referrer `carbonatedaudio.com`, so he
  clicked our link and completed the form.
- Still `pending`. `welcome_sent_at` is populated on both rows, so Resend accepted and sent both
  times.

He has now done the thing we asked, twice, and it has failed twice. Sending him "just enter your
email again" a third time would be telling a cooperative user to repeat a loop that is visibly
broken for his address. Yahoo/ymail filtering is the most likely cause. Draft 01 handles him
differently: no third request, offer to resolve it directly.

## Segments (by contact, best-ever state — never by row)

- **Ever-verified: 113 contacts.** Excluded from all recapture.
- **Never-verified: 370 contacts.**
- **Repeat-pending (2+ rows, never verified): 45 contacts.** These need "we know you tried" copy,
  never "try again."
- **14 contacts have a pending row AND an earlier verified row.** These are the trap the brief
  warned about — `dietzmix@hotmail.com`, `veebanno@gmail.com`, `meritarian@gmail.com`,
  `k-p75@web.de`, `tonynekrews@gmail.com`, `robertcarey456@gmail.com`, `josialesamaral@hotmail.com`
  and others. They re-downloaded; their confirmation did not fail. **Never send them a recapture.**

Referrer breakdown of the 370 never-verified: 211 direct/none, 52 kvraudio, 32 audiofanzine,
17 internal, 15 azu-soundworks, 11 youtube, 10 google, 8 vi-control, 3 rekkerd.

## A second false-copy trap: the `None`-status cohort

286 rows carry `verification_status: null`. These are **not** pending — they predate the
verification system entirely. The boundary is sharp: the earliest row with a status is
2026-08-18T19:03Z, the latest without one is 2026-08-18T19:43Z. 281 of those 286 rows show
`drip_status: email3_sent`, i.e. they received the **full three-email drip** and were never asked
to confirm anything.

Telling this group "your confirmation never went through" would be false for all 286 rows. Any
recapture segment must filter on `verification_status == 'pending'` explicitly — **never on
`!= 'verified'`**, which silently sweeps all 286 in.

## Known live opportunities — checked against today's data

**Audiofanzine French recapture — still fits, do not rewrite.** The 09-09 draft at
`marketing-drafts/2026-09-09/2026-09-09-audiofanzine-pending-french-recapture.md` targets 21
contacts. Re-checked today: **all 21 are still never-verified, zero have converted, none have
dropped out of the database.** The draft is still accurate and still APD-safe (Still only, free,
CTA to `/still`).

One caution against widening it: audiofanzine now shows 32 never-verified contacts, 11 more than the
CSV. Those 11 are all 08-18 `None`-status rows with `email3_sent` — the pre-verification cohort
above. **Do not add them to the French batch.** The 09-09 segmentation was right and the tempting
"cohort has grown" read is wrong. 54 audiofanzine contacts total: 22 verified, 21 pending, 11 legacy.

**azu-soundworks.net** — 23 contacts, 15 never-verified, still no contact address on file. All
UTM-tagged `kvr`, so attribution by `utm_source` remains wrong for this source.

**vi-control.net** — 15 contacts, 9 never-verified, still actively referring (`enewsom@gmail.com`
came through 09-11). `enewsom` was already handled with bespoke copy on 09-12. Still unclaimed.

## Do not email

| Contact | Why |
|---|---|
| `freefrqncesco81@gmail.com` | hard bounce 550 5.1.1, address does not exist |
| `heyjoe@cj.mintemail.com` | `mintemail.com` is a disposable-mailbox provider; referrer `web.telegram.org` |
| `gino.pasquini@alice.it` | verified 09-13, recapture already succeeded |
| `renato.ravarino@gmail.com` | verified on first attempt, drip running normally |
| the 14 pending-but-previously-verified contacts | their confirmation did not fail |
| the 286 `None`-status rows | never had a confirm step to fail |

`mintemail.com` is not in `DISPOSABLE_EMAIL_DOMAINS` in `netlify/functions/capture-lead.js`.
Adding it is a one-line fix.

## Verification of the facts I was handed

- Token file, host, and 401 workaround: confirmed, HTTP 200.
- `DOWNLOAD_GRANT_TTL_MS = 48 * 60 * 60 * 1000` — confirmed, but at **capture-lead.js:12**, not :11.
- HTTP 410 "That link has expired" — confirmed at **verify-still-download.js:39–40**.
- APD window active: confirmed, but end date is **09-14**, and the comment in that same file says
  09-13. See above.
- "585 rows = 482 unique": rows confirmed; the unique figure was un-normalized and should be 481.
- "09-11 drafts are unsent": **false as of today** — they were sent 09-12T22:48Z.
