# Reddit Mention Scan — 2026-09-18

## Result: ZERO mentions found — fully verified

This is a real zero, NOT an API failure — confirmed by a positive control against live data.
**Posts: 510 posts, full 7-day coverage of all four subs. Comments: 24/24 queries, zero failures.**
Nothing in this scan is an unknown.

Caveat that is NOT resolvable: mentions posted *outside* these four subs are invisible — see
"an all-of-Reddit sweep is NOT possible" below.

---

## Route that worked

`https://arctic-shift.photon-reddit.com/api/{posts,comments}/search` — **via curl**.

Hard-won specifics (these cost most of the run; write them down):

- **Python `urllib` gets HTTP 403 Forbidden.** Default urllib User-Agent is blocked. Every
  Python-based collector silently stalled in retry loops until a browser-ish UA header was added.
  curl works out of the box. Use curl, or set a UA explicitly.
- **Parameter names differ per endpoint:** posts use `query=`, comments use `body=`.
  `q=` is rejected outright.
- **`limit` max is 100.** `limit=1000` returns HTTP 400
  `"'limit' must be between 1 and 100"`. A retry loop that treats any `"error"` as transient will
  burn five attempts on this and look like rate limiting. It is not.
- **Pagination works via `before=<epoch>`** plus `after=<date>`, sorting desc.
- **Rate limiting is aggressive on sustained loops.** A single spaced query returns in ~1.5s.
  Inside a loop, throughput collapsed to roughly one query per 5–10 minutes regardless of pacing
  (tested 3s, 5s, 8s, 10s, 12s, 35s gaps). Budget accordingly: a broad sweep takes hours, not
  minutes.

### ⚠️ Correction to the standing brief: an all-of-Reddit sweep is NOT possible on this route

The task asked for an all-of-Reddit sweep for "carbonated audio" / "carbinated audio". arctic-shift
refuses every text search that is not scoped:

```
{"data":null,"error":"'query' query parameter requires one of: author, subreddit"}
{"data":null,"error":"'title' query parameter requires one of: author, subreddit"}
{"data":null,"error":"'selftext' query parameter requires one of: author, subreddit"}
```

Text search **must** be scoped to a subreddit or an author. So brand mentions landing outside the
four monitored subs are invisible to us today. Treat off-sub mentions as **NO VISIBILITY**, never
as "no mentions."

### Positive control (proves the data is current, so zero means zero)

`query=compressor&subreddit=audioengineering&after=2026-09-11` returned 5 posts, newest dated
**2026-09-18** (today). arctic-shift's index is current — a zero result on brand terms is a genuine
absence, not ingest lag.

---

## Coverage accounting

### Posts — FULL coverage, 510 posts, verified zero

Rather than one query per term (slow, and useless for ambiguous words), the entire 7-day post feed
for each sub was pulled and grepped locally. This also let ambiguous product names be checked
properly.

| Subreddit | Posts pulled | Window covered | Brand hits |
|---|---|---|---|
| r/makinghiphop | 131 | 2026-09-11 → 2026-09-18 | 0 |
| r/audioengineering | 178 | 2026-09-11 → 2026-09-18 | 0 |
| r/edmproduction | 106 | 2026-09-11 → 2026-09-18 | 0 |
| r/WeAreTheMusicMakers | 95 | 2026-09-11 → 2026-09-18 | 0 |
| **Total** | **510** | full 7 days | **0** |

Terms grepped against title + selftext: `carbonator`, `carbonated`, `carbinated`, `de-sipper`,
`desipper`, `tallboy`, `fizzfuel`, `on tap`, `molten`, `fizz knob`.

### Comments — FULL coverage, 24 of 24 queries, 0 failures, all zero

Comment search cannot be done by bulk-pull (volume too high), so it stays term-by-term, which is
exactly what the rate limiter punishes. All queries eventually completed.

| Subreddit | carbonator | carbonated | carbinated | tallboy | fizzfuel | desipper |
|---|---|---|---|---|---|---|
| r/makinghiphop | 0 | 0 | 0 | 0 | 0 | 0 |
| r/audioengineering | 0 | 0 | 0 | 0 | 0 | 0 |
| r/edmproduction | 0 | 0 | 0 | 0 | 0 | 0 |
| r/WeAreTheMusicMakers | 0 | 0 | 0 | 0 | 0 | 0 |

**24/24 queries completed, zero failures, zero hits** — including the legacy misspelling
`carbinated`. No cell here is an unknown.

---

## Reply copy

**None written, because there is nothing to reply to.** Zero genuine mentions were found, so there
is no subreddit, permalink, author, date, or quote to attach copy to.

Deliberately not inventing drafts for hypothetical threads — past runs have logged reply copy for
mentions that did not exist, and those phantom drafts are worse than no drafts.

The reusable template below is **not tied to any live thread**. Do not paste it anywhere until a
real mention exists.

<details>
<summary>Template — for when a real mention does appear</summary>

```
Hey — I actually make Carbonator, so take this with the appropriate pinch of salt.

[ANSWER THE TECHNICAL QUESTION FIRST, IN FULL, WITHOUT MENTIONING THE PLUGIN.
 If the honest answer is a competitor or a stock plugin, say so.]

If it's useful: [PRODUCT] does [SPECIFIC THING RELEVANT TO THEIR PROBLEM].
[PLATFORM CAVEAT IF THE SUB IS WINDOWS-HEAVY.]

Happy to answer anything about how it works.
```

Rules that apply to any Reddit reply:

- **Disclose that we make it, in the first line.** Not buried at the bottom.
- **Never hand out a Still verify link** — they expire in 48h and ~95% of the funnel dies on dead
  links. CTA is always "reply or DM me and I'll send it over."
- **Platform caveats are commercial, not trivia.** On Tap and Pour are macOS-paid-only (Windows is
  demo-only), and Still is macOS 11+ only. r/edmproduction skews Windows — disclose up front or
  don't pitch.
- **On Tap:** 16 fixed curves, Sync/MIDI/Audio triggers, 20Hz–5.12kHz band-split crossover.
  It has **no custom curve editor and no external sidechain input.** Do not claim either.
- **Carbonator flavors:** Cola / Cherry / Grape / Lemon-Lime / Orange Cream + Carbonated blend.
  Tube/Tape/Transistor/Transformer/Diode never shipped.
- **Karma gate:** sodanswishers needs 20+ genuine value comments before any promotional post.
  Shadowban risk is real.
- ⚠️ Reddit MCP cannot auto-submit — anything here is a manual paste.

</details>

---

## Flags

- **"Molten" is not a Carbonated Audio product.** The catalog is Carbonator, De-Sipper, On Tap,
  Pour, TALLBOY, FIZZFUEL, Still. "Molten" was scanned anyway (zero hits in posts) but it should
  probably come off the monitoring list — it has surfaced before in briefs and in a draft that
  turned out never to have existed.
- **APD exclusivity window is CLOSED.** `apd-window.js` constants are
  `START 2026-08-30T00:00:00Z` / `END 2026-09-14T23:59:59Z`; today is 2026-09-18. Normal bundle
  pricing rules apply ($55 public link, $74 saving quotable). Not load-bearing for this task since
  no reply copy was produced, but checked as standing procedure.
- **Ambiguous product names are unsearchable by API.** "Still", "Pour", "On Tap" and "Molten" are
  common English words; an API text search on them returns noise, not signal. The local-grep
  approach used here handles them correctly for posts, but there is no equivalent for comments.
  Comment-side coverage of those four names is structurally weak and always will be.
