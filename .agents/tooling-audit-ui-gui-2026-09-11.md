# UI / GUI tooling audit - skills and connectors vs what Carbonated Audio has

Date: 2026-09-11. Star counts are what github.com displayed that day (GitHub rounds above 1k).
Last-commit dates were not retrievable (GitHub API is blocked from this session and /commits pages
are robots-blocked), so "updated" means latest release date or the skill file dates shown by
aggregators. Anything not verified is marked as such.

## Update, same day: installed, plus corrections

Everything below was installed on the Mac mini on 2026-09-11 02:06 by _tooling/install-tooling.command
(log: _tooling/install.log, "INSTALL COMPLETE - no failures"):

- Project + user skills: frontend-design, theme-factory, carbonated-brand-guidelines,
  design-taste-frontend, web-design-guidelines, refactoring-ui, interface-design
  (source copies in .agents/skills/, mirrored to .claude/skills/ and ~/.claude/skills/)
- Commands: /design-review, /design-deslop (user + project)
- Plugins: audio-plugin-validators@audio-plugin-dev-skills, web-asset-generator
- MCP (user scope): context7, chrome-devtools, both reported Connected
- Workspaces: ~/audio-plugin-coder (313 MB, JUCE 9 + pluginval + visage submodules),
  ~/plugin-freedom-system
- Cowork: frontend-design, carbonated-brand-guidelines, interface-design offered as claude.ai
  skill save cards in the session

Three corrections to the audit below, found during the install:

1. The audit only saw the connected repo. The Mac's Claude Code CLI already had UI tooling I
   could not see from Cowork: user skills ui-ux-pro-max and stop-slop (plus
   blender-cinematic-animator, remotion-best-practices, morning-standup, paste-clean, and all
   34 marketingskills at user level, so those DO auto-load in the CLI); plugins superpowers,
   claude-mem, vercel, clangd-lsp, swift-lsp, imessage, telegram; MCP servers magic-patterns,
   stitch (disabled for this project), reactbits, nanobanana, youtube, google_analytics,
   google_search_console, gmail, blender, canva (disabled), meta-ads (disabled), composio
   (disabled). So "zero UI tooling" was true for Cowork only. You now have five overlapping
   web-design skills in the CLI (ui-ux-pro-max, stop-slop, frontend-design,
   design-taste-frontend, interface-design). Prune to two or three or they will fight.
2. Anthropic's brand-guidelines skill applies ANTHROPIC's brand (Poppins/Lora, #d97757). It
   was not installed. carbonated-brand-guidelines replaces it with values from shared.css.
3. audio-plugin-coder pins JUCE 9.0.1 (package.json and README v1.4.0), not JUCE 8. Its
   WebView interop path is the JUCE 9 @juce-framework/webview one. Use its /design phase and
   the WebView2 skill for patterns; do not let it upgrade your JUCE 8 projects.

## Bottom line

You have zero GUI/UI generation tooling in the Cowork stack today (see the update above for
what the Mac CLI already had). Everything installed is either
marketing, documents, ops, or review-style design skills (critique, handoff, a11y). Six adds
cover the real gaps, in this order:

1. anthropics/skills: frontend-design + brand-guidelines + theme-factory (web UI, one install)
2. Noizefield/audio-plugin-coder (JUCE WebView GUI path, cross-platform incl. Windows)
3. iPlug3/audio-plugin-dev-skills (validators + check-codesign: hardened runtime, entitlements,
   notarization, VST3 editor host) - not GUI, but it is your exact ship chain
4. Leonxlnx/taste-skill (anti-generic-UI rules, small, complements frontend-design)
5. Context7 (JUCE 8 docs on demand, 727 snippets indexed) - for Claude Code on the Mac
6. Build your own "carbonated-lookandfeel" skill with skill-creator from TALLBOY / Carbonator
   source. Nothing on GitHub covers native JUCE LookAndFeel, filmstrip knobs, or pixel-art
   Graphics rendering. That gap is real and only you can fill it.

Skip Figma, shadcn, 21st Magic, Storybook, Playwright MCP, ui-ux-pro-max, gstack, superpowers,
LibreUIUX, designer-skills for now. Reasons per item below.

## What you have today

### Cowork connectors (13, all connected and enabled in chat)
Cloudflare Developer Platform, Dropbox, ElevenLabs, Gmail, Google Calendar, Hugging Face,
Lovable, Netlify, PayPal, Resend, Square, Stripe, Vercel.
Plus device-side: Claude in Chrome, built-in browser, Blender MCP, computer use on the Mac mini.

UI-relevant among these: Lovable (React/Tailwind/shadcn app builder, web only), Claude in Chrome
and built-in browser (manual QA of the site, console + network reads), Blender (3D assets).

### Cowork plugins (7)
sp-global, product-tracking-skills, operations, design, productivity, marketing,
cowork-plugin-management.

The "design" plugin = accessibility-review, design-critique, design-handoff, design-system,
research-synthesis, user-research, ux-copy. These review and document; none generates UI. It
declares a Figma MCP component but you have no Figma connector, so the handoff skill runs blind.

### claude.ai skills (7)
docx, pdf, pptx, xlsx, skill-creator, morning, import-memory. Session built-ins also present:
design (Claude Design canvas for mockups), dataviz, artifact-design, artifact-diagramming.

### Repo-local skills (.agents/skills in carbonator-website-seo)
34 skills = coreyhaines31/marketingskills (49.4k stars), installed with the skills CLI. All
marketing/CRO/SEO, zero UI. Two observations:
- There is no .claude/ directory in the repo, so Claude Code CLI will not auto-load them, and
  this Cowork session does not list them as skills either (ListSkills returns the 7 above).
  They work when pointed at as files, not as auto-triggering skills.
- carbonatedaudio.com/.agents/... returns 404 on the live site (checked 2026-09-11), so the
  folder is safe even though publish = "." and it is not in the netlify.toml block list.

### Plugin stack (from memory)
JUCE 8, macOS VST3/AU/AAX + Windows VST3, PACE/Eden for AAX, notarytool profile
carbonator-notary, pkgutil, shell scripts. On Tap / Pour / Still Windows builds in progress.

## Cross-reference 1: plugin GUI (JUCE 8)

| Repo | Stars | Updated | GUI content | Verdict |
|---|---|---|---|---|
| Noizefield/audio-plugin-coder | 298 | Aug 2026 | WebView HTML5 Canvas + Visage. juce-webview-windows skill (~4500 words): WebView2 member-order crash trap, inline-JS-only rule, resource provider MIME map, Juce.getSliderState bindings. 5-phase /dream /plan /design /impl /ship. Pins JUCE 9.0.1 (verified in package.json + README v1.4.0) | ADD, for the /design phase and the WebView2 skill. Best fit for the Windows builds in progress. Caveats: no AAX in its format table (VST3/AU/Standalone/LV2), so /ship does not replace your PACE chain; JUCE 9 pin means keep it as a separate workspace (~/audio-plugin-coder), never point it at your JUCE 8 projects |
| glittercowboy/plugin-freedom-system (TACHES) | 212 | Nov 2025 (stale) | ui-mockup, aesthetic-dreaming (retro/hardware style capture: palettes, knob styling), ui-design-agent ~4200 lines. Output = HTML/CSS for JUCE WebView, then C++ scaffold. macOS only | MAYBE. Cherry-pick ui-mockup + aesthetic-dreaming only for TALLBOY-style concepts. Do not install the whole system |
| danielraffel juce-dev (generous-corp-marketplace) | 10 | Mar-Apr 2026 | juce-visage + visage-theme: Metal view embedding, JUCE<->Visage event bridge, JSON color tokens -> C++ | SKIP unless you move to Visage. macOS/iOS only, no Windows path |
| iPlug3/audio-plugin-dev-skills (Oli Larkin) | 88 | Feb 2026 | Not GUI. validate-audiounit/vst3/clap/pluginval, validate-vst3-editorhost, check-codesign (hardened runtime, entitlements, notarization) | ADD. Matches your ship chain exactly. Would have caught the 0.1.0 vs 1.0.0 mismatch class of bug |
| yebot/rad-cc-plugins juce-dev-team | 6 | Nov 2025 | ui-engineer agent mentions LookAndFeel_V4 / paint / resized, prose only, zero code. 5 skills all non-GUI | SKIP |
| josmithiii juce-docs-mcp-server | 16 | Jan 2026 | Live Doxygen search over docs.juce.com incl. Component, LookAndFeel, WebBrowserComponent | OPTIONAL. Context7 covers the same need with less setup |
| Context7 juce-framework/juce index | n/a | 2 weeks ago | 727 snippets / 57k tokens | ADD in Claude Code on the Mac |
| sgm-audio/apc-mcp | 0 | Sep 2026 | CMake/ctest/clang-format/pluginval/clap-validator wrapper | SKIP, your shell scripts already do this |
| iPlug2/iPlug2 .claude/skills | 2.4k (framework) | n/a | build/validate/setup-deps only | n/a, you are JUCE |
| mcpmarket "Audio Plugin GUI Designer" | not visible | not visible | Page 429'd on 9 attempts. Every other JUCE listing on mcpmarket maps to plugin-freedom-system or yebot, so this is most likely plugin-freedom-system's ui-mockup | UNVERIFIED, treat as duplicate |

Hard gap: no skill anywhere covers native JUCE Graphics LookAndFeel, filmstrip/image knobs, or
pixel-art rendering. Every GUI skill found routes through WebView or Visage. If you stay native,
the highest-leverage move is a house skill built from your own LookAndFeel classes (see
"build your own" below).

## Cross-reference 2: web UI (carbonatedaudio.com)

Site is static HTML + shared.css + vanilla JS components on Netlify. No React, no framework.
That kills most of the popular "UI" tooling (shadcn, 21st Magic, Magic UI, Storybook, Vercel
react-best-practices).

| Repo | Stars | Type | Verdict |
|---|---|---|---|
| anthropics/skills frontend-design | 168.9k (repo) | Skill. Pushes away from generic AI-looking layouts: typography, palette, layout, motion | ADD, first |
| anthropics/skills brand-guidelines | same repo | CORRECTION: applies Anthropic's own brand, not a generic brand file. Used only as the template for carbonated-brand-guidelines (values from shared.css + product-marketing-context.md) | FORKED, not installed as-is |
| anthropics/skills theme-factory | same repo | 10 curated font+color themes for artifacts/pages | ADD (cheap) |
| anthropics/skills web-artifacts-builder | same repo | React + Tailwind + shadcn artifacts | SKIP, site is not React |
| anthropics/skills webapp-testing | same repo | Drives a real browser to exercise a web app (Playwright under the hood) | MAYBE for Claude Code CLI checkout-flow tests. In Cowork, Claude in Chrome already covers it |
| anthropics/skills canvas-design | same repo | PNG/PDF visual compositions | MAYBE for ad creative / OG images |
| Leonxlnx/taste-skill | 70.1k | Anti-slop layout/type/motion/spacing rules | ADD, small and complementary |
| vercel-labs/agent-skills | 31.0k | 8 skills; only web-design-guidelines applies to a vanilla site | MAYBE, install just that one skill |
| nextlevelbuilder/ui-ux-pro-max-skill | 126.2k | 192 rules, 79 UI styles, 192 palettes, 74 font pairs, 22 stacks, CLI generates a design system | SKIP for now. Heavy, overlaps frontend-design, and its "pick a style" output fights an established brand |
| wondelai/skills | 1.4k | Book-derived: Refactoring UI, UX heuristics, Lean UX | MAYBE, refactoring-ui skill only |
| alonw0/web-asset-generator | 490 | Favicons, app icons, OG/social images from a logo | ADD, cheap win for 6 product OG images |
| garrytan/gstack | 132k | 23 slash-command roles (CEO, designer, QA...) | SKIP, not UI-specific, big context cost |
| obra/superpowers | 282.6k | TDD/planning methodology | SKIP, not UI |
| Owl-Listener/designer-skills | 2.5k | 273 skills / 76 commands | SKIP, bloat; the Cowork design plugin covers the same ground |
| HermeticOrmus/LibreUIUX-Claude-Code | 80 | Claims 152 agents / 70 plugins; 80 stars | SKIP |
| claudekit/frontend-design-pro-demo | 269 | 11 aesthetics demo | SKIP, demo |
| zarazhangrui/frontend-slides | 28.6k | HTML slide decks | SKIP, you have pptx + Slides |
| Dammyjay93/interface-design | 5.5k | Persisted design principles across sessions | MAYBE later, once frontend-design + brand file are in |
| shadcn/ui skill (ui.shadcn.com/docs/skills) | n/a | shadcn component/theming knowledge | SKIP, no React. Lovable already handles shadcn if you ever need an app |

## Cross-reference 3: connectors and MCP servers

### claude.ai connector directory (installable from Cowork), not installed
| Connector | Verdict |
|---|---|
| Figma (official) | Only if you actually design in Figma. Free Starter plan = up to 20 tool calls/month; usable rates need a Dev or Full seat on a paid plan (200/day Pro). Your design plugin's handoff skill expects it |
| Canva | MAYBE for ad creative and social. You have paid ads test 1 pending a video; Canva connector can search/autofill/export designs |
| Webflow, Miro, Eraser, Retool, Floot, Macaly | SKIP, site is static HTML on Netlify |
| Jam, Subtext, Fullstory | SKIP for now; session replay is overkill at current traffic |
| Flourish | SKIP, dataviz skill already covers charts |

GitHub did not come back in the connector directory search. This session's GitHub API access
is repo-scoped and blocked for search, so release-asset checks still go through gh on the Mac
via the Finder + .command recipe.

### MCP servers for Claude Code on the Mac (not Cowork)
| Server | Stars | Official | Verdict |
|---|---|---|---|
| upstash/context7 | 61.8k | yes | ADD. JUCE index + Stripe/Netlify/Resend docs. npx ctx7 setup |
| ChromeDevTools/chrome-devtools-mcp | 49.3k | Google | MAYBE. Perf traces + console + network on the live site. Overlaps Claude in Chrome inside Cowork, so only worth it in the CLI |
| microsoft/playwright-mcp | 36.8k | Microsoft | SKIP in Cowork (two browsers already). MAYBE in CLI for scripted checkout-flow regression |
| github/github-mcp-server | 32.2k | GitHub | MAYBE. gh CLI already logged in as mixedbysoda-stack on the Mac covers it |
| modelcontextprotocol/servers | 90.0k | yes | reference servers only; nothing UI |
| GLips/Figma-Context-MCP (Framelink) | 15.6k | community | SKIP unless Figma. Works on free Figma with a PAT, which beats the official server's 20/month cap if you do go Figma |
| 21st-dev/magic-mcp | 5.6k | 21st | SKIP. Now a compat proxy for 21st MCP, paid key ($6-15/mo), React output |
| Jpisnice/shadcn-ui-mcp-server | 2.9k | community | SKIP, no React |
| official shadcn MCP (npx shadcn@latest mcp init) | n/a | shadcn | SKIP, no React |
| storybookjs/mcp | 270 | Storybook | SKIP, no component framework |
| browserbase/mcp-server-browserbase | 3.4k | Browserbase | SKIP, paid cloud browser, two local browsers already |
| browserstack/mcp-server | 150 | BrowserStack | SKIP for now; revisit if Windows-browser bugs show up on the site |
| penpot/penpot-mcp | 471 | Penpot, ARCHIVED 2026-02-03, moved into penpot/penpot | SKIP |
| magicuidesign/mcp | 192 | Magic UI | SKIP, React |

## Overlaps already in the stack (not UI, but you asked for a cross-reference)

- marketingskills (.agents, 34 skills) vs Cowork "marketing" plugin (content-creation,
  email-sequence, seo-audit, competitive-brief, campaign-plan, brand-review, performance-report).
  Same jobs twice. marketingskills is more specific; the plugin is what auto-triggers in Cowork.
  Keep both, but know which one answered.
- Cowork "design" plugin vs Cowork "design" canvas skill: different things (review workflows vs
  mockup canvas). No conflict.
- Netlify + Vercel connectors both connected; site deploys on Netlify. Not checked whether
  anything lives on Vercel.
- Lovable connected: it is the only thing in the stack that can generate a React UI. Fine as a
  fallback; irrelevant to plugins and to the static site.

## Build your own: carbonated-lookandfeel skill

Why: nothing public covers native JUCE painting, and your GUIs are the product. Inputs you
already have: TALLBOY / Carbonator / FIZZFUEL LookAndFeel and Component sources, the pixel-art
and trading-card design notes, screenshots in the repo (carbonator-screenshot.png etc.).

Skill contents (use skill-creator, which you already have):
- house rules: knob/slider drawing conventions, filmstrip vs vector, DPI handling, font stack,
  palette per product, hit-target minimums, resize behaviour
- snippets: your real LookAndFeel overrides (drawRotarySlider, drawLinearSlider, drawButtonBackground,
  drawComboBox), Timer-driven meters, AttachedControl patterns
- rules for AAX (PACE) and AU validation gotchas that affect the editor
- eval: "add a bypass toggle to Pour's editor in house style" with expected diff shape

This is a one-session job once the source is in front of Claude Code on the Mac.

## Install commands (copy/paste, Mac, Claude Code CLI)

    # 1. Anthropic skills (frontend-design, brand-guidelines, theme-factory)
    npx skills add anthropics/skills --skill frontend-design
    npx skills add anthropics/skills --skill brand-guidelines
    npx skills add anthropics/skills --skill theme-factory

    # 2. JUCE WebView GUI workflow
    npx github:Noizefield/audio-plugin-coder

    # 3. Plugin validators + codesign checks
    /plugin marketplace add iPlug3/audio-plugin-dev-skills
    /plugin install audio-plugin-validators@audio-plugin-dev-skills

    # 4. Taste rules
    npx skills add https://github.com/Leonxlnx/taste-skill

    # 5. Context7 (JUCE docs)
    npx ctx7 setup

    # optional
    npx skills add vercel-labs/agent-skills --skill web-design-guidelines
    npx skills add https://github.com/glittercowboy/plugin-freedom-system --skill ui-mockup
    npx skills add https://github.com/glittercowboy/plugin-freedom-system --skill aesthetic-dreaming
    /plugin marketplace add alonw0/web-asset-generator
    /plugin install web-asset-generator@web-asset-generator-marketplace
    claude mcp add chrome-devtools --scope user npx chrome-devtools-mcp@latest

Note: the skills CLI writes to .agents/skills by default (same as your marketingskills set).
Pass the agent flag or symlink into .claude/skills if you want Claude Code CLI to auto-trigger
them. Cowork sessions do not load .agents/skills as skills.

## What was verified and what was not

Verified 2026-09-11: every star count above (github.com page), the anthropics/skills folder
contents (figma skill does NOT exist there despite blog posts), audio-plugin-coder README
(install command, JUCE 8 badge, phase names, format table), Figma MCP rate limits
(developers.figma.com), 21st Magic key reset and pricing, Penpot archive, live-site 404 for
/.agents/ paths, current Cowork inventory (ListSkills / ListPlugins / ListConnectors), repo
.agents/skills contents.

Not verified: last-commit dates (API blocked), mcpmarket "Audio Plugin GUI Designer" source
(429), whether anything is deployed on Vercel, whether the ~/.claude on the Mac has skills or
MCP servers outside this repo (only carbonator-website-seo is connected to this session).

## Sources

- https://github.com/anthropics/skills
- https://github.com/Noizefield/audio-plugin-coder
- https://github.com/glittercowboy/plugin-freedom-system
- https://github.com/danielraffel/generous-corp-marketplace
- https://github.com/iPlug3/audio-plugin-dev-skills
- https://github.com/josmithiii/mcp-servers-jos
- https://github.com/yebot/rad-cc-plugins
- https://github.com/Leonxlnx/taste-skill
- https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- https://github.com/vercel-labs/agent-skills
- https://github.com/wondelai/skills
- https://github.com/alonw0/web-asset-generator
- https://github.com/Dammyjay93/interface-design
- https://github.com/garrytan/gstack
- https://github.com/obra/superpowers
- https://github.com/Owl-Listener/designer-skills
- https://github.com/HermeticOrmus/LibreUIUX-Claude-Code
- https://github.com/coreyhaines31/marketingskills
- https://github.com/travisvn/awesome-claude-skills
- https://github.com/ComposioHQ/awesome-claude-skills
- https://github.com/hesreallyhim/awesome-claude-code
- https://github.com/upstash/context7
- https://github.com/ChromeDevTools/chrome-devtools-mcp
- https://github.com/microsoft/playwright-mcp
- https://github.com/github/github-mcp-server
- https://github.com/GLips/Figma-Context-MCP
- https://github.com/21st-dev/magic-mcp
- https://github.com/Jpisnice/shadcn-ui-mcp-server
- https://github.com/storybookjs/mcp
- https://github.com/penpot/penpot-mcp
- https://github.com/browserstack/mcp-server
- https://github.com/browserbase/mcp-server-browserbase
- https://ui.shadcn.com/docs/skills
- https://ui.shadcn.com/docs/mcp
- https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/
- https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server
- https://context7.com/juce-framework/juce
- https://pasqualepillitteri.it/en/news/576/claude-code-skills-design-uiux-guide
- https://designrevision.com/blog/best-claude-code-skills
- https://www.builder.io/blog/best-mcp-servers-2026
- https://danielraffel.me/2026/03/06/a-claude-code-plugin-for-building-juce-audio-plugins/
