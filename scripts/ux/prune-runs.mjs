// Keeps .ux-runs/ small: in runs older than N days (default 30) it deletes the bulky evidence (shots/,
// trail.jsonl, *.log) and keeps report.md, notes and regression drafts. A run's date comes from its name
// (2026-11-05-… or 20261103-…), else from its last change. Files at the top of .ux-runs/ are left alone.
//   node scripts/ux/prune-runs.mjs [--days 30] [--dry-run]
// /ux-review runs it before each review.
import {existsSync, readdirSync, rmSync, statSync} from 'node:fs';
import {join} from 'node:path';

const args = process.argv.slice(2);
const days = Number(args.includes('--days') ? args[args.indexOf('--days') + 1] : 30);
const dry = args.includes('--dry-run');
if (!Number.isFinite(days) || days < 1) throw new Error('--days must be a positive number');
const root = new URL('../../.ux-runs/', import.meta.url).pathname;
if (!existsSync(root)) { console.log(JSON.stringify({pruned: 0, freed_mb: 0})); process.exit(0); }

const cutoff = Date.now() - days * 86_400_000;
const named = name => {
  const match = name.match(/^(\d{4})-?(\d{2})-?(\d{2})(?:-|$)/);
  return match ? new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00`).getTime() : null;
};
const size = path => {
  const info = statSync(path);
  return info.isDirectory() ? readdirSync(path).reduce((total, name) => total + size(join(path, name)), 0) : info.size;
};

let pruned = 0, freed = 0;
const runs = [];
for (const entry of readdirSync(root, {withFileTypes: true})) {
  if (!entry.isDirectory()) continue;
  const dir = join(root, entry.name);
  const when = named(entry.name) ?? statSync(dir).mtimeMs;
  if (when >= cutoff) continue;
  const bulky = readdirSync(dir).filter(name => name === 'shots' || name === 'trail.jsonl' || name.endsWith('.log'));
  if (!bulky.length) continue;
  for (const name of bulky) {
    const path = join(dir, name);
    freed += size(path);
    if (!dry) rmSync(path, {recursive: true, force: true});
  }
  pruned += 1; runs.push(entry.name);
}
console.log(JSON.stringify({days, dry_run: dry, pruned, freed_mb: Math.round(freed / 1048576), runs}));
