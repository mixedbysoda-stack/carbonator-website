# UI skills added 2026-09-11 (the 7 folders listed below; the other 34 are coreyhaines31/marketingskills)

Installed 2026-09-11 from the tooling audit (.agents/tooling-audit-ui-gui-2026-09-11.md).
Web/UI skills only. _tooling/install-tooling.command mirrors these 7 into .claude/skills
(project level, auto-loaded by Claude Code CLI in this repo) and ~/.claude/skills (user level,
every repo), and clones the JUCE GUI workspaces. Cowork sessions do not load either location;
the same skills are offered as claude.ai skills via the save cards in the 2026-09-11 session.

| Folder | Source | Commit | License |
|---|---|---|---|
| frontend-design | https://github.com/anthropics/skills (skills/frontend-design) | 34040c9 | Apache 2.0 |
| theme-factory | https://github.com/anthropics/skills (skills/theme-factory) | 34040c9 | Apache 2.0 |
| carbonated-brand-guidelines | forked from anthropics/skills brand-guidelines template; values from shared.css + .agents/product-marketing-context.md | 34040c9 | Apache 2.0 |
| design-taste-frontend | https://github.com/Leonxlnx/taste-skill (skills/taste-skill, v2) | ccbc156 | MIT |
| web-design-guidelines | https://github.com/vercel-labs/agent-skills (skills/web-design-guidelines) | 063bee9 | MIT |
| refactoring-ui | https://github.com/wondelai/skills (refactoring-ui) | c172996 | MIT |
| interface-design | https://github.com/Dammyjay93/interface-design (+ /design-review and /design-deslop commands in ../claude-commands) | 2f9be32 | MIT |

Notes:
- design-taste-frontend is 87 KB; it only loads when triggered, but expect a big context hit.
- Anthropic's original brand-guidelines skill applies ANTHROPIC's colors and fonts. It was
  not installed as-is; carbonated-brand-guidelines replaces it.
- To update: re-clone the source at a newer commit and copy the folder over.
