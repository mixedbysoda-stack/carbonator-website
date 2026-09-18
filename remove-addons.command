#!/bin/bash
# Carbonated Audio - remove the Add-ons store and the Mega Bundle.
# Deletes the add-on pages/assets/functions, runs the build guard, commits, pushes.
# Generated 2026-09-18. Safe to delete this file after it has run once.
set -uo pipefail
cd "/Users/soda/carbonator-website-seo" || exit 1
LOG="/Users/soda/carbonator-website-seo/remove-addons.log"
exec > >(tee -a "$LOG") 2>&1
echo "=== remove-addons $(date) ==="

echo "--- git state before ---"
git status --short | head -60

echo "--- deleting add-on files ---"
git rm -f --ignore-unmatch \
  addons.html \
  addons.css \
  mega-bundle.html \
  components/addons-catalog.js \
  components/addons.js \
  netlify/functions/download-addon.js \
  netlify/functions/upload-addon-file.js \
  netlify/functions/addon-waitlist.js \
  netlify/functions/lib/addon-links.js \
  scripts/upload-addons.js
git rm -rf --ignore-unmatch addons
rm -rf addons

echo "--- build guard ---"
if ! node scripts/check-tracking.js; then
  echo "!! check-tracking FAILED - nothing committed. Fix, then re-run."
  exit 1
fi

echo "--- committing ---"
git add -A
git commit -m "Remove the Add-ons store and the Mega Bundle

Pulls the whole add-ons surface off the site: the /addons hub, the
expansion-packs and templates category pages, /mega-bundle, the nav
Add-ons menu (desktop and mobile), the shared catalog, and the four
add-on Netlify functions (download-addon, upload-addon-file,
addon-waitlist, addon-links).

Also drops the add-on and Mega Bundle branches from config.js,
stripe-webhook.js, verify-session.js, email-templates/render.js and
success.html, the twelve add-on payment links from checkout-tracking.js,
the four sitemap entries, the four netlify.toml redirects, and section 9
of scripts/check-tracking.js. Component cache stamp bumped to
20260918-noaddons so the old nav cannot be served from cache.

Stripe payment links are left active on purpose and are unreachable from
the site.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Dtj5KQ3PkepGPPExhLL6Lo"

echo "--- diff vs origin (sanity: nothing unexpected) ---"
git fetch origin --quiet
git diff origin/main..HEAD --stat

echo "--- pushing ---"
git push origin HEAD

echo "=== done $(date) ==="
echo "Press return to close."
read -r _
