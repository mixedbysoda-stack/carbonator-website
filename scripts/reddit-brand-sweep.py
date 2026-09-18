#!/usr/bin/env python3
"""
Carbonated Audio brand sweep over Reddit via arctic-shift.
Posts and comments are SEPARATE endpoints and are reported separately.
Paced + backoff because arctic-shift 422s ("Timeout. Maybe slow down a bit").
Every raw hit is re-filtered locally against a literal brand regex, because
arctic-shift stems ("carbonator" -> "carbon...", "still" -> adverb).

Usage: python3 reddit-brand-sweep.py <outdir> [after_date]
"""
import json, re, sys, time, urllib.request, urllib.parse, os

BASE = "https://arctic-shift.photon-reddit.com/api"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " \
     "(KHTML, like Gecko) Chrome/128.0 Safari/537.36"

SUBS = ["makinghiphop", "audioengineering", "edmproduction", "WeAreTheMusicMakers"]
TERMS = ["carbonator", "carbonated audio", "carbinated audio",
         "de-sipper", "fizzfuel", "tallboy"]

# Literal brand regex. Deliberately does NOT include bare "still", "pour",
# "on tap" -- those are ordinary English and produce only noise.
BRAND = re.compile(
    r"carbonat(?:or|ed\s+audio)|carbinat(?:or|ed\s+audio)|de-?sipper|"
    r"fizz\s?fuel|tallboy|sodanswishers|carbonatedaudio",
    re.I)

PACE = 10.0
MAX_TRIES = 4


def fetch(path, params):
    url = f"{BASE}{path}?" + urllib.parse.urlencode(params)
    for attempt in range(MAX_TRIES):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                raw = r.read().decode("utf-8", "replace")
                code = r.status
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", "replace")
            code = e.code
        except Exception as e:
            raw, code = json.dumps({"error": f"{type(e).__name__}: {e}"}), 0
        # strict=False: raw comment bodies carry literal control chars
        try:
            body = json.loads(raw, strict=False)
        except Exception as e:
            body = {"error": f"unparseable: {e}", "raw": raw[:300]}
        if code == 200 and isinstance(body.get("data"), list):
            return code, body["data"], url
        wait = 30 * (attempt + 1)
        print(f"  retry {attempt+1}/{MAX_TRIES} code={code} "
              f"err={str(body.get('error'))[:60]} sleep={wait}s", flush=True)
        time.sleep(wait)
    return code, None, url


def main():
    outdir = sys.argv[1]
    after = sys.argv[2] if len(sys.argv) > 2 else "2026-08-01"
    os.makedirs(outdir, exist_ok=True)
    log = []
    hits = []

    # COMMENTS FIRST -- this endpoint throttles hardest, spend fresh quota on it.
    plan = ([("comments", s, t) for t in TERMS for s in SUBS] +
            [("posts", s, t) for t in TERMS for s in SUBS])

    for kind, sub, term in plan:
        if kind == "comments":
            path, params = "/comments/search", {
                "subreddit": sub, "body": term, "after": after, "limit": 100}
        else:
            path, params = "/posts/search", {
                "subreddit": sub, "query": term, "after": after, "limit": 100}
        code, data, url = fetch(path, params)
        n = len(data) if data is not None else -1
        real = []
        for d in (data or []):
            blob = " ".join(str(d.get(k, "")) for k in
                            ("title", "selftext", "body", "link_title"))
            if BRAND.search(blob):
                real.append(d)
        log.append({"kind": kind, "sub": sub, "term": term, "http": code,
                    "raw_hits": n, "brand_hits": len(real), "url": url})
        print(f"[{kind:8}] r/{sub:20} {term:18} http={code} raw={n} brand={len(real)}",
              flush=True)
        for d in real:
            pid = d.get("id", "")
            if kind == "posts":
                link = f"https://reddit.com/comments/{pid}"
            else:
                lid = str(d.get("link_id", "")).replace("t3_", "")
                link = f"https://reddit.com/comments/{lid}/_/{pid}"
            hits.append({"kind": kind, "sub": sub, "term": term,
                         "author": d.get("author"), "created": d.get("created_utc"),
                         "permalink": link,
                         "text": (d.get("title") or "") + " | " +
                                 (d.get("selftext") or d.get("body") or "")[:600]})
        time.sleep(PACE)

    with open(os.path.join(outdir, "sweep-log.json"), "w") as f:
        json.dump({"after": after, "queries": log, "brand_hits": hits}, f, indent=2)
    print("\n=== SUMMARY ===")
    print(f"queries={len(log)} ok={sum(1 for l in log if l['http']==200)} "
          f"failed={sum(1 for l in log if l['http']!=200)} "
          f"brand_hits={len(hits)}")


if __name__ == "__main__":
    main()
