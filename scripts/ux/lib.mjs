// Command-line words and options shared by ux.mjs (one command per call or `batch`) and probe.mjs (path files).
import {readFileSync, writeFileSync, unlinkSync, renameSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

// Snapshot refs: e12, or f1e12 once the page has navigated.
export const REF = /^(?:f\d+)?e\d+$/;
export const takeFlag = (list, name, valued = true) => { const i = list.indexOf('--' + name); if (i < 0) return undefined; const v = list[i + 1];
  const has = valued && v !== undefined && !v.startsWith('--'); list.splice(i, has ? 2 : 1); return has ? v : true; };
const BOOLEAN = ['look', 'dark', 'slow', 'reduced-motion', 'no-tree', 'diff', 'keep-going'];
// Splits off the options of one command line; boolean flags never swallow the next word.
export function parse(list) {
  const tab = takeFlag(list, 'tab'), note = takeFlag(list, 'note');
  const bool = Object.fromEntries(BOOLEAN.map(name => [name, !!takeFlag(list, name, false)]));
  const options = {look: bool.look, dark: bool.dark, slow: bool.slow, reducedMotion: bool['reduced-motion'], noTree: bool['no-tree'], diff: bool.diff,
    ...(typeof note === 'string' ? {note} : {})};
  return {command: list[0], args: list.slice(1), tab, options, keepGoing: bool['keep-going']};
}
// Shell-like words: quotes may open anywhere in a word (role:button:"Pular tutorial") and are removed.
export function words(line) {
  const out = []; let word = null, quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) { if (c === quote) quote = null; else if (c === '\\' && quote === '"' && i + 1 < line.length) word += line[++i]; else word += c; continue; }
    if (c === '"' || c === "'") { quote = c; word ??= ''; continue; }
    if (/\s/.test(c)) { if (word !== null) out.push(word); word = null; continue; }
    word = (word ?? '') + c;
  }
  if (word !== null) out.push(word);
  return out;
}

// #784: in a probe --path line, an unquoted target with spaces (tap role:button:Buscar endereço…) arrives split into
// words. tap and doubletap take only a target and swipe ends in a direction, so the words go back together; fill is
// ambiguous (target or text?), so it gets a note pointing at the quotes.
const TARGET = /^(?:role|text|css):/;
const DIRECTION = /^(?:left|right|up|down)$/;
export function pathArgs(command, args, line = '', n = 0, notes = []) {
  if (!TARGET.test(args[0] || '') || args.length < 2) return args;
  if (command === 'tap' || command === 'doubletap') return [args.join(' ')];
  if (command === 'swipe' && DIRECTION.test(args.at(-1)) && args.length > 2) return [args.slice(0, -1).join(' '), args.at(-1)];
  if (command === 'fill' && /^fill\s+(?:role|text|css):[^\s"']*\s/.test(line))
    notes.push(`linha ${n}: alvo do fill sem aspas (${args[0]}); se o nome tem espaços, use aspas: fill "role:textbox:Nome com espaço" TEXTO`);
  return args;
}

// probe.mjs resets the slot's database on every visit: while it runs, the reviewer's own actions on that slot would be
// lost, so ux.mjs and env.mjs up/down refuse them. The lock lives in the slot's environment directory.
export const envDir = slot => process.env.UX_ENV || join(tmpdir(), 'portfolio-ux' + (slot > 0 ? slot : ''));
export const probeLock = dir => join(dir, 'probe.lock');
export function runningProbe(dir, file = probeLock(dir)) {
  let lock;
  try { lock = JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
  // EPERM: the process exists but this one may not signal it (Codex's sandbox), so it is alive — unless the lock is
  // older than any probe runs, when the pid has likely been reused by another user's process.
  try { process.kill(lock.pid, 0); return lock; } catch (e) { return e.code === 'EPERM' && Date.now() - (lock.started || 0) < 45 * 60000 ? lock : null; }
}
// Atomic: the lock file is created only if absent. A lock left by a dead probe is moved aside (rename is atomic, so
// only one process gets it) and, if what was moved turns out to be a live probe's lock, put back. Returns the
// holder's lock when another probe runs, null when this process now holds it.
export function takeProbeLock(dir, info) {
  const file = probeLock(dir), aside = file + '.' + process.pid;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { writeFileSync(file, JSON.stringify(info), {flag: 'wx'}); return null; } catch (e) { if (e.code !== 'EEXIST') throw e; }
    const holder = runningProbe(dir);
    if (holder) return holder;
    // A lock this new may still be half written by a probe starting right now: not stale.
    try { if (Date.now() - statSync(file).mtimeMs < 2000) return {pid: '?'}; } catch { continue; }
    try { renameSync(file, aside); } catch { continue; }
    if (runningProbe(dir, aside)) { try { renameSync(aside, file); } catch {} return runningProbe(dir) || {pid: '?'}; }
    try { unlinkSync(aside); } catch {}
  }
  return runningProbe(dir) || {pid: '?'};
}
