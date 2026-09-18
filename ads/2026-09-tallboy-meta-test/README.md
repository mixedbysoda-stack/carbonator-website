# TALLBOY first paid test - working folder
Prepared 2026-09-03. The full plan (call, budget math, campaign settings, shot list,
checklist, scorecard, sources) is the "TALLBOY Ad Test" page in your Claude artifacts.

Files here:
- AD-COPY-tallboy-meta-test.md   paste-ready Meta and Reddit copy, captions, ad names, UTM string
- creatives/                     8 static ads: 2 hooks x (1080x1080, 1080x1350, 1080x1920, 1200x628)
- meta-pixel-events.patch        site changes: pixel on /tallboy, Lead + InitiateCheckout, mobile
                                 "email me the demo" sheet, demo-email fix, build guard
- apply.sh                       applies the patch, bumps ?v= stamps on the other pages, runs the guard
- tallboy-ad-test.html           offline copy of the plan page

Apply the site changes:
  bash ads/2026-09-tallboy-meta-test/apply.sh
  git diff --stat
  git add -A && git commit -m "Meta Pixel on /tallboy, Lead + InitiateCheckout events, mobile demo-by-email, demo email fix"
  git push

This folder is not in .gitignore. The repo is public; nothing in here is secret, but if you
would rather keep ad plans out of the public tree add "ads/" to .gitignore before committing.
