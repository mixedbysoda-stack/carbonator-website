# Reddit / Brand Visibility Report — 2026-09-10

## The honesty rule, stated up front

Without OAuth, "zero mentions found" and "zero mentions exist" are different claims. Today's
result is **zero visibility into Reddit**, not "no one is talking about us." Everything below
that touches Reddit should be read through that lens.

## Routes tried today (per the 2026-09-09 findings, only RSS was worth re-testing)

Tried each of the four target subs once, normal browser UA, then stopped:

| Sub | Route | Result |
|---|---|---|
| r/edmproduction | `/.rss` | **HTTP 200** — 25 entries returned, front page of the sub |
| r/makinghiphop | `/.rss` | HTTP 429 |
| r/audioengineering | `/.rss` | HTTP 429 |
| r/WeAreTheMusicMakers | `/.rss` | HTTP 429 |
| `reddit.com/search.rss?q=carbonator+OR+"de-sipper"+OR+"carbonated audio"` | one attempt | HTTP 429 |

RSS is still the mixed-record route it was on 2026-09-08: it works, intermittently, per-sub, and
rate-limits the moment you lean on it. r/edmproduction came through clean this time;
r/makinghiphop did not (it did on 09-08). Nothing about this is reliable enough to call "working."

**r/edmproduction front page (25 threads, all current as of 2026-09-10 13:10 UTC): no mention of
Carbonator, De-Sipper, On Tap, Pour, TALLBOY, FIZZFUEL, Still, Carbonated Audio, or the legacy
"Carbinated Audio" spelling.** One regex hit on "still" in the raw feed was a false positive —
it landed inside an HTML-entity-truncated fragment, not a real sentence using the word "Still" as
the plugin name. There is nothing to draft a reply to from this feed.

The other three subs and the brand-term search.rss query are **unseen, not confirmed empty** —
they 429'd before returning anything. No claim is made about what is or isn't being posted there
today.

Reddit MCP (`mcp-config-bc26yt`) is still listed as requiring authorization this session — same
unauthenticated state as every prior run. Not retested beyond confirming it's still gated.

## WebSearch findings (unrestricted, no domain filter — this route works)

No Reddit threads turned up in WebSearch either. A direct `"Carbonator" saturation plugin
site:reddit.com` query returned zero Reddit results — only unrelated beverage-carbonator patents.
That's consistent with "no visibility," not "no discussion exists" — Google's index of Reddit is
known to lag and Reddit itself blocks the crawler per the 09-09 findings (route 5).

Real coverage WebSearch did surface (all off-Reddit, all previously known or adjacent to known
press hits):

- KVR Audio, Rekkerd.org, and Audio Plugin Guy have live news items for Carbonator, De-Sipper,
  On Tap, Pour, TALLBOY, FIZZFUEL, and Still (both current "Carbonated Audio" spelling and legacy
  "Carbinated Audio"-titled articles are indexed — the old spelling is still crawlable).
- Audio Plugin Deals has a live product listing for a "3-in-1 Bundle by Carbonated Audio."
- plugins.audio has a FIZZFUEL listing.
- **New since last check: azu-soundworks.net published a Japanese-language article on Still on
  2026-09-05** (see below) — this is a real, previously-uninvestigated placement.
- No new third-party reviews, forum threads, or social posts outside the above turned up for any
  product since 2026-09-01.

## KVR news item 68117 — status check (concrete deliverable, verified)

URL: https://www.kvraudio.com/news/all-6-carbonated-audio-plugins-45-68117

Direct `curl` fetch was blocked (HTTP 403, Cloudflare "Just a moment..." challenge page — same
protection that blocks vi-control.net, see below). Went through WebFetch's rendering path instead
and asked it twice, the second time for verbatim quotes only. Both passes agree:

- **The deal badge on the page reads "DEAL EXPIRED."**
- Deal dates shown: **Started August 17, 2026, Ended August 26, 2026.**
- The article's body copy still reads: *"All 6 Carbonated Audio plugins are $45 through September
  30, 2026 (normally $109)."*

Those two facts don't agree with each other — KVR's own expiry badge says the deal closed on
8/26, but the promotional sentence in the article body still promises pricing "through September
30." That's stale copy on KVR's end, not evidence the deal is transactable today. **Best read:
the $45/6-plugin listing is marked expired by KVR's own system as of 2026-09-10 and is not a live
purchase path right now** — it does NOT currently look like an active breach of the Audio Plugin
Deals exclusivity window (2026-08-30 through 2026-09-14, confirmed live in
`/Users/soda/carbonator-website-seo/components/apd-window.js` today). Given the inconsistent copy
on KVR's own page, this is worth a human eyeball, not a full stand-down — if KVR's system is wrong
about the expiry (rather than the leftover sentence being wrong), it would matter.

For comparison: the leak flagged in a prior run, deal **68117 was this same item** — so this is
the same listing, now showing expired rather than live. No new discount leak found today.

## azu-soundworks.net (23 leads, previously uninvestigated) — identified

This is a Japanese DTM (music production) blog that rounds up free plugins. Confirmed via the
site's own search:

- `?s=carbonator` → 0 results (they never wrote about Carbonator specifically)
- `?s=carbonated+audio` → **1 result**:
  **「【無料】Carbonated Audio「Still」｜ボーカルや配信のヒスノイズを即座に削減、ワンノブ操作のリアルタイムノイズ除去プラグイン」**
  ("[Free] Carbonated Audio 'Still' — instantly reduce hiss noise for vocals and streaming, a
  one-knob real-time noise removal plugin")
  Published 2026/9/5, filed under 無料のDTMソフトウェア (Free DTM Software).
  URL: https://azu-soundworks.net/【無料】carbonated-audio「still」｜ボーカルや配信のヒスノイズを即座に削減/

That single post is almost certainly the entire source of the 23 leads — it's a free-tool roundup
site with real DTM-producer traffic, and Still is the only Carbonated Audio product with zero
friction (no purchase, no email gate mentioned) for that audience to try. Nobody had looked at
this before; now it's identified and attributable to one specific article.

## vi-control.net (15 leads, previously uninvestigated) — could not confirm content

vi-control.net returned **HTTP 403 on every direct fetch attempt** (the thread page, both
candidate threads found by title search) — same Cloudflare-style bot wall blocking KVR's raw
HTML. WebSearch surfaced two plausibly-relevant existing threads by title:

- "Best Free Noise Reduction Plugins?" — vi-control.net/community/threads/best-free-noise-reduction-plugins.81397/
- "Noise reduction plugin - need recommendations" — vi-control.net/community/threads/noise-reduction-plugin-need-recommendations.143864/

Both are on-topic for Still (composer/VI forum, noise reduction ask), which makes them plausible
homes for an organic mention that drove the 15 leads. **This is a hypothesis, not a confirmed
finding** — no search combination surfaced actual post text naming Carbonated Audio, Still,
Carbonator, or carbonatedaudio.com on that domain, and the 403 wall means it can't be verified by
fetching the threads directly. Treat "vi-control.net traffic likely comes from an organic mention
in a noise-reduction-plugin thread" as an educated guess that needs a logged-in human visit to
confirm, not a fact.

## Catalog / constraint facts double-checked before drafting anything

- Carbonator's five modes, verified against `/Users/soda/carbonator-website-seo/carbonator.html`:
  **Cola, Cherry, Grape, Lemon-Lime, Orange Cream**, plus one-knob "Carbonated" blend mode. The
  page's own copy describes what each one *sounds like* (Cola = console-style warmth, Cherry =
  aggressive tube distortion, Grape = lo-fi digital destruction, Lemon-Lime = harmonic exciter,
  Orange Cream = resonant lowpass with warm drive) — those descriptive words (tube, tape,
  transistor, etc.) are not the mode names and were not used as such anywhere in this run. Note
  for the record: some third-party press copy picked up via WebSearch today (Audio Plugin Guy,
  Rekkerd via legacy "Carbinated Audio" search) does mis-describe the flavors as "tube, tape,
  transistor, transformer, diode" — that's their error, not something to repeat.
- APD exclusivity window confirmed live today by reading
  `/Users/soda/carbonator-website-seo/components/apd-window.js` directly: START
  2026-08-30T00:00:00Z, END 2026-09-14T23:59:59Z. 2026-09-10 is inside it.
- No Reddit or forum copy was drafted with any discount, "$55," "SAVE $74," "$129 value," promo
  code, or the `dRmbJ16AFbBgcLT6f13oA0k` link, per the active constraint.

## Reply drafts

**None.** No thread was surfaced today — by RSS or by WebSearch — that meets the bar of "a real
thread worth engaging." r/edmproduction's current front page has no opening for any product, and
the three other target subs plus the brand-term Reddit search returned nothing (429s, not empty
results). Manufacturing a reply to a thread that wasn't actually found would violate the honesty
rule this task exists to enforce.

## What Soda should take from this run

1. **azu-soundworks.net is a confirmed, attributable placement** (Still article, 2026/9/5) — the
   first time anyone has traced those 23 leads to a specific page. No action needed, it's already
   working; just noting the source is now known.
2. **vi-control.net is still a guess**, not a finding. Someone needs to log into vi-control.net
   directly (browser, not this agent — it's Cloudflare-walled) and search "Still" or "Carbonated"
   to confirm where the 15 leads are coming from.
3. **KVR 68117 looks expired, but its own page contradicts itself** (expired badge vs. "through
   September 30" body copy). Worth a 30-second human look to make sure it isn't still buyable
   during the live APD exclusivity window.
4. Reddit itself remains fully dark except for one lucky RSS pull on one sub with nothing on it.
   See `01-unblock-reddit.md`.
