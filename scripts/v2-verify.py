#!/usr/bin/env python3
"""v2 guardrail verifier — compares a rebuilt page against its main-branch original.

Usage: python3 scripts/v2-verify.py <page.html> [more pages...]
Checks per page:
  - GTM container, Meta pixel, canonical/OG presence
  - JSON-LD block count + parseability (must be >= original count)
  - Stripe payment-link set identical to original
  - component mounts (#site-nav, #site-footer) where original had them
  - shared.css dropped IFF v2.css present; silk canvas gone
  - title + meta description unchanged (warns if changed)
"""
import json, re, subprocess, sys

FROZEN_LINKS = {
    "aFafZhgbffRw6nv0UH3oA00", "aFa4gzbUZfRwdPXdHt3oA0g", "9B6bJ11gl7l0aDLgTF3oA0b",
    "bJe4gz0ch7l0aDL9rd3oA07", "5kQcN51gl6gWfY51YL3oA04", "6oUeVd7EJ6gW13b6f13oA0f",
    "7sY28raQV34KeU1bzl3oA09", "28EeVdcZ3gVA27f1YL3oA0a",
}

def stripe_links(html):
    return set(re.findall(r'buy\.stripe\.com/([A-Za-z0-9]+)', html))

def ld_blocks(html):
    return re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)

def meta(html, name):
    m = re.search(rf'<{name}[^>]*>(.*?)</{name}>', html, re.S) if name == "title" else \
        re.search(r'<meta name="description" content="([^"]*)"', html)
    return (m.group(1).strip() if m else "")

def check(page):
    ok = True
    new = open(page).read()
    try:
        old = subprocess.run(["git", "show", f"main:{page}"], capture_output=True, text=True, check=True).stdout
    except subprocess.CalledProcessError:
        old = None
        print(f"  [i] {page}: no main-branch original (new page)")

    def fail(msg):
        nonlocal ok; ok = False; print(f"  [FAIL] {msg}")
    def warn(msg):
        print(f"  [warn] {msg}")

    # tracking
    if new.count("GTM-5QVG68CF") < 2: fail("GTM blocks missing (<2 occurrences)")
    if new.count("1682413179857373") < 2: fail("Meta pixel missing (<2 occurrences)")
    if 'rel="canonical"' not in new: fail("canonical missing")
    if 'property="og:title"' not in new: fail("og:title missing")

    # JSON-LD
    blocks = ld_blocks(new)
    for i, b in enumerate(blocks):
        try: json.loads(b)
        except Exception as e: fail(f"ld+json block {i} invalid: {e}")
    if old is not None:
        oldn = len(ld_blocks(old))
        if len(blocks) < oldn: fail(f"ld+json count regressed {oldn} -> {len(blocks)}")

        # Stripe links
        o, n = stripe_links(old), stripe_links(new)
        if o - n: fail(f"Stripe links LOST: {o - n}")
        if (n - o) - (n & FROZEN_LINKS): warn(f"new non-frozen stripe ids: {n - o - FROZEN_LINKS}")
        bogus = n - FROZEN_LINKS
        if bogus: fail(f"unknown/invented Stripe ids: {bogus}")

        # mounts
        for mount in ('id="site-nav"', 'id="site-footer"'):
            if mount in old and mount not in new: fail(f"{mount} mount dropped")

        # title/desc
        if meta(new, "title") != meta(old, "title"): warn(f'title changed: "{meta(old,"title")[:60]}" -> "{meta(new,"title")[:60]}"')
        if meta(new, "desc") != meta(old, "desc"): warn("meta description changed")

    # v2 hygiene
    if "v2.css" in new:
        if "shared.css" in new: fail("v2 page still loads shared.css")
        if 'id="silk-bg"' in new: fail("silk canvas still present")
    return ok

if __name__ == "__main__":
    allok = True
    for p in sys.argv[1:]:
        print(f"== {p}")
        allok = check(p) and allok
    print("\nRESULT:", "PASS" if allok else "FAIL")
    sys.exit(0 if allok else 1)
