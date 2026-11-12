# UX reviewer

An agent uses the local build of the site as a real visitor would (on an iPhone with WebKit, on Android with Chromium,
and on desktop), tries to reach a goal, and reports where it got stuck, confused or gave up, with steps,
screenshots and a cause hypothesis. Ported from the reviewer in Mapa de Crimes / Habla Mucho. The Playwright driver
is the same; the environment and personas were rewritten for a static site.

- **Command:** `/ux-review focused "<change>"` or `/ux-review open "<intent>"` (`.claude/skills/ux-review/SKILL.md`).
- **Role:** `.claude/agents/ux-reviewer.md` (Codex by default; Sonnet subagent with `--quick`).
- **Question it answers:** does the vim styling delight the people who get it without confusing the people who don't?

## Pieces

| File | Role |
| --- | --- |
| `env.mjs` | `up` builds the tested tree into `<tmpdir>/portfolio-ux[N]/dist`, serves it on `127.0.0.1:8781+10N`, writes the personas; `down`; `reset` (storage only) |
| `static.mjs` | Tiny static server with GitHub Pages semantics (`dir/` → `index.html`, unknown → `404.html`). Replaces `astro preview`, which allows one instance per project |
| `personas.mjs` | Who arrives where with what goal: `recruiter`, `hiring-engineer`, `vim-user`, `small-business` |
| `ux.mjs` | Driver: one action per call, accessibility tree, screenshots, sensors (targets < 44 px, clipped text, horizontal scroll), axe |
| `probe.mjs` | Replays the reviewer's path at 320 px, dark, Android and landscape, with double tap, reload, back and offline, and lists only what differs |
| `prune-runs.mjs` | Deletes screenshots and trails from runs older than 30 days |

Setup: `npm install --prefix scripts/ux` (Playwright 1.64, axe-core 4.14; browsers from the shared Playwright cache).
Runs go to `.ux-runs/` (git-ignored).

## Manual use

```sh
node scripts/ux/env.mjs up
nohup node scripts/ux/ux.mjs serve --out .ux-runs/manual > /dev/null 2>&1 &
node scripts/ux/ux.mjs open recruiter iphone
node scripts/ux/ux.mjs look
node scripts/ux/ux.mjs tap "role:link:2projects/"
node scripts/ux/ux.mjs stop && node scripts/ux/env.mjs down
```
