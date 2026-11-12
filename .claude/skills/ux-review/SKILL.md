---
name: ux-review
description: UX review of the portfolio site by an agent that uses the local build as a real visitor (iPhone/WebKit, Android, desktop) with personas (recruiter, hiring-engineer, vim-user, small-business). Codex by default; --quick uses the ux-reviewer subagent. Use with /ux-review focused "<change>" or /ux-review open "<persona intent>", before deploying interface changes. Options: --personas a,b --devices iphone,android --ref COMMIT --quick --opus --no-probe.
---

# /ux-review

The reviewer follows `.claude/agents/ux-reviewer.md`. **Default: Codex** (`codex exec`, ~10–20 min);
`--quick`: the `ux-reviewer` subagent (Sonnet); `--opus`: the same subagent on Opus. It covers what a build can't:
a person trying to get somewhere, and whether the vim styling helps or gets in the way. Overview in
`scripts/ux/README.md`.

0. **Prune old runs:** `node scripts/ux/prune-runs.mjs` (mention it only if it deleted something). If
   `scripts/ux/node_modules` is missing, run `npm install --prefix scripts/ux`.
1. **Start the environment (you, not the reviewer):** `UX_SLOT=N node scripts/ux/env.mjs up [--code DIR]` (~5 s;
   builds the working tree into `<tmpdir>/portfolio-ux[N]/dist` and serves it on `127.0.0.1:8781+10N` with GitHub
   Pages semantics). The reviewer only drives the browser.
   - With `--ref COMMIT`: `git worktree add --detach "$TMPDIR/portfolio-ux-ref" <COMMIT>`, `npm ci` there, and point
     `--code` at it.
2. **Write the request** to a file in the scratchpad:
   - mode `focused` + the change (diff/commit and what it promises), or `open` + the intent in first person;
   - personas and devices. Defaults: `recruiter` on `iphone` and `hiring-engineer` on `desktop` for any change;
     add `vim-user` on `desktop` when keys, `:` commands, the tab line or the status line change; `small-business` on
     `android` for project pages or contacts;
   - `$RUN=.ux-runs/<YYYYMMDD-HHMM>-<slug>` (create it) and `UX_SLOT=N`.
3. **Run.**
   - **Codex (default)**, in the background (Bash `run_in_background`), with a preamble before the request: "read and
     follow `.claude/agents/ux-reviewer.md` (without the frontmatter); use `view_image` where the role says Read; run
     `ux.mjs serve` with `nohup … &`; the environment is already up, don't run `env.mjs`; don't edit outside `$RUN`;
     the final answer is only the report".
     ```sh
     codex exec -C "$PWD" -s workspace-write -c sandbox_workspace_write.network_access=true \
       -c model_reasoning_effort='"medium"' --json -o "$SCRATCH/ux-report.md" - < "$SCRATCH/ux-request.md" \
       > "$SCRATCH/ux-events.jsonl" 2> "$SCRATCH/ux-stderr.log"
     ```
     Never `danger-full-access`. Token usage is in the `turn.completed` event.
   - **`--quick`/`--opus`**: Agent `subagent_type: ux-reviewer` (with `model: opus` for `--opus`), passing the request.
   - Simultaneous runs need different slots.
4. **Probe (focused mode, unless `--no-probe`; in open mode when the trail has a clear path)**, done by you after the
   reviewer:
   ```sh
   UX_SLOT=N node scripts/ux/probe.mjs --run $RUN --steps auto    # Bash run_in_background; wait for the end notice
   ```
   It replays the reviewer's first visit at 320 px, dark, Android and landscape, with double tap, reload, back and
   offline at each step, confirming 2/2 and on the other engine. Read `$RUN/probe/probe.md` and the sheets
   (`sheet-N.png`), open the screenshots of each anomaly and judge them as the persona. The blinking cursor and
   font loading can change pixels by themselves: discard differences that are only that. Bring only what you judged
   into the report, in a "Probe" section.
5. **Tear down:** `UX_SLOT=N node scripts/ux/env.mjs down`; with `--ref`, `git worktree remove --force
   "$TMPDIR/portfolio-ux-ref"`. Check the ports (`lsof -iTCP -sTCP:LISTEN -P | grep -E ':87[89][0-9]'`).
6. **Verify and save:** write the report (reviewer text + "Probe") to `$RUN/report.md`. Open the screenshots of P0–P2
   findings and check the cause hypothesis in the code before passing it on. A finding without a screenshot or a 2/2
   reproduction stays "unconfirmed".
7. **Answer the user:** a findings table (priority, type, title), the journey, and the report path. P0–P2 defects in
   a change under way get fixed before deploy; friction and product suggestions go to a backlog only with the user's
   approval.

Limits: local environment only; never production (`nunseik.github.io`), deploy or push. `.ux-runs/` and
`scripts/ux/node_modules/` are ignored by Git. Environment state (server log, personas) lives in
`$TMPDIR/portfolio-ux[N]`.
