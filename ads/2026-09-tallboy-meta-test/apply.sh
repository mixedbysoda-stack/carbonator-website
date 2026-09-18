#!/usr/bin/env bash
# Applies the Meta Pixel / Lead / InitiateCheckout / mobile-demo patch and bumps the
# tracker cache stamp on every page. Run from anywhere inside the repo. macOS sed.
#
#   bash ads/2026-09-tallboy-meta-test/apply.sh
#
# It stops before committing. Review `git diff`, then commit and push yourself.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
PATCH="ads/2026-09-tallboy-meta-test/meta-pixel-events.patch"
OLD="checkout-tracking.js?v=20260826-apd"
NEW="checkout-tracking.js?v=20260908-meta"

if grep -q 'fbq("init","1682413179857373")' tallboy.html; then
  echo "tallboy.html already carries the pixel - patch looks applied. Nothing to do."; exit 0
fi

git apply --check "$PATCH"
git apply "$PATCH"
echo "patch applied to tallboy.html, components/checkout-tracking.js, components/footer.js, netlify/functions/lib/welcome-emails.js, scripts/check-tracking.js"

# Every page must reference the tracker under ONE stamp, or the guard fails the build.
# tallboy.html and footer.js are already bumped by the patch; this does the other pages.
if [[ "$(uname)" == "Darwin" ]]; then SED=(sed -i ''); else SED=(sed -i); fi
files=$(grep -l "$OLD" -- *.html || true)
if [[ -n "$files" ]]; then
  echo "$files" | xargs "${SED[@]}" "s#$OLD#$NEW#g"
  echo "bumped tracker stamp on: $(echo "$files" | tr '\n' ' ')"
fi

node scripts/check-tracking.js
echo
echo "Done. Review with: git diff --stat && git diff tallboy.html"
echo "Then: git add -A && git commit -m 'Meta Pixel on /tallboy, Lead + InitiateCheckout events, mobile demo-by-email, demo email fix' && git push"
