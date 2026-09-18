// Creator video watcher: finds new YouTube uploads from SIGNED creators that
// mention Carbonated Audio, a plugin, or the creator's own code, so a review
// gets noticed the day it goes up. Driven by creator-video-watch.js (daily
// scheduled function).
//
// Where the videos come from, in order, and why:
//   1. YouTube Data API v3, only when YOUTUBE_API_KEY is set. One
//      playlistItems call per channel (1 unit of the free 10,000/day quota)
//      returns the last 25 uploads with full descriptions. The only source
//      that is documented and stable.
//   2. The channel's own Videos / Shorts / Live tabs, plus each new video's
//      watch page for its description. Same HTML a browser gets; field paths
//      checked against a live channel on 2026-09-17. YouTube can answer
//      datacenter IPs with a bot check instead of the watch page, which is why
//      the API key matters.
//   3. The channel RSS feed, last resort only. On 2026-09-17
//      feeds/videos.xml answered 404 or 500 for 4 of 6 channels tested and an
//      empty feed for a fifth, and it has had multi-day outages before.
//
// Nothing here fails quietly: a run that cannot read any channel is a failed
// run and two in a row email SODA; a video is only marked seen after it was
// evaluated; a video judged on its title alone (description unreadable) is
// reported; a hit keeps an unsent_ marker until Resend accepted the email.
//
// Roster is signed creators only (SODA, 2026-09-16): every creators-store
// record that is not "ended", plus anyone holding creator-2026 codes in Stripe
// who has no board record yet (codes minted from the terminal or the Stripe
// dashboard). Everything here only reads the creators and applications stores.
//
// Blobs store "creator-videos":
//   channel_<UC id>  seen video ids, retries, repeated sponsor lines, scanned tabs
//   resolve_<sha1>   channel link -> UC id, 30 days
//   hit_<video id>   a matching video and when it was emailed
//   unsent_<video id> a hit whose email has not been accepted yet
//   issue_<key>      setup problems, re-sent every few days while they last
//   health           last run summary and the failed-run streak
//   lock             best-effort guard against duplicate scheduled invocations
const crypto = require("crypto");
const { getBlobStore } = require("./store");
const { escapeHtml } = require("./escape");
const C = require("./creators");

const STORE_NAME = "creator-videos";
const DAY_MS = 24 * 60 * 60 * 1000;
const PROGRAM_START_UNIX = Math.floor(Date.parse(`${C.PROGRAM_START}T00:00:00Z`) / 1000);
const BOARD_URL = "https://carbonatedaudio.com/partners-admin";

const LIMITS = {
  seenCap: 800,
  lineSeenCap: 300,
  apiMaxResults: 25,
  firstScanDetailsPerTab: 4, // first scan of a tab: newest N get descriptions, older ones are judged on titles
  detailsPerChannel: 8, // later scans: watch-page fetches per channel per run, the rest wait for the next run
  detailConcurrency: 3,
  channelConcurrency: 3,
  maxDetailAttempts: 3,
  resolveTtlMs: 30 * DAY_MS,
  pageTimeoutMs: 8000,
  apiTimeoutMs: 8000,
  rssTimeoutMs: 6000,
  lockMs: 5 * 60 * 1000,
  // Kept free at the end of the run for issues, the email and the final
  // writes. Fetch timeouts are clipped so in-flight requests end before it.
  reserveMs: 8000,
  pendingMaxAgeMs: 14 * DAY_MS,
};
const RENOTIFY = { normal: 14 * DAY_MS, soon: 7 * DAY_MS, urgent: 3 * DAY_MS };

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  // Pre-answers the EU consent interstitial in case a request lands where it is shown.
  Cookie: "SOCS=CAI",
};

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------
const store = () => getBlobStore(STORE_NAME);
const sha1 = (v) => crypto.createHash("sha1").update(String(v)).digest("hex");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isChannelId = (v) => /^UC[\w-]{22}$/.test(String(v || ""));
const isVideoId = (v) => /^[\w-]{11}$/.test(String(v || ""));
const compact = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const dig = (obj, path) => path.split(".").reduce((v, k) => (v && typeof v === "object" ? v[k] : undefined), obj);
const hostOf = (url) => { try { return new URL(url).hostname; } catch { return ""; } };

async function mapLimit(items, limit, fn) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift());
  });
  await Promise.all(workers);
}

// Reads every record under a prefix and THROWS when Blobs does, unlike
// creators.js listCreators(), which returns [] on errors. An unreadable board
// must fail the run, not look like an empty one.
async function listJson(storeName, prefix) {
  const s = getBlobStore(storeName);
  const { blobs } = await s.list(prefix ? { prefix } : {});
  const recs = await Promise.all(blobs.map(async ({ key }) => {
    const v = await s.get(key, { type: "json" });
    return v ? { key, ...v } : null;
  }));
  return recs.filter(Boolean);
}

// ---------------------------------------------------------------------------
// HTTP. Error messages never contain the URL, so an API key cannot leak into
// logs, Blobs or the owner email.
// ---------------------------------------------------------------------------
async function httpGet(url, { timeoutMs = 8000, headers = BROWSER_HEADERS } = {}) {
  if (typeof fetch !== "function") throw new Error("global fetch is unavailable (Node 18+ required)");
  let res;
  let body;
  try {
    res = await fetch(url, { headers, redirect: "follow", signal: AbortSignal.timeout(Math.max(1000, timeoutMs)) });
    body = await res.text();
  } catch (err) {
    const timedOut = err && (err.name === "TimeoutError" || err.name === "AbortError");
    throw new Error(timedOut ? "timed out" : `network error (${(err && err.cause && err.cause.code) || (err && err.name) || "fetch failed"})`);
  }
  return { status: res.status, url: res.url || url, body };
}

// Balanced-brace slice of the object literal that starts right after `from`, string-aware.
function sliceJsonObject(text, from) {
  const start = text.indexOf("{", from);
  if (start === -1 || start - from > 20) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    if (inStr) {
      if (esc) esc = false;
      else if (ch === 92) esc = true; // backslash
      else if (ch === 34) inStr = false; // quote
      continue;
    }
    if (ch === 34) inStr = true;
    else if (ch === 123) depth++;
    else if (ch === 125 && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

function extractAssignedJson(html, name) {
  for (const marker of [`var ${name} = `, `window["${name}"] = `]) {
    let at = html.indexOf(marker);
    while (at !== -1) {
      const raw = sliceJsonObject(html, at + marker.length);
      if (raw) {
        try { return JSON.parse(raw); } catch { /* keep looking */ }
      }
      at = html.indexOf(marker, at + marker.length);
    }
  }
  return null;
}

function decodeXml(s) {
  const cp = (n) => { try { return String.fromCodePoint(n); } catch { return ""; } };
  return String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => cp(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => cp(parseInt(d, 10)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// ---------------------------------------------------------------------------
// channel links
// ---------------------------------------------------------------------------
function parseYouTubeRef(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  if (isChannelId(s)) return { kind: "channel", value: s };
  if (/^@[^\s/?#]{3,}$/.test(s)) return { kind: "handle", value: s };
  let u;
  try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { return null; }
  const host = u.hostname.toLowerCase().replace(/^(www|m|music)\./, "");
  if (host === "youtu.be") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    return isVideoId(id) ? { kind: "video", value: id } : null;
  }
  if (host !== "youtube.com") return null;
  const parts = u.pathname.split("/").filter(Boolean).map((p) => { try { return decodeURIComponent(p); } catch { return p; } });
  const [first, second] = parts;
  if (!first) return null;
  if (first === "channel") return isChannelId(second) ? { kind: "channel", value: second } : null;
  if (first.startsWith("@") && first.length > 1) return { kind: "handle", value: first };
  if (first === "watch") { const v = u.searchParams.get("v"); return isVideoId(v) ? { kind: "video", value: v } : null; }
  if (["shorts", "live", "embed"].includes(first)) return isVideoId(second) ? { kind: "video", value: second } : null;
  if (first === "c" || first === "user") return second ? { kind: first, value: second } : null;
  if (["feed", "results", "playlist", "hashtag", "post", "redirect", "account", "premium", "about"].includes(first)) return null;
  return { kind: "custom", value: first };
}

function refPageUrl(ref) {
  const enc = encodeURIComponent;
  switch (ref.kind) {
    case "channel": return `https://www.youtube.com/channel/${ref.value}`;
    case "handle": return `https://www.youtube.com/@${enc(ref.value.slice(1))}`;
    case "c": return `https://www.youtube.com/c/${enc(ref.value)}`;
    case "user": return `https://www.youtube.com/user/${enc(ref.value)}`;
    case "custom": return `https://www.youtube.com/${enc(ref.value)}`;
    case "video": return `https://www.youtube.com/watch?v=${ref.value}`;
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// YouTube Data API
// ---------------------------------------------------------------------------
const API_BASE = "https://www.googleapis.com/youtube/v3";
// Reasons that describe the key itself (bad, restricted, API not enabled, out
// of quota), as opposed to one playlist or channel.
const KEY_REASONS = new Set([
  "keyInvalid", "API_KEY_INVALID", "keyExpired", "API_KEY_EXPIRED", "accessNotConfigured", "SERVICE_DISABLED",
  "quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded", "userRateLimitExceeded", "ipRefererBlocked",
  "API_KEY_HTTP_REFERRER_BLOCKED", "API_KEY_IP_ADDRESS_BLOCKED", "API_KEY_SERVICE_BLOCKED", "API_KEY_ANDROID_APP_BLOCKED", "API_KEY_IOS_APP_BLOCKED",
]);

async function apiGet(path, params, ctx) {
  const qs = new URLSearchParams({ ...params, key: ctx.apiKey }).toString();
  const res = await httpGet(`${API_BASE}/${path}?${qs}`, { timeoutMs: ctx.budget(LIMITS.apiTimeoutMs), headers: { Accept: "application/json" } });
  let data = null;
  try { data = JSON.parse(res.body); } catch { /* reported below */ }
  if (res.status === 200 && data) return data;
  const e = (data && data.error) || {};
  const reasons = [dig(e, "errors.0.reason"), ...((e.details || []).map((d) => d && d.reason)), e.status].filter(Boolean);
  const reason = reasons.find((r) => KEY_REASONS.has(r)) || reasons[0] || "";
  const detail = String(e.message || "").split(ctx.apiKey).join("[key]").slice(0, 140);
  const err = new Error(`YouTube API HTTP ${res.status}${reason ? ` ${reason}` : ""}${detail ? `: ${detail}` : ""}`);
  err.status = res.status;
  err.reason = reason;
  err.keyLevel = res.status === 429 || reasons.some((r) => KEY_REASONS.has(r)) || (res.status === 400 && /api key/i.test(e.message || ""));
  throw err;
}

// A key-level failure stops API use for the rest of the run and is reported.
// Anything else (one private playlist, a 5xx) only falls back for that channel.
function noteApiError(ctx, err) {
  if (err.keyLevel && !ctx.apiDisabled) ctx.apiDisabled = { status: err.status, reason: err.reason || "", message: err.message };
}

async function resolveViaApi(ref, ctx) {
  if (ref.kind === "video") {
    const data = await apiGet("videos", { part: "snippet", id: ref.value }, ctx);
    return dig(data, "items.0.snippet.channelId") || null;
  }
  const params = { part: "id" };
  if (ref.kind === "handle") params.forHandle = ref.value;
  else if (ref.kind === "user") params.forUsername = ref.value;
  else return null; // /c/ and bare custom URLs have no API lookup; the page resolves them
  const data = await apiGet("channels", params, ctx);
  return dig(data, "items.0.id") || null;
}

function apiItemsToVideos(items) {
  const videos = [];
  let title = "";
  for (const it of items || []) {
    const sn = it.snippet || {};
    const cd = it.contentDetails || {};
    const id = cd.videoId || dig(sn, "resourceId.videoId");
    if (!isVideoId(id)) continue;
    if (!cd.videoPublishedAt && /^(private|deleted) video$/i.test(sn.title || "")) continue;
    title = title || sn.videoOwnerChannelTitle || sn.channelTitle || "";
    videos.push({ id, title: sn.title || "", description: sn.description || "", published_at: cd.videoPublishedAt || sn.publishedAt || "", kind: "video", group: "uploads", has_details: true });
  }
  return { videos, title };
}

async function listViaApi(channelId, ctx) {
  const params = { part: "snippet,contentDetails", maxResults: String(LIMITS.apiMaxResults) };
  let data;
  try {
    data = await apiGet("playlistItems", { ...params, playlistId: `UU${channelId.slice(2)}` }, ctx);
  } catch (err) {
    if (err.status !== 404) throw err;
    // UU<id> is the uploads playlist by convention. Confirm before treating a
    // 404 as "no uploads", so a convention change cannot silently blind us.
    const ch = await apiGet("channels", { part: "contentDetails", id: channelId }, ctx);
    if (!dig(ch, "items.0.id")) throw new Error("YouTube API: channel not found");
    const uploads = dig(ch, "items.0.contentDetails.relatedPlaylists.uploads");
    if (!uploads || uploads === `UU${channelId.slice(2)}`) return { videos: [], channel_title: "", partial_errors: [], loaded_groups: ["uploads"] };
    data = await apiGet("playlistItems", { ...params, playlistId: uploads }, ctx);
  }
  const { videos, title } = apiItemsToVideos(data.items);
  return { videos, channel_title: title, partial_errors: [], loaded_groups: ["uploads"] };
}

// ---------------------------------------------------------------------------
// channel pages
// ---------------------------------------------------------------------------
function collectItems(node, tab, out) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { for (const n of node) collectItems(n, tab, out); return; }
  const kindFor = tab === "shorts" ? "short" : tab === "streams" ? "live" : "video";
  const lvm = node.lockupViewModel;
  if (lvm && typeof lvm === "object") {
    if (isVideoId(lvm.contentId) && (!lvm.contentType || lvm.contentType === "LOCKUP_CONTENT_TYPE_VIDEO")) {
      out.push({ id: lvm.contentId, title: dig(lvm, "metadata.lockupMetadataViewModel.title.content") || "", kind: kindFor, group: tab, has_details: false });
    }
    return;
  }
  const slvm = node.shortsLockupViewModel;
  if (slvm && typeof slvm === "object") {
    const id = dig(slvm, "onTap.innertubeCommand.reelWatchEndpoint.videoId") || String(slvm.entityId || "").replace(/^shorts-shelf-item-/, "");
    if (isVideoId(id)) out.push({ id, title: dig(slvm, "overlayMetadata.primaryText.content") || "", kind: "short", group: tab, has_details: false });
    return;
  }
  const vr = node.videoRenderer || node.gridVideoRenderer || node.reelItemRenderer;
  if (vr && typeof vr === "object") {
    if (isVideoId(vr.videoId)) {
      const t = vr.title || vr.headline || {};
      out.push({ id: vr.videoId, title: t.simpleText || (t.runs || []).map((r) => r.text).join("") || "", kind: node.reelItemRenderer ? "short" : kindFor, group: tab, has_details: false });
    }
    return;
  }
  for (const k of Object.keys(node)) collectItems(node[k], tab, out);
}

function parseChannelTab(html, wantedTab) {
  const data = extractAssignedJson(html, "ytInitialData");
  if (!data) return null;
  const tabs = (dig(data, "contents.twoColumnBrowseResultsRenderer.tabs") || [])
    .map((t) => t && (t.tabRenderer || t.expandableTabRenderer))
    .filter(Boolean)
    .map((tr) => ({
      tail: String(dig(tr, "endpoint.commandMetadata.webCommandMetadata.url") || "").split("?")[0].split("/").pop(),
      selected: Boolean(tr.selected),
      content: tr.content,
    }));
  const selected = tabs.find((t) => t.selected);
  const items = [];
  // A channel without the requested tab still answers 200, with Home selected,
  // and Home can feature other channels' videos. Only read the tab asked for.
  if (selected && selected.tail === wantedTab) collectItems(selected.content, wantedTab, items);
  return {
    channel_id: dig(data, "metadata.channelMetadataRenderer.externalId") || "",
    channel_title: dig(data, "metadata.channelMetadataRenderer.title") || "",
    available: new Set(tabs.map((t) => t.tail)),
    items,
  };
}

async function fetchTab(channelId, tab, ctx) {
  const res = await httpGet(`https://www.youtube.com/channel/${channelId}/${tab}`, { timeoutMs: ctx.budget(LIMITS.pageTimeoutMs) });
  if (/(^|\.)consent\.(youtube|google)\.com$/.test(hostOf(res.url))) throw new Error("consent interstitial");
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  const parsed = parseChannelTab(res.body, tab);
  if (!parsed) throw new Error(/confirm you.re not a bot|unusual traffic/i.test(res.body) ? "bot check page" : "no ytInitialData in page");
  if (parsed.channel_id && parsed.channel_id !== channelId) throw new Error(`page belongs to ${parsed.channel_id}`);
  return parsed;
}

async function listViaPage(channelId, ctx) {
  const first = await fetchTab(channelId, "videos", ctx);
  const extra = ["shorts", "streams"].filter((t) => first.available.has(t));
  const settled = await Promise.allSettled(extra.map((t) => fetchTab(channelId, t, ctx)));
  const videos = [];
  const ids = new Set();
  const partial = [];
  const add = (items) => { for (const it of items) if (!ids.has(it.id)) { ids.add(it.id); videos.push(it); } };
  add(first.items);
  const loaded = ["videos"];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") { add(r.value.items); loaded.push(extra[i]); } else partial.push(`${extra[i]} tab: ${r.reason.message}`);
  });
  return { videos, channel_title: first.channel_title, partial_errors: partial, loaded_groups: loaded };
}

async function fetchVideoDetails(videoId, ctx) {
  const res = await httpGet(`https://www.youtube.com/watch?v=${videoId}`, { timeoutMs: ctx.budget(LIMITS.pageTimeoutMs) });
  if (res.status !== 200) throw new Error(`watch page HTTP ${res.status}`);
  const pr = extractAssignedJson(res.body, "ytInitialPlayerResponse");
  const vd = pr && pr.videoDetails;
  if (vd && vd.videoId === videoId) {
    const mf = dig(pr, "microformat.playerMicroformatRenderer") || {};
    return { title: vd.title || "", description: vd.shortDescription || "", channel_id: vd.channelId || "", published_at: mf.publishDate || mf.uploadDate || "" };
  }
  const status = dig(pr, "playabilityStatus.status");
  const reason = dig(pr, "playabilityStatus.reason");
  throw new Error(`watch page had no video details${status ? ` (${status}${reason ? `: ${String(reason).slice(0, 80)}` : ""})` : ""}`);
}

async function resolveViaPage(ref, ctx) {
  const res = await httpGet(refPageUrl(ref), { timeoutMs: ctx.budget(LIMITS.pageTimeoutMs) });
  if (res.status === 404) throw new Error("page not found (handle changed or channel deleted?)");
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  if (ref.kind === "video") {
    const id = dig(extractAssignedJson(res.body, "ytInitialPlayerResponse"), "videoDetails.channelId");
    if (isChannelId(id)) return id;
    throw new Error("video page had no channel id");
  }
  const patterns = [
    /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/,
    /<meta itemprop="identifier" content="(UC[\w-]{22})"/,
    /"externalId":"(UC[\w-]{22})"/,
    /<meta property="og:url" content="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/,
  ];
  for (const re of patterns) {
    const m = res.body.match(re);
    if (m) return m[1];
  }
  throw new Error(/consent\.(youtube|google)\.com/.test(hostOf(res.url)) ? "consent interstitial" : "no channel id in page");
}

// ---------------------------------------------------------------------------
// RSS (last resort, and a second chance at descriptions)
// ---------------------------------------------------------------------------
async function listViaRss(channelId, ctx) {
  const res = await httpGet(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, { timeoutMs: ctx.budget(LIMITS.rssTimeoutMs) });
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  const [head, ...entries] = res.body.split("<entry>");
  // A 200 with no entries is one of the broken shapes seen on 2026-09-17.
  if (!/<feed[\s>]/.test(head) || !entries.length) throw new Error("empty feed");
  const tag = (s, re) => { const m = s.match(re); return m ? decodeXml(m[1]).trim() : ""; };
  const videos = [];
  for (const e of entries) {
    const id = tag(e, /<yt:videoId>([^<]+)<\/yt:videoId>/);
    if (!isVideoId(id)) continue;
    videos.push({
      id,
      title: tag(e, /<title>([\s\S]*?)<\/title>/),
      description: tag(e, /<media:description>([\s\S]*?)<\/media:description>/),
      published_at: tag(e, /<published>([^<]+)<\/published>/),
      kind: /\/shorts\//.test(e) ? "short" : "video",
      group: "uploads",
      has_details: true,
    });
  }
  return { videos, channel_title: tag(head, /<title>([\s\S]*?)<\/title>/), partial_errors: [], loaded_groups: ["uploads"] };
}

// ---------------------------------------------------------------------------
// matching
// ---------------------------------------------------------------------------
const BRAND_TERMS = [
  { label: "carbonatedaudio.com link", re: /carbonatedaudio\.com/i },
  { label: "Carbonated Audio", re: /carbonated[\s_.-]*audio(?!\.com)/i },
];
const PRODUCT_TERMS = [
  { label: "Carbonator", re: /\bcarbonator\b/i },
  { label: "De-Sipper", re: /\bde[\s_-]?sipper\b/i },
  { label: "FIZZFUEL", re: /\bfizz[\s_-]?fuel\b/i },
  { label: "TALLBOY", re: /\btall[_-]?boy\b/i },
];
// On Tap, Pour and Still are ordinary words ("STILL COOKING", "Beats On Tap").
// They count when named as a plugin anywhere ("Pour VST3", "Still plugin"),
// or when spelled like the product on the same line as the brand, a link, a
// plugin name or the creator's code ("Still by Carbonated Audio"). A standing
// sponsor footer elsewhere in the description does not switch them on.
const AS_PLUGIN = "(?:[Pp]lug-?[Ii]ns?|PLUG-?INS?|VST3?|vst3?|AU|AAX)";
const WORD_PRODUCTS = [
  { label: "On Tap", word: /\b(?:On Tap|ON TAP|OnTap|ONTAP)\b/, asPlugin: new RegExp(`\\b(?:On Tap|ON TAP|OnTap|ONTAP)\\s+${AS_PLUGIN}\\b`) },
  { label: "Pour", word: /\b(?:Pour|POUR)\b/, asPlugin: new RegExp(`\\b(?:Pour|POUR)\\s+(?:${AS_PLUGIN}|[Ss]tereo [Ii]mager|STEREO IMAGER)\\b`) },
  { label: "Still", word: /\b(?:Still|STILL)\b/, asPlugin: new RegExp(`\\b(?:Still|STILL)\\s+(?:${AS_PLUGIN}|[Dd]enoiser|DENOISER|[Nn]oise [Rr]eduction)\\b`) },
];

const codeRegex = (code) => new RegExp(`(?:^|[^A-Za-z0-9])${escapeRe(code)}(?![A-Za-z0-9])`, "i");
const lineKey = (line) => sha1(String(line).toLowerCase().replace(/\?[^\s]*/g, "").replace(/\s+/g, " ").trim().slice(0, 300)).slice(0, 16);

function strongTerms(creators) {
  const terms = [...BRAND_TERMS, ...PRODUCT_TERMS];
  for (const c of creators || []) {
    for (const code of new Set([c.audience_code, c.review_code].filter(Boolean))) terms.push({ label: `code ${code}`, re: codeRegex(code) });
  }
  return terms;
}

// Matches inside one line (the title counts as one line).
function lineMatches(line, strong) {
  const labels = strong.filter((t) => t.re.test(line)).map((t) => t.label);
  const hasStrong = labels.length > 0;
  for (const w of WORD_PRODUCTS) {
    if (w.asPlugin.test(line) || (hasStrong && w.word.test(line))) labels.push(w.label);
  }
  return { labels, hasStrong };
}

// lineSeen: matched description lines from this channel's earlier uploads. A
// match that only lives in lines seen before (the creator's standing "use code
// X at carbonatedaudio.com" footer) is recorded but does not email again.
function evaluateVideo(video, creators, lineSeen = {}) {
  const strong = strongTerms(creators);
  const title = String(video.title || "").replace(/\s+/g, " ").trim();
  const lines = String(video.description || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const inTitle = lineMatches(title, strong);
  const labels = [...inTitle.labels];
  let anyStrong = inTitle.hasStrong;
  const matchedLines = [];
  for (const line of lines) {
    const m = lineMatches(line, strong);
    if (!m.labels.length) continue;
    matchedLines.push(line);
    labels.push(...m.labels);
    anyStrong = anyStrong || m.hasStrong;
  }
  if (!labels.length) return { matched: false, line_keys: [] };

  const titleHit = inTitle.labels.length > 0;
  const newLines = matchedLines.filter((l) => !(lineSeen[lineKey(l)] && lineSeen[lineKey(l)].n > 0));
  return {
    matched: true,
    labels: [...new Set(labels)],
    where: titleHit ? "title" : "description",
    weak: !anyStrong,
    boilerplate_only: !titleHit && newLines.length === 0,
    snippet: (titleHit ? title : newLines[0] || matchedLines[0] || "").replace(/\s+/g, " ").slice(0, 240),
    line_keys: [...new Set(matchedLines.map(lineKey))],
  };
}

// Least recently seen lines go first; lines touched by this upload never do.
function bumpLineSeen(seen, keys, at) {
  const touched = new Set(keys || []);
  for (const k of touched) seen[k] = { n: ((seen[k] && seen[k].n) || 0) + 1, at };
  const entries = Object.entries(seen);
  const excess = entries.length - LIMITS.lineSeenCap;
  if (excess <= 0) return seen;
  entries
    .filter(([k]) => !touched.has(k))
    .sort((a, b) => String((a[1] && a[1].at) || "").localeCompare(String((b[1] && b[1].at) || "")))
    .slice(0, excess)
    .forEach(([k]) => delete seen[k]);
  return seen;
}

// ---------------------------------------------------------------------------
// roster
// ---------------------------------------------------------------------------
const handleKey = (url) => { const r = parseYouTubeRef(url); return r && r.kind === "handle" ? compact(r.value) : ""; };

function matchApplication(apps, e) {
  const norm = (s) => String(s || "").trim().toLowerCase();
  const direct = apps.find((a) => a.creator_slug === e.slug)
    || apps.find((a) => norm(a.name) && norm(a.name) === norm(e.name))
    || apps.find((a) => C.slugify(a.name) === e.slug);
  if (direct) return direct;
  // Fuzzy only when it points at exactly one applicant, so a short slug like
  // "beats" can never borrow someone else's channel.
  const slugKey = compact(e.slug);
  if (slugKey.length < 5) return null;
  const candidates = apps.filter((a) => {
    const h = handleKey(a.channel_url);
    return (h && h.startsWith(slugKey)) || compact(a.name).startsWith(slugKey);
  });
  return candidates.length === 1 ? candidates[0] : null;
}

async function loadSignedCreators(stripe, { timeLeft = () => Infinity } = {}) {
  const notes = [];
  const out = new Map();
  const boardSlugs = new Set();
  let apps = null;
  let appsError = "";
  const loadApps = async () => {
    if (!apps && !appsError) {
      try { apps = await listJson("creator-applications"); } catch (err) { appsError = err.message; }
    }
    return apps || [];
  };

  for (const r of await listJson("creators", "creator_")) { // throws: an unreadable board fails the run
    if (!r.slug) continue;
    boardSlugs.add(r.slug);
    if (r.status === "ended") continue;
    const c = {
      slug: r.slug, name: r.name || r.slug, status: r.status || "active", platform: r.platform || "",
      channel_url: r.channel_url || "", audience_code: r.audience_code || "", review_code: r.review_code || "", source: "board",
    };
    if (!c.channel_url && r.application_key) {
      const app = (await loadApps()).find((a) => a.key === r.application_key);
      if (app && app.channel_url) Object.assign(c, { channel_url: app.channel_url, platform: c.platform || app.platform || "" });
      if (!app && appsError) c.lookup_failed = true;
    }
    out.set(c.slug, c);
  }

  let stripeError = "";
  if (!stripe) {
    stripeError = "STRIPE_SECRET_KEY is not set";
  } else {
    try {
      const bySlug = new Map();
      for await (const p of stripe.promotionCodes.list({ limit: 100, created: { gte: PROGRAM_START_UNIX } })) {
        if (timeLeft() < 16000) throw new Error("listing promotion codes took too long");
        const m = p.metadata || {};
        if (m.program !== C.PROGRAM || !m.creator_slug || boardSlugs.has(m.creator_slug)) continue;
        const e = bySlug.get(m.creator_slug) || { slug: m.creator_slug, name: m.creator_name || m.creator_slug, audience_code: "", review_code: "" };
        if (m.kind === "review") e.review_code = p.code; else e.audience_code = p.code;
        bySlug.set(m.creator_slug, e);
      }
      if (bySlug.size) {
        const list = await loadApps();
        for (const e of bySlug.values()) {
          const app = matchApplication(list, e);
          out.set(e.slug, {
            ...e, status: "codes minted, not on the board yet", platform: (app && app.platform) || "", channel_url: (app && app.channel_url) || "",
            source: "stripe", lookup_failed: !app && Boolean(appsError),
          });
        }
      }
    } catch (err) {
      stripeError = err.message;
    }
  }
  if (stripeError) notes.push(`Stripe lookup failed (${stripeError}): creators with codes but no board record were not watched`);
  if (appsError) notes.push(`applications store unreadable (${appsError})`);
  return { creators: [...out.values()], notes, stripeError, appsError };
}

// ---------------------------------------------------------------------------
// resolution with cache
// ---------------------------------------------------------------------------
async function resolveChannel(channelUrl, ctx) {
  const ref = parseYouTubeRef(channelUrl);
  if (!ref) return { ok: false, reason: "not_youtube" };
  if (ref.kind === "channel") return { ok: true, channel_id: ref.value };
  const key = `resolve_${sha1(`${ref.kind}:${ref.value.toLowerCase()}`)}`;
  const cached = await ctx.store.get(key, { type: "json" });
  const fresh = cached && isChannelId(cached.channel_id) && ctx.now() - Date.parse(cached.resolved_at || 0) < LIMITS.resolveTtlMs;
  if (fresh) return { ok: true, channel_id: cached.channel_id };

  const errors = [];
  let id = null;
  if (ctx.apiKey && !ctx.apiDisabled && ["handle", "user", "video"].includes(ref.kind)) {
    try { id = await resolveViaApi(ref, ctx); } catch (err) { noteApiError(ctx, err); errors.push(`api: ${err.message}`); }
  }
  if (!isChannelId(id)) {
    try { id = await resolveViaPage(ref, ctx); } catch (err) { errors.push(`page: ${err.message}`); }
  }
  if (!isChannelId(id)) {
    // An expired cache entry still beats nothing while YouTube misbehaves.
    if (cached && isChannelId(cached.channel_id)) return { ok: true, channel_id: cached.channel_id, stale: true };
    return { ok: false, reason: "unresolved", error: errors.join("; ") || "channel not found" };
  }
  await ctx.store.setJSON(key, { channel_id: id, ref, resolved_at: ctx.nowIso() });
  return { ok: true, channel_id: id };
}

// ---------------------------------------------------------------------------
// one channel
// ---------------------------------------------------------------------------
function buildHit(video, ch, listing, result, source, ctx) {
  return {
    video_id: video.id,
    url: video.kind === "short" ? `https://www.youtube.com/shorts/${video.id}` : `https://www.youtube.com/watch?v=${video.id}`,
    title: video.title || "",
    kind: video.kind || "video",
    published_at: video.published_at || "",
    channel_id: ch.channel_id,
    channel_title: listing.channel_title || "",
    creators: ch.creators.map((c) => ({ slug: c.slug, name: c.name, status: c.status, audience_code: c.audience_code, source: c.source })),
    labels: result.labels,
    where: result.where,
    weak: result.weak,
    boilerplate_only: result.boilerplate_only,
    title_only: !video.has_details,
    first_scan: Boolean(video.first_scan),
    snippet: result.snippet,
    source,
    found_at: ctx.nowIso(),
    emailed_at: null,
  };
}

async function checkChannel(ch, ctx) {
  const s = ctx.store;
  const key = `channel_${ch.channel_id}`;
  const state = {
    channel_id: ch.channel_id, seen_ids: [], pending: {}, line_seen: {}, groups: {}, first_checked_at: null, consecutive_errors: 0,
    ...((await s.get(key, { type: "json" })) || {}),
  };
  const errors = [];
  let listing = null;
  let source = "";

  if (ctx.apiKey && !ctx.apiDisabled) {
    try { listing = await listViaApi(ch.channel_id, ctx); source = "api"; } catch (err) { noteApiError(ctx, err); errors.push(`api: ${err.message}`); }
  }
  if (!listing) {
    try { listing = await listViaPage(ch.channel_id, ctx); source = "page"; } catch (err) { errors.push(`page: ${err.message}`); }
  }
  if (!listing && ctx.timeLeft() > LIMITS.reserveMs + 1000) {
    try { listing = await listViaRss(ch.channel_id, ctx); source = "rss"; } catch (err) { errors.push(`rss: ${err.message}`); }
  }

  state.creators = ch.creators.map((c) => ({ slug: c.slug, name: c.name }));
  state.last_checked_at = ctx.nowIso();
  if (!listing) {
    state.consecutive_errors = (state.consecutive_errors || 0) + 1;
    state.last_error = errors.join(" | ").slice(0, 600);
    await s.setJSON(key, state);
    return { ok: false, channel_id: ch.channel_id, creators: state.creators, error: state.last_error, consecutive_errors: state.consecutive_errors };
  }

  // Each tab (or the API uploads list) is newest first. On the FIRST scan of a
  // tab (Shorts the API never listed, a tab that failed on earlier runs, the
  // switch between API and pages), everything below a video that was already
  // evaluated is older backlog: marked seen quietly instead of mailed as new.
  // On later scans every unseen video is evaluated wherever it sits, so a
  // review that was private and published later is still caught.
  const seen = new Set(state.seen_ids);
  // Tabs that loaded this run, including empty ones, so a brand-new channel's
  // first upload is not labelled "first scan" later.
  const loadedGroups = new Set(listing.loaded_groups || listing.videos.map((v) => v.group));
  const byGroup = new Map();
  for (const v of listing.videos) {
    if (!byGroup.has(v.group)) byGroup.set(v.group, []);
    byGroup.get(v.group).push(v);
  }
  const fresh = [];
  const backlog = [];
  for (const [group, items] of byGroup) {
    const firstScanOfGroup = !state.groups[group];
    let passedSeen = false;
    for (const v of items) {
      if (seen.has(v.id)) { passedSeen = true; continue; }
      if (firstScanOfGroup && passedSeen && !(v.id in state.pending)) { backlog.push(v.id); continue; }
      fresh.push({ ...v, first_scan: firstScanOfGroup });
    }
  }

  // Page-sourced videos need a watch-page fetch for their description.
  const perGroup = {};
  const titleOnly = new Set();
  const allowed = [];
  const deferred = new Set();
  let laterFetches = 0;
  for (const v of fresh) {
    if (v.has_details) continue;
    if (v.first_scan) {
      perGroup[v.group] = (perGroup[v.group] || 0) + 1;
      if (perGroup[v.group] > LIMITS.firstScanDetailsPerTab) titleOnly.add(v.id); else allowed.push(v);
    } else if (laterFetches < LIMITS.detailsPerChannel) {
      laterFetches += 1;
      allowed.push(v);
    } else {
      deferred.add(v.id);
    }
  }
  const details = new Map();
  const detailErrors = new Map();
  await mapLimit(allowed, LIMITS.detailConcurrency, async (v) => {
    if (ctx.timeLeft() < LIMITS.reserveMs + 1000) { deferred.add(v.id); return; }
    try { details.set(v.id, await fetchVideoDetails(v.id, ctx)); } catch (err) { detailErrors.set(v.id, err.message); }
  });
  // Watch pages refused (bot check from a datacenter IP): the RSS feed also
  // carries descriptions when it happens to be up.
  if (detailErrors.size && ctx.timeLeft() > LIMITS.reserveMs + 1000) {
    try {
      for (const r of (await listViaRss(ch.channel_id, ctx)).videos) {
        if (detailErrors.has(r.id)) details.set(r.id, { title: r.title, description: r.description, published_at: r.published_at });
      }
    } catch { /* RSS is often down; the retry below covers it */ }
  }

  const hits = [];
  const evaluated = [];
  let titleOnlyFallbacks = 0;
  let lastDetailError = "";
  // Oldest first, so a description line repeated across uploads is "new" once.
  for (const v of [...fresh].reverse()) {
    if (deferred.has(v.id)) {
      if (!(v.id in state.pending)) state.pending[v.id] = { n: 0, group: v.group, since: ctx.nowIso() };
      continue;
    }
    let video = v;
    if (!v.has_details && !titleOnly.has(v.id)) {
      const d = details.get(v.id);
      if (d) {
        video = { ...v, title: d.title || v.title, description: d.description, published_at: d.published_at || v.published_at, has_details: true };
      } else {
        const prev = state.pending[v.id] || { n: 0, group: v.group, since: ctx.nowIso() };
        const attempts = (Number(prev.n) || 0) + 1;
        if (attempts < LIMITS.maxDetailAttempts) { state.pending[v.id] = { ...prev, n: attempts }; continue; }
        titleOnlyFallbacks += 1;
        lastDetailError = detailErrors.get(v.id) || lastDetailError;
      }
    }
    delete state.pending[v.id];
    const result = evaluateVideo(video, ch.creators, state.line_seen);
    bumpLineSeen(state.line_seen, result.line_keys, ctx.nowIso());
    if (result.matched) hits.push(buildHit(video, ch, listing, result, source, ctx));
    evaluated.push(v.id);
  }

  // Hits and their unsent_ markers are written before the videos are marked
  // seen, so a run killed in between re-finds them instead of losing them.
  for (const h of hits) {
    const existing = await s.get(`hit_${h.video_id}`, { type: "json" });
    if (!existing) await s.setJSON(`hit_${h.video_id}`, h);
    const rec = existing || h;
    if (!rec.emailed_at && !rec.boilerplate_only) await s.setJSON(`unsent_${h.video_id}`, { video_id: h.video_id, at: ctx.nowIso() });
  }

  // Forget a retry only when its own tab loaded without it, or it is two weeks
  // old. A tab that failed this run keeps its retries.
  const listed = new Set(listing.videos.map((v) => v.id));
  for (const [id, p] of Object.entries(state.pending)) {
    const tabLoaded = p && loadedGroups.has(p.group);
    const stale = !p || !p.since || ctx.now() - Date.parse(p.since) > LIMITS.pendingMaxAgeMs;
    if ((!listed.has(id) && tabLoaded) || stale) delete state.pending[id];
  }
  state.seen_ids = [...evaluated.reverse(), ...backlog, ...state.seen_ids].slice(0, LIMITS.seenCap);
  for (const group of loadedGroups) state.groups[group] = state.groups[group] || ctx.nowIso();
  state.channel_title = listing.channel_title || state.channel_title || "";
  state.first_checked_at = state.first_checked_at || ctx.nowIso();
  state.last_ok_at = ctx.nowIso();
  state.last_source = source;
  state.consecutive_errors = 0;
  state.last_error = [...errors, ...(titleOnlyFallbacks ? [`descriptions unreadable: ${lastDetailError}`] : [])].join(" | ").slice(0, 600);
  await s.setJSON(key, state);

  return {
    ok: true, channel_id: ch.channel_id, creators: state.creators, source,
    listed: listing.videos.length, fresh: fresh.length, evaluated: evaluated.length, backlog: backlog.length, deferred: deferred.size,
    hits: hits.length, emailable: hits.filter((h) => !h.boilerplate_only).length, partial_errors: listing.partial_errors || [],
    title_only_fallbacks: titleOnlyFallbacks, detail_error: lastDetailError, pending: Object.keys(state.pending).length,
  };
}

// ---------------------------------------------------------------------------
// issues, lock
// ---------------------------------------------------------------------------
async function reconcileIssues(ctx, current, allowResolve) {
  const s = ctx.store;
  const existing = new Map();
  const { blobs } = await s.list({ prefix: "issue_" });
  await Promise.all(blobs.map(async ({ key }) => { const v = await s.get(key, { type: "json" }); if (v) existing.set(key, v); }));
  const due = [];
  const keep = new Set();
  for (const it of current) {
    const blobKey = `issue_${it.key}`;
    if (keep.has(blobKey)) continue;
    keep.add(blobKey);
    const prev = existing.get(blobKey) || {};
    const rec = {
      key: it.key, message: it.message, count: (prev.count || 0) + 1,
      first_seen_at: prev.first_seen_at || ctx.nowIso(), last_seen_at: ctx.nowIso(), last_notified_at: prev.last_notified_at || null,
      renotify_ms: it.renotify_ms || RENOTIFY.normal, min_runs: it.min_runs || 1,
    };
    await s.setJSON(blobKey, rec);
    const quiet = rec.last_notified_at ? ctx.now() - Date.parse(rec.last_notified_at) : Infinity;
    if (rec.count >= rec.min_runs && quiet >= rec.renotify_ms) due.push(rec);
  }
  if (allowResolve) {
    for (const [key, rec] of existing) {
      if (keep.has(key)) continue;
      // Keep a recently mailed issue until its quiet period ends, so one that
      // flaps (gone today, back tomorrow) is not mailed again every time.
      const quiet = rec.last_notified_at ? ctx.now() - Date.parse(rec.last_notified_at) : Infinity;
      if (quiet >= (rec.renotify_ms || RENOTIFY.normal)) await s.delete(key);
      else if ((rec.count || 0) > 0) await s.setJSON(key, { ...rec, count: 0 });
    }
  }
  return due;
}

async function acquireLock(ctx, runId) {
  const s = ctx.store;
  const held = await s.get("lock", { type: "json" });
  if (held && held.run_id !== runId && ctx.now() - Date.parse(held.started_at || 0) < LIMITS.lockMs) return false;
  await s.setJSON("lock", { run_id: runId, started_at: ctx.nowIso() });
  await sleep(ctx.lockSettleMs);
  const check = await s.get("lock", { type: "json" });
  return !check || check.run_id === runId;
}

// ---------------------------------------------------------------------------
// the run
// ---------------------------------------------------------------------------
async function runWatch({ stripe = null, apiKey = "", notify = null, deadlineMs = 24000, now = () => Date.now(), lockSettleMs = 1200 } = {}) {
  const started = now();
  const runId = crypto.randomBytes(6).toString("hex");
  const ctx = {
    store: store(), apiKey, apiDisabled: null, now, lockSettleMs,
    nowIso: () => new Date(now()).toISOString(),
    timeLeft: () => deadlineMs - (now() - started),
    budget: (ms) => Math.max(1000, Math.min(ms, deadlineMs - (now() - started) - LIMITS.reserveMs)),
  };
  const summary = {
    run_id: runId, started_at: ctx.nowIso(), source_mode: apiKey ? "api, page fallback" : "page (no YOUTUBE_API_KEY)",
    creators: 0, channels: 0, checked: 0, failed: 0, deferred_channels: 0, new_videos: 0, backlog_marked_seen: 0, hits: 0, emailable_hits: 0,
    emailed_hits: 0, issues_sent: 0, title_only_fallbacks: 0, sources: {}, notes: [],
  };

  if (!(await acquireLock(ctx, runId))) return { ...summary, skipped: "another run holds the lock" };
  try {
    const health = (await ctx.store.get("health", { type: "json" })) || {};
    const issues = [];

    let rosterFailed = false;
    let rosterComplete = true;
    let roster = { creators: [], notes: [], stripeError: "", appsError: "" };
    try {
      roster = await loadSignedCreators(stripe, { timeLeft: ctx.timeLeft });
    } catch (err) {
      rosterFailed = true;
      summary.notes.push(`roster failed: ${err.message}`);
    }
    summary.notes.push(...roster.notes);
    summary.creators = roster.creators.length;
    if (roster.appsError) rosterComplete = false;

    const channels = new Map();
    for (const c of roster.creators) {
      if (!c.channel_url) {
        if (c.lookup_failed) continue; // cannot tell yet; the applications store was unreadable
        const fix = c.source === "board"
          ? "Add it in their drawer on the partners board."
          : "They hold codes in Stripe but have no board record or matching application: click Sync codes from Stripe on the partners board, then add their channel link in the drawer.";
        issues.push({ key: `no_channel_${c.slug}`, message: `${c.name} (${c.slug}) has no channel link on file, so their videos are not watched. ${fix}` });
        continue;
      }
      if (ctx.timeLeft() < 14000) { rosterComplete = false; summary.notes.push("ran short on time while resolving channels"); break; }
      const r = await resolveChannel(c.channel_url, ctx);
      if (!r.ok && r.reason === "not_youtube") {
        issues.push({ key: `not_youtube_${c.slug}`, message: `${c.name}'s channel link is not a YouTube channel (${c.channel_url}). Only YouTube is watched, so that ${c.platform || "profile"} is not covered.` });
        continue;
      }
      if (!r.ok) {
        issues.push({ key: `unresolved_${c.slug}`, min_runs: 3, renotify_ms: RENOTIFY.soon, message: `Could not find ${c.name}'s YouTube channel from ${c.channel_url} for 3+ runs (${r.error}).` });
        continue;
      }
      const entry = channels.get(r.channel_id) || { channel_id: r.channel_id, creators: [] };
      entry.creators.push(c);
      channels.set(r.channel_id, entry);
    }
    summary.channels = channels.size;
    if (roster.appsError) {
      issues.push({ key: "applications_unreadable", min_runs: 2, renotify_ms: RENOTIFY.soon, message: `The creator applications store could not be read for 2+ runs (${roster.appsError}). Creators whose channel link only exists on their application are not being watched.` });
    }
    if (roster.stripeError) {
      issues.push({ key: "stripe_roster_lookup", min_runs: 2, renotify_ms: RENOTIFY.soon, message: `Could not read creator codes from Stripe for 2+ runs (${roster.stripeError}). Creators who hold codes but are not on the partners board yet are not being watched until this is fixed or they are approved on the board.` });
    }
    if (!rosterFailed && !roster.stripeError && !roster.creators.length) {
      issues.push({ key: "no_signed_creators", message: "No signed creators found: no active board records and no creator-2026 codes in Stripe. Nothing is being watched." });
    }

    // Least recently checked first, so a slow day still rotates through everyone.
    const lastChecked = health.checked || {};
    const order = [...channels.values()].sort((a, b) => String(lastChecked[a.channel_id] || "").localeCompare(String(lastChecked[b.channel_id] || "")));
    const results = [];
    await mapLimit(order, LIMITS.channelConcurrency, async (ch) => {
      if (ctx.timeLeft() < LIMITS.reserveMs + 3000) { summary.deferred_channels += 1; return; }
      try {
        results.push(await checkChannel(ch, ctx));
      } catch (err) {
        results.push({ ok: false, channel_id: ch.channel_id, creators: ch.creators.map((c) => ({ slug: c.slug, name: c.name })), error: `state: ${err.message}`, consecutive_errors: 0 });
      }
    });

    const fallbackSamples = [];
    summary.channel_reports = results.map((r) => ({
      creators: r.creators.map((c) => c.name).join(", "), ok: r.ok, source: r.source || "", listed: r.listed || 0,
      evaluated: r.evaluated || 0, pending: r.pending || 0, error: r.ok ? "" : String(r.error || "").slice(0, 200),
    }));
    for (const r of results) {
      summary.checked += 1;
      if (!r.ok) { summary.failed += 1; continue; }
      summary.sources[r.source] = (summary.sources[r.source] || 0) + 1;
      summary.new_videos += r.evaluated;
      summary.backlog_marked_seen += r.backlog;
      summary.hits += r.hits;
      summary.emailable_hits += r.emailable;
      summary.title_only_fallbacks += r.title_only_fallbacks;
      if (r.title_only_fallbacks) fallbackSamples.push(`${r.creators.map((c) => c.name).join(", ")}: ${r.detail_error || "no details"}`);
      if (r.partial_errors.length) summary.notes.push(`${r.channel_id}: ${r.partial_errors.join("; ")}`);
    }

    // A run that read nothing counts as failed, including one where every
    // channel was pushed to the next run for lack of time.
    const nothingRead = results.length === 0 || results.every((r) => !r.ok);
    const hadWork = channels.size > 0 || (!rosterComplete && roster.creators.length > 0);
    const runFailed = rosterFailed || (hadWork && nothingRead);
    const failedRuns = runFailed ? (health.consecutive_failed_runs || 0) + 1 : 0;
    if (failedRuns >= 2) {
      const latest = results.filter((r) => !r.ok).slice(0, 3).map((r) => r.error).join(" | ") || summary.notes.join(" | ") || "ran out of time before any channel";
      issues.push({
        key: "watch_failing", renotify_ms: RENOTIFY.urgent,
        message: `The last ${failedRuns} runs could not read any creator channel. Latest errors: ${latest.slice(0, 500)}.${apiKey ? "" : " Adding a YOUTUBE_API_KEY (YouTube Data API v3) in Netlify makes the watcher independent of YouTube's page HTML."}`,
      });
    }
    if (!runFailed) {
      for (const r of results) {
        if (r.ok || r.consecutive_errors < 3) continue;
        issues.push({ key: `channel_failing_${r.channel_id}`, renotify_ms: RENOTIFY.soon, message: `${r.creators.map((c) => c.name).join(", ")}: channel ${r.channel_id} could not be read for ${r.consecutive_errors} runs in a row (${r.error}).` });
      }
    }
    if (summary.title_only_fallbacks) {
      issues.push({
        key: "descriptions_unreadable", renotify_ms: RENOTIFY.soon,
        message: `YouTube refused the description of ${summary.title_only_fallbacks} new video(s) three runs in a row, so they were judged on their titles only and a mention that is only in a description could have been missed (${fallbackSamples.slice(0, 2).join(" | ").slice(0, 300)}).${apiKey ? "" : " Setting YOUTUBE_API_KEY in Netlify reads descriptions through the official API instead."}`,
      });
    }
    if (ctx.apiDisabled) {
      issues.push({ key: `youtube_api_${compact(ctx.apiDisabled.reason) || ctx.apiDisabled.status}`, renotify_ms: RENOTIFY.urgent, message: `YOUTUBE_API_KEY was rejected (${ctx.apiDisabled.message}). The watcher fell back to reading channel pages for this run.` });
    }

    const allowResolve = rosterComplete && !rosterFailed && !runFailed && summary.deferred_channels === 0;
    const dueIssues = await reconcileIssues(ctx, issues, allowResolve);

    const { blobs: unsent } = await ctx.store.list({ prefix: "unsent_" });
    const outboxHits = [];
    for (const { key } of unsent) {
      const id = key.slice("unsent_".length);
      const h = await ctx.store.get(`hit_${id}`, { type: "json" });
      if (h && !h.emailed_at) outboxHits.push(h); else await ctx.store.delete(key);
    }
    outboxHits.sort((a, b) => String(b.published_at || b.found_at).localeCompare(String(a.published_at || a.found_at)));

    // The first run that reads a channel says so once, so a silent watcher is
    // known to be working rather than assumed to be.
    const intro = !health.confirmed_at && !runFailed && results.some((r) => r.ok);
    if (outboxHits.length || dueIssues.length || intro) {
      if (!notify) {
        summary.notes.push("RESEND_API_KEY is not set: nothing could be emailed");
      } else if (ctx.timeLeft() < 5000) {
        // Not raced against a timer: a send that times out here but still
        // lands would be mailed again next run.
        summary.notes.push("no time left to email this run; it goes out next run");
      } else {
        try {
          await notify({ hits: outboxHits, issues: dueIssues, summary, intro });
          const sentAt = ctx.nowIso();
          await Promise.all([
            ...outboxHits.map((h) => ctx.store.setJSON(`hit_${h.video_id}`, { ...h, emailed_at: sentAt })),
            ...dueIssues.map((it) => ctx.store.setJSON(`issue_${it.key}`, { ...it, last_notified_at: sentAt })),
          ]);
          await Promise.all(outboxHits.map((h) => ctx.store.delete(`unsent_${h.video_id}`)));
          summary.emailed_hits = outboxHits.length;
          summary.issues_sent = dueIssues.length;
          if (intro) summary.confirmed_now = true;
        } catch (err) {
          summary.notes.push(`email failed, will retry next run: ${err.message}`);
        }
      }
    }

    const watched = new Set(channels.keys());
    const checked = {};
    for (const [id, at] of Object.entries(lastChecked)) if (watched.has(id)) checked[id] = at;
    for (const r of results) if (r.ok) checked[r.channel_id] = ctx.nowIso();
    summary.consecutive_failed_runs = failedRuns;
    summary.duration_ms = now() - started;
    await ctx.store.setJSON("health", {
      confirmed_at: health.confirmed_at || (summary.confirmed_now ? ctx.nowIso() : null),
      last_run_at: summary.started_at,
      last_finished_at: ctx.nowIso(),
      consecutive_failed_runs: failedRuns,
      checked,
      last_summary: summary,
    });
    return summary;
  } finally {
    try {
      const held = await ctx.store.get("lock", { type: "json" });
      if (held && held.run_id === runId) await ctx.store.delete("lock");
    } catch { /* the lock expires on its own */ }
  }
}

// ---------------------------------------------------------------------------
// owner email
// ---------------------------------------------------------------------------
function buildOwnerEmail({ hits, issues, summary, intro = false }) {
  const e = escapeHtml;
  const names = (h) => (h.creators || []).map((c) => c.name).join(" + ") || h.channel_title || "A creator";
  const kindLabel = (h) => (h.kind === "short" ? "Short" : h.kind === "live" ? "Live" : "Video");
  const oneLine = (s) => String(s || "").replace(/[\r\n]+/g, " ").trim();
  const caveatsOf = (h) => [
    h.weak ? "weak match: a product name that is also a common word, check it" : "",
    h.title_only ? "description could not be read, matched on the title only" : "",
    h.first_scan ? "found on the first scan of this channel, so it may not be new" : "",
  ].filter(Boolean);

  let subject;
  if (hits.length === 1) subject = `New creator video: ${names(hits[0])} - ${hits[0].title}`;
  else if (hits.length > 1) subject = `${hits.length} new creator videos mention Carbonated Audio`;
  else if (issues.length) subject = `Creator video watcher needs attention (${issues.length} ${issues.length === 1 ? "issue" : "issues"})`;
  else subject = "Creator video watcher is live";

  const reports = (summary && summary.channel_reports) || [];
  const introLines = intro
    ? [
      "First successful run. From here on you only hear from it when a signed creator posts a video that mentions a plugin, or when the watcher needs attention.",
      ...reports.map((r) => (r.ok
        ? `${r.creators || "creator"}: ${r.listed} uploads listed via ${r.source}, ${r.evaluated} checked${r.pending ? `, ${r.pending} waiting for a description retry` : ""}`
        : `${r.creators || "creator"}: could not be read (${r.error})`)),
      `Source: ${summary ? summary.source_mode : ""}. Mentions found this run: ${summary ? summary.hits : 0}.`,
    ]
    : [];
  subject = oneLine(subject).slice(0, 150);

  const hitHtml = hits.map((h) => {
    const codes = (h.creators || []).map((c) => c.audience_code).filter(Boolean).join(", ");
    const meta = [names(h), kindLabel(h), h.published_at ? `published ${String(h.published_at).slice(0, 10)}` : "", codes ? `code ${codes}` : ""].filter(Boolean).join(" - ");
    const caveats = caveatsOf(h).join("; ");
    return `<div style="border:1px solid #2a2440;border-radius:10px;padding:14px 16px;margin:0 0 14px;">
      <p style="margin:0 0 6px;font-size:12px;color:#a09bb5;">${e(meta)}</p>
      <p style="margin:0 0 8px;font-size:16px;line-height:1.4;"><a href="${e(h.url)}" style="color:#00d4ff;text-decoration:none;font-weight:bold;">${e(h.title || h.video_id)}</a></p>
      <p style="margin:0 0 6px;font-size:14px;"><strong>Mentions:</strong> ${e((h.labels || []).join(", "))} <span style="color:#6b6580;">(in the ${e(h.where)})</span></p>
      ${h.snippet ? `<p style="margin:0 0 6px;color:#a09bb5;font-size:13px;line-height:1.5;">"${e(h.snippet)}"</p>` : ""}
      ${caveats ? `<p style="margin:0;color:#ffb86b;font-size:12px;">${e(caveats)}</p>` : ""}
    </div>`;
  }).join("");

  const issueHtml = issues.length
    ? `<h3 style="color:#ffb86b;margin:22px 0 8px;font-size:15px;">Needs attention</h3><ul style="margin:0;padding-left:18px;">${issues.map((i) => `<li style="margin:0 0 8px;font-size:14px;line-height:1.5;">${e(i.message)}</li>`).join("")}</ul>`
    : "";

  const sources = Object.entries((summary && summary.sources) || {}).map(([k, v]) => `${v} via ${k}`).join(", ");
  const footer = `Daily creator video watcher. Signed creators only${summary ? `: ${summary.creators} creator(s), ${summary.checked} channel(s) checked${sources ? ` (${sources})` : ""}` : ""}. Repeat sponsor lines in descriptions are logged but not emailed.`;

  const html = `<div style="font-family:Arial,sans-serif;padding:20px;background:#0d0a1a;color:#fff;">
    <h2 style="color:#ff6b2b;margin:0 0 16px;">${hits.length ? (hits.length === 1 ? "New creator video" : `${hits.length} new creator videos`) : intro && !issues.length ? "Creator video watcher is live" : "Creator video watcher"}</h2>
    ${introLines.length ? `<div style="margin:0 0 16px;font-size:14px;line-height:1.6;">${introLines.map((l) => `<p style="margin:0 0 6px;">${e(l)}</p>`).join("")}</div>` : ""}
    ${hitHtml}
    ${issueHtml}
    <hr style="border:none;border-top:1px solid #2a2440;margin:20px 0 12px;">
    <p style="margin:0 0 10px;"><a href="${BOARD_URL}" style="color:#00d4ff;">Partners board</a></p>
    <p style="color:#6b6580;font-size:12px;margin:0;">${e(footer)}</p>
  </div>`;

  const text = [
    ...(introLines.length ? [...introLines, ""] : []),
    ...hits.map((h) => [
      h.title || h.video_id,
      h.url,
      `${names(h)} - ${kindLabel(h)}${h.published_at ? ` - published ${String(h.published_at).slice(0, 10)}` : ""}`,
      `Mentions: ${(h.labels || []).join(", ")} (in the ${h.where})`,
      ...caveatsOf(h).map((c) => `Note: ${c}`),
      ...(h.snippet ? [`"${h.snippet}"`] : []),
      "",
    ].join("\n")),
    ...(issues.length ? ["Needs attention:", ...issues.map((i) => `- ${i.message}`), ""] : []),
    `Partners board: ${BOARD_URL}`,
    footer,
  ].join("\n");

  return { subject, html, text };
}

module.exports = {
  LIMITS,
  runWatch,
  buildOwnerEmail,
  // exported for tests
  parseYouTubeRef, evaluateVideo, bumpLineSeen, parseChannelTab, extractAssignedJson, loadSignedCreators, matchApplication, decodeXml,
};
