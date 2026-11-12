// UX probe: replays one path of the reviewer under other devices and perturbations and lists only what differs.
// The model walks the happy path and judges; this script does the fixed list of variations of the focused mode
// (P2.63), each from the seeded state (`env.mjs reset`), and repeats every anomaly in a fresh visit and in the
// other engine before reporting it, so the 2/2 rule costs no tokens.
//   UX_SLOT=N node scripts/ux/probe.mjs --run RUN (--steps A-B | --steps auto | --path FILE)
//     [--variants iphone-se,dark,android,landscape] [--checks double,reload,back,offline] [--no-audit] [--no-confirm]
// --steps takes trail steps of RUN (an `open` from the seeded state and the actions after it; looks, notes and steps
// that failed are skipped); --path takes one command per line, `ux.mjs batch` syntax, starting with `open`.
// Other variants: slow, reduced-motion, desktop, iphone. Writes RUN/probe/probe.md (anomalies only), probe.json,
// sheet-N.png (base and variants side by side, one row per step) and its own trail and shots.
// Runs after the navigation, before `env.mjs down`: it resets the personas' storage to the seed on every visit, so while
// it runs ux.mjs and env.mjs up/down refuse to act on the slot (lock in the slot's environment directory).
//   UX_SLOT=N node scripts/ux/probe.mjs --wait [--max SECONDS]
// waits up to 10 s for a probe just launched to start, then blocks until it ends (up to --max, default 540 s) and prints one line: where probe.md is and how many
// anomalies it lists, or that it is still running (call --wait again). One call instead of polling the log.
import assert from 'node:assert/strict';
import {spawn, execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, relative, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {parse, words, pathArgs, takeFlag, REF, envDir, probeLock, runningProbe, takeProbeLock} from './lib.mjs';
import {chromium} from './node_modules/@playwright/test/index.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = name => takeFlag(argv, name);
const SLOT = Number(process.env.UX_SLOT || 0);
const ENV_DIR = envDir(SLOT), lastFile = join(ENV_DIR, 'probe.last');
if (opt('wait')) {
  const max = Number(opt('max') || 540) * 1000, since = Date.now(), pause = () => new Promise(r => setTimeout(r, 1000));
  // A probe launched in the background a moment ago may not hold the lock yet: give it a few seconds to start, so
  // an absent lock is not read as "finished" (nor an earlier run's probe.json as this one's).
  while (!runningProbe(ENV_DIR) && Date.now() - since < 10000) await pause();
  while (runningProbe(ENV_DIR) && Date.now() - since < max) await pause();
  const last = existsSync(lastFile) ? JSON.parse(readFileSync(lastFile, 'utf8')) : null;
  const running = runningProbe(ENV_DIR);
  if (running) console.log(JSON.stringify({running: true, minutes: +((Date.now() - running.started) / 60000).toFixed(1), next: 'chame --wait de novo'}));
  else if (!last) console.log(JSON.stringify({done: false, error: 'nenhuma sondagem neste slot'}));
  else {
    const json = join(last.out, 'probe.json'), report = existsSync(json) && JSON.parse(readFileSync(json, 'utf8'));
    // A probe removes the previous probe.json when it starts, so one found here is from the last run.
    console.log(JSON.stringify(report
      ? {done: true, probe_md: join(last.out, 'probe.md'), anomalies: report.anomalies.length, axe: report.axe.length, minutes: report.minutes, sheets: report.sheets.length}
      : {done: false, error: 'a sondagem terminou sem probe.json: veja o log dela'}));
  }
  process.exit(0);
}
const runDir = resolve(opt('run') || '');
assert.ok(existsSync(runDir), 'Use --run DIR (diretório da rodada, .ux-runs/<data>-<slug>).');
const steps = opt('steps'), pathFile = opt('path');
// An empty value (--variants '') turns the list off.
const list = (value, fallback) => String(value === undefined || value === true ? fallback : value).split(',').filter(Boolean);
const VARIANT_LIST = list(opt('variants'), 'iphone-se,dark,android,landscape');
const CHECKS = new Set(list(opt('checks'), 'double,reload,back,offline'));
const AUDIT = !opt('no-audit'), CONFIRM = !opt('no-confirm');
const out = resolve(opt('out') || join(runDir, 'probe'));
mkdirSync(out, {recursive: true});
const PORT = 8795 + 10 * SLOT;
const started = Date.now();
const other = takeProbeLock(ENV_DIR, {pid: process.pid, out, started});
assert.ok(!other, `Já há uma sondagem neste slot (pid ${other?.pid}): espere com probe.mjs --wait.`);
process.on('exit', () => { try { if (JSON.parse(readFileSync(probeLock(ENV_DIR), 'utf8')).pid === process.pid) unlinkSync(probeLock(ENV_DIR)); } catch {} });
for (const file of ['probe.json', 'probe.md']) if (existsSync(join(out, file))) unlinkSync(join(out, file));
writeFileSync(lastFile, JSON.stringify({out, started}));
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => process.exit(130));
let actions = 0;

// ---- the path ---------------------------------------------------------------------------------------------
const REPLAYED = new Set(['tap', 'doubletap', 'tapxy', 'drag', 'fill', 'press', 'swipe', 'scroll', 'back', 'forward', 'reload', 'rotate', 'wait', 'offline']);
function fromTrail(range) {
  // auto: the reviewer's first visit (from the first open) up to its first perturbation (/ux-review runs the probe
  // after the reviewer, on the trail it left; its own reloads and double taps are what the probe repeats anyway).
  const auto = range === 'auto';
  const [a, b = a] = auto ? [1, Infinity] : range.split('-').map(Number);
  const entries = readFileSync(join(runDir, 'trail.jsonl'), 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line)).filter(e => e.step >= a && e.step <= b);
  const first = entries.find(e => String(e.action).startsWith('open '));
  assert.ok(first, `Os passos ${range} precisam começar com um open.`);
  const [persona, device = 'iphone', hash = ''] = first.args || first.action.split(' ').slice(1);
  const visit = {persona, device, hash: /^[#/]/.test(hash) ? hash : '', dark: !!first.opened?.dark, slow: !!first.opened?.slow, reducedMotion: !!first.opened?.reducedMotion};
  const ops = [], notes = [];
  // Only the tab the path opened in: other tabs are other visits.
  for (const e of entries.filter(e => e.step > first.step && (e.tab || 'main') === (first.tab || 'main'))) {
    const command = e.action;
    if (String(command).startsWith('open ') || command === 'close') { notes.push(`caminho termina no passo ${e.step} (${command.split(' ')[0]})`); break; }
    if (auto && ['reload', 'back', 'forward', 'offline', 'rotate'].includes(command)) { notes.push(`caminho termina no passo ${e.step} (${command}, variação do revisor)`); break; }
    if (!REPLAYED.has(command)) continue;
    if (e.error) { notes.push(`passo ${e.step} (${command}) falhou na rodada e ficou de fora`); continue; }
    let args = e.args || [];
    if (['tap', 'doubletap', 'fill', 'swipe'].includes(command) && REF.test(args[0] || '')) {
      // #784: an element without a stable name ends the auto path there (the steps before it still run); an
      // explicit range asks for --path instead of silently dropping a step the user chose.
      if (!e.replay && auto) { notes.push(`caminho termina no passo ${e.step} (${command}: alvo ${args[0]} sem nome estável)`); break; }
      assert.ok(e.replay, `Passo ${e.step}: alvo ${args[0]} sem nome estável (trail anterior ao P2.63 ou elemento sem nome); use --path.`);
      args = [e.replay, ...args.slice(1)];
    }
    // #784: the probe repeats every tap twice in its own 'double' pass; the reviewer's double tap is replayed as the
    // tap it is, so the path goes on instead of ending at the first one.
    if (auto && command === 'doubletap') { ops.push({command: 'tap', args, from: e.step}); continue; }
    ops.push({command, args, from: e.step});
  }
  return {visit, ops, notes};
}
function fromFile(file) {
  const lines = readFileSync(file, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const head = parse(words(lines[0]));
  assert.equal(head.command, 'open', 'A primeira linha do --path é open PERSONA DEVICE [/caminho].');
  const [persona, device = 'iphone', hash = ''] = head.args;
  const visit = {persona, device, hash, dark: head.options.dark, slow: head.options.slow, reducedMotion: head.options.reducedMotion};
  const notes = [];
  const ops = lines.slice(1).map((line, i) => {
    const p = parse(words(line));
    assert.ok(REPLAYED.has(p.command), `Linha ${i + 2}: ${p.command} não se reproduz.`);
    return {command: p.command, args: pathArgs(p.command, p.args, line, i + 2, notes), from: 'L' + (i + 2)};
  });
  return {visit, ops, notes};
}
assert.ok(steps || pathFile, 'Use --steps A-B (passos do trail) ou --path FILE.');
const path = steps ? fromTrail(steps) : fromFile(resolve(pathFile));
const label = op => `${op.command} ${op.args.join(' ')}`.trim();

// ---- the driver and the environment ------------------------------------------------------------------------
const driver = spawn(process.execPath, [join(here, 'ux.mjs'), 'serve', '--out', out], {env: {...process.env, UX_DRIVER_PORT: String(PORT)}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => driver.kill());
await new Promise((ok, fail) => { driver.stdout.once('data', ok); driver.once('exit', code => fail(new Error('driver saiu: ' + code))); });
// A visit that wrote nothing (only GETs) leaves the seed as it was, and the next one skips the reset.
let written = true;
async function send(command, args = [], options = {}) {
  actions++;
  const response = await fetch(`http://127.0.0.1:${PORT}/`, {method: 'POST', body: JSON.stringify({command, args, tab: 'probe', options})});
  const result = await response.json();
  if (result.requests?.write || command === 'offline') written = true;
  return result;
}
let resets = 0;
// Cookies and local storage (theme, drafts) change without a request: they go back to the seed on every visit.
const envState = JSON.parse(readFileSync(join(process.env.UX_ENV || join(tmpdir(), 'portfolio-ux' + (SLOT > 0 ? SLOT : '')), 'state.json'), 'utf8'));
function reset() {
  if (!written) { for (const persona of Object.values(envState.personas)) copyFileSync(persona.storage.replace(/\.json$/, '.seed.json'), persona.storage); return; }
  resets++;
  execFileSync(process.execPath, [join(here, 'env.mjs'), 'reset'], {env: process.env, stdio: ['ignore', 'pipe', 'inherit']});
  written = false;
}
const OTHER = {iphone: 'android', 'iphone-se': 'android', 'iphone-landscape': 'android', android: 'iphone', desktop: 'iphone'};
const VARIANTS = {
  'iphone-se': {device: 'iphone-se'}, iphone: {device: 'iphone'}, android: {device: 'android'}, desktop: {device: 'desktop'},
  dark: {dark: true}, slow: {slow: true}, 'reduced-motion': {reducedMotion: true}, landscape: {device: 'iphone-landscape'},
};
// Variants that change only colours or timing must show the same screen as the base.
const SAME_TREE = new Set(['dark', 'slow', 'reduced-motion']);
const spec = (extra = {}) => ({...path.visit, ...extra});
async function visit(s) {
  await send('close');
  reset();
  const r = await send('open', [s.persona, s.device, s.hash].filter(Boolean), {dark: s.dark, slow: s.slow, reducedMotion: s.reducedMotion, look: true});
  if (r.error) throw new Error('open: ' + r.error);
  return r;
}
// One step as a person would do it: a target below or above the fold is scrolled to first, as the reviewer did.
// A target under a fixed bar counts as off screen.
const unreachable = r => r.error && /fora da tela|coberto/.test(r.error);
async function perform(op, command = op.command) {
  const options = {look: true, refuseCovered: true};
  let r = await send(command, op.args, options);
  if (unreachable(r)) {
    for (const dir of ['down', 'down', 'down', 'up', 'up', 'up', 'up', 'up', 'up']) {
      await send('scroll', [dir]);
      const again = await send(command, op.args, options);
      if (!unreachable(again)) { r = {...again, scrolled: true}; break; }
    }
  }
  return r;
}
async function prefix(s, k) {
  const runs = [await visit(s)];
  for (let i = 0; i < k; i++) runs.push(await perform(path.ops[i]));
  return runs;
}

// ---- comparing screens -------------------------------------------------------------------------------------
// The screen is its address and its tree without refs, focus marks and clock values (dates, times, ids).
const clock = text => text.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>').replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, '<data>')
  .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, '<hora>').replace(/\bhá \d+ \w+/g, 'há <n>');
const lines = r => (r?.tree || '').split('\n').map(l => clock(l.replace(/ \[ref=(?:f\d+)?e\d+\]/g, '').replace(/ \[active\]/g, '').replace(/ \[cursor=\w+\]/g, ''))).filter(l => l.trim());
const screen = r => clock(r?.url || '') + '\n' + lines(r).join('\n');
function delta(expected, observed, limit = 5) {
  const a = lines(expected), b = lines(observed), sa = new Set(a), sb = new Set(b);
  const strip = l => l.trim().replace(/^- /, '');
  return {missing: a.filter(l => !sb.has(l)).slice(0, limit).map(strip), extra: b.filter(l => !sa.has(l)).slice(0, limit).map(strip)};
}
const eventKeys = r => new Set((r?.events || []).filter(e => ['pageerror', 'http'].includes(e.type)).map(e => e.type + ' ' + (e.status || '') + ' ' + (e.path || e.text || '')));
const anomalies = [], infos = [...path.notes];
const add = a => { anomalies.push(a); return a; };
const where = k => ({k, from: path.ops[k]?.from ?? 'open', op: path.ops[k] ? label(path.ops[k]) : 'open'});

// ---- base --------------------------------------------------------------------------------------------------
async function walk(s, {audit = false} = {}) {
  const runs = [await visit(s)];
  const audits = [audit ? (await send('audit')).audit : null];
  for (const op of path.ops) {
    const r = await perform(op);
    runs.push(r);
    audits.push(audit && !r.error ? (await send('audit')).audit : null);
    if (r.error) break;
  }
  return {runs, audits};
}
console.error(`probe: ${path.ops.length} passos, ${path.visit.persona} · ${path.visit.device}`);
const A = await walk(spec(), {audit: AUDIT});
const B = await walk(spec());
// runs[0] is the open; runs[k + 1] is the screen after path.ops[k].
const stable = path.ops.map((_, k) => !!A.runs[k + 1] && !!B.runs[k + 1] && !A.runs[k + 1].error && !B.runs[k + 1].error && screen(A.runs[k + 1]) === screen(B.runs[k + 1]));
const broken = A.runs.findIndex((r, i) => i > 0 && r.error);
if (broken > 0) {
  infos.push(`o caminho não se reproduz a partir do estado semeado: passo ${path.ops[broken - 1].from} (${label(path.ops[broken - 1])}) — ${A.runs[broken].error}; checagens só até antes dele`);
  path.ops.length = broken - 1;
  A.runs.length = A.audits.length = broken; // the failed step's row leaves the sheets with its action
}
const unstable = path.ops.map((op, k) => stable[k] ? null : op.from).filter(Boolean);
if (unstable.length) infos.push(`telas que mudam entre duas visitas iguais (comparação pulada): passos ${unstable.join(', ')}`);
const afterBase = k => A.runs[k + 1];
// Step -1 is the screen the path opens on.
const stableAt = k => k < 0 ? screen(A.runs[0]) === screen(B.runs[0]) : stable[k];

// Accessibility on the base path: axe colour contrast and target size, each element once.
const axeSeen = new Map();
A.audits.forEach((list, i) => (list || []).forEach(v => { const key = v.rule + ' ' + v.target; if (!axeSeen.has(key)) axeSeen.set(key, {...v, ...where(i - 1)}); }));

// ---- checks ------------------------------------------------------------------------------------------------
// Each check returns null when the step behaves as in the base, or what differed.
function compareLayout(name, k, r, base) {
  if (r.error) return {what: 'o passo falha', observed: r.error};
  const found = [];
  if (clock(r.url) !== clock(base.url)) found.push(`vai para ${r.url} (base: ${base.url})`);
  if (r.no_visible_change && !base.no_visible_change) found.push('toque sem mudança visível');
  if (r.sensors?.overflow_x && !base.sensors?.overflow_x) found.push('rolagem horizontal');
  const clippedBase = new Set(base.sensors?.clipped || []), clipped = (r.sensors?.clipped || []).filter(t => !clippedBase.has(t));
  if (clipped.length) found.push('texto cortado: ' + clipped.map(t => `"${t}"`).join(', '));
  const newErrors = [...eventKeys(r)].filter(e => !eventKeys(base).has(e));
  if (newErrors.length) found.push('erro: ' + newErrors.join('; '));
  if (r.landed_on && !base.landed_on) found.push(`o toque cai em ${r.landed_on}`);
  if (r.partly_covered && !base.partly_covered) found.push('alvo meio coberto (o toque foi na parte visível)');
  // The theme button says which theme is on: pressed in dark, as designed.
  const themeless = x => ({...x, tree: (x.tree || '').replace(/(Alternar tema[^\n]*?) \[pressed\]/g, '$1')});
  if (SAME_TREE.has(name) && stableAt(k) && screen(themeless(r)) !== screen(themeless(base))) { const d = delta(themeless(base), themeless(r)); found.push(`tela diferente (falta: ${d.missing.join(' | ') || '—'}; sobra: ${d.extra.join(' | ') || '—'})`); }
  return found.length ? {what: found.join('; ')} : null;
}
const isTap = op => ['tap', 'doubletap'].includes(op.command);
const CHECK = {
  // A second quick tap must not do a second thing.
  async double(k, runs, base) {
    const r = await perform(path.ops[k], 'doubletap');
    runs.push(r);
    if (r.error) return {what: 'o toque duplo falha', observed: r.error, shot: r.shot};
    if (screen(r) === screen(base)) return null;
    const d = delta(base, r);
    return {what: `toque duplo não termina na tela do toque simples${clock(r.url) !== clock(base.url) ? ` (vai para ${r.url}, base ${base.url})` : ''}`, missing: d.missing, extra: d.extra, shot: r.shot, expectedShot: base.shot};
  },
  // Reloading shows the same screen.
  async reload(k, runs) {
    const r = await perform(path.ops[k]);
    runs.push(r);
    if (r.error) return null;
    const rr = await send('reload', [], {look: true});
    if (screen(rr) === screen(r)) return null;
    const d = delta(r, rr);
    return {what: `recarregar muda a tela${clock(rr.url) !== clock(r.url) ? ` (${r.url} → ${rr.url})` : ''}`, missing: d.missing, extra: d.extra, shot: rr.shot, expectedShot: r.shot, dirty: true};
  },
  // After a step that changed the address, the browser's back returns to the address before it.
  async back(k, runs) {
    const before = runs[runs.length - 1];
    const r = await perform(path.ops[k]);
    runs.push(r);
    if (r.error || clock(r.url) === clock(before.url)) return null;
    const b = await send('back', [], {look: true});
    const errors = [...eventKeys(b)];
    if (clock(b.url) === clock(before.url) && !errors.length) { const f = await send('forward', [], {look: true}); return screen(f) === screen(r) ? null : {silentDirty: true}; }
    return {what: `voltar vai para ${b.url}, não para o endereço antes do passo (${before.url}); julgar se a sequência devia ser deixada${errors.length ? '; erro: ' + errors.join('; ') : ''}`, shot: b.shot, expectedShot: before.shot, dirty: true};
  },
  // Without network, the action says so in place and keeps the person where they were; "Tentar de novo" then works.
  async offline(k, runs, base) {
    const before = runs[runs.length - 1];
    await send('offline', ['on']);
    const r = await perform(path.ops[k]);
    await send('offline', ['off']);
    const found = [];
    const d = delta(before, r, Infinity);
    const told = d.extra.some(l => /^(alert|status)\b/.test(l) || /conex|internet|offline|tentar de novo|não foi possível|falh|erro/i.test(l));
    if (!told) found.push(r.no_visible_change ? 'toque sem rede não muda nada nem avisa' : 'toque sem rede não avisa da falha');
    if (clock(r.url) !== clock(before.url) && clock(r.url) !== clock(base.url)) found.push(`sem rede vai para ${r.url}`);
    if ([...eventKeys(r)].some(e => e.startsWith('pageerror'))) found.push('erro de JS');
    let retried = null;
    if (/tentar de novo/i.test(r.tree || '')) {
      retried = await send('tap', ['role:button:Tentar de novo'], {look: true});
      if (retried.error) found.push(`"Tentar de novo" não responde: ${retried.error.slice(0, 120)}`);
      else if (screen(retried) !== screen(base)) { const dd = delta(base, retried); found.push(`"Tentar de novo" não chega à tela do passo (falta: ${dd.missing.join(' | ') || '—'})`); }
    }
    return found.length ? {what: found.join('; '), extra: d.extra.slice(0, 5), shot: (retried || r).shot, expectedShot: base.shot, dirty: true} : {dirty: true};
  },
};
const applies = {
  double: k => isTap(path.ops[k]) && stable[k],
  reload: k => stable[k],
  back: k => stable[k] && clock(afterBase(k).url) !== clock(A.runs[k].url),
  offline: k => stable[k] && afterBase(k).requests?.fetch > 0 && ['tap', 'doubletap', 'press', 'tapxy'].includes(path.ops[k].command),
};
const counts = {};

// A pass walks the path once, checking every step it applies to, and goes back to the seed only after a step that
// left the visit in another state; offline always does, since the action did not happen. Returns step → finding.
async function pass(name, s = spec(), base = A.runs) {
  const found = new Map();
  let runs = await prefix(s, 0), checked = 0;
  for (let k = 0; k < path.ops.length; k++) {
    if (!applies[name](k) || !base[k + 1] || base[k + 1].error) { runs.push(await perform(path.ops[k])); continue; }
    checked++;
    const result = await CHECK[name](k, runs, base[k + 1]);
    if (result?.what) found.set(k, result);
    if (result?.dirty || result?.silentDirty || (result?.what && name === 'double')) runs = await prefix(s, k + 1);
  }
  return {found, checked};
}
async function variant(name, {audit = AUDIT, record = true} = {}) {
  if (!VARIANTS[name]) throw new Error('Variante desconhecida: ' + name + '. Use: ' + Object.keys(VARIANTS).join(', '));
  const s = spec(VARIANTS[name]);
  const {runs, audits} = await walk(s, {audit});
  const found = new Map();
  let checked = 0;
  for (let k = -1; k < path.ops.length && runs[k + 1]; k++) {
    if (k >= 0) checked++;
    const r = runs[k + 1];
    if (record && k >= 0 && r.scrolled && !afterBase(k).scrolled) infos.push(`${name}: passo ${path.ops[k].from} precisou rolar até o alvo`);
    const result = compareLayout(name, k, r, afterBase(k));
    if (result) found.set(k, {...result, shot: r.shot, expectedShot: afterBase(k).shot});
  }
  if (record) audits.forEach((list, i) => (list || []).forEach(v => { const key = v.rule + ' ' + v.target; if (!axeSeen.has(key)) axeSeen.set(key, {...v, ...where(i - 1), variant: name}); }));
  return {runs, found, checked};
}

const variantRuns = {};
for (const name of VARIANT_LIST) {
  console.error(`probe: variante ${name}`);
  const {runs, found, checked} = await variant(name);
  variantRuns[name] = runs; counts[name] = {checked, found: found.size};
  for (const [k, result] of found) add({check: 'variante', variant: name, device: spec(VARIANTS[name]).device, ...where(k), ...result});
}
const ENGINE = {iphone: 'WebKit', 'iphone-se': 'WebKit', 'iphone-landscape': 'WebKit', android: 'Chromium', desktop: 'Chromium'};
for (const name of ['double', 'reload', 'back', 'offline']) {
  if (!CHECKS.has(name)) continue;
  console.error(`probe: ${name}`);
  const {found, checked} = await pass(name);
  counts[name] = {checked, found: found.size};
  for (const [k, result] of found) add({check: name, device: path.visit.device, ...where(k), ...result});
}

// ---- confirmation: each pass or variant with findings runs once more, and checks run in the other engine ------
let otherBase = null;
// The same finding: same step and same description once clock values and ids are set aside.
const same = (a, found) => !!found.get(a.k) && clock(found.get(a.k).what) === clock(a.what);
if (CONFIRM) {
  for (const name of new Set(anomalies.map(a => a.variant || a.check))) {
    console.error(`probe: confirmando ${name}`);
    const mine = anomalies.filter(a => (a.variant || a.check) === name);
    if (VARIANTS[name]) { const {found} = await variant(name, {audit: false, record: false}); for (const a of mine) a.again = same(a, found); continue; }
    const {found} = await pass(name);
    for (const a of mine) a.again = same(a, found);
    const other = OTHER[path.visit.device];
    if (!other) continue;
    otherBase ||= (await walk(spec({device: other}))).runs;
    const {found: there} = await pass(name, spec({device: other}), otherBase);
    for (const a of mine) a.engine = !otherBase[a.k + 1] || otherBase[a.k + 1].error ? 'sem base no outro motor' : same(a, there) ? 'nos dois motores' : there.has(a.k) ? 'outra diferença no outro motor' : `só ${ENGINE[path.visit.device]}`;
  }
}

// ---- contact sheets ----------------------------------------------------------------------------------------
await send('stop').catch(() => {});
const columns = [['base', A.runs], ...Object.entries(variantRuns)];
const rel = file => file ? relative(out, file) : '';
const sheets = [];
const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const page = await browser.newPage({viewport: {width: 180 * columns.length + 120, height: 400}});
  const rows = A.runs.map((_, i) => i);
  for (let start = 0; start < rows.length; start += 4) {
    const html = `<!doctype html><meta charset=utf-8><style>body{font:12px system-ui;margin:8px;background:#fff}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px;vertical-align:top}
      img{width:170px;display:block}.bad{outline:3px solid #d00}</style><table><tr><th>passo</th>${columns.map(([n]) => `<th>${n}</th>`).join('')}</tr>` +
      rows.slice(start, start + 4).map(i => `<tr><th>${i === 0 ? 'open' : path.ops[i - 1].from + '<br>' + label(path.ops[i - 1]).slice(0, 40).replace(/</g, '&lt;')}</th>` +
        columns.map(([n, runs]) => { const r = runs[i]; const bad = anomalies.some(a => a.k === i - 1 && (a.variant === n || (n === 'base' && a.check !== 'variante')));
          return `<td>${r?.shot ? `<img class="${bad ? 'bad' : ''}" src="${pathToFileURL(r.shot)}">` : 'parou'}</td>`; }).join('') + '</tr>').join('') + '</table>';
    const file = join(out, `sheet-${sheets.length + 1}.html`);
    writeFileSync(file, html);
    await page.goto(pathToFileURL(file).href);
    await page.waitForLoadState('load');
    const png = join(out, `sheet-${sheets.length + 1}.png`);
    await page.screenshot({path: png, fullPage: true});
    sheets.push(png);
  }
} finally { await browser.close(); }

// ---- report ------------------------------------------------------------------------------------------------
const minutes = ((Date.now() - started) / 60000).toFixed(1);
const shown = file => file.startsWith(process.cwd() + '/') ? relative(process.cwd(), file) : file;
const confirmText = a => !CONFIRM ? 'não confirmado' : [a.again ? '2/2' : '1/2 (instável)', a.engine].filter(Boolean).join(', ');
const md = [`# Sondagem — ${path.visit.persona} · ${path.visit.device}${path.visit.dark ? ' · escuro' : ''}`,
  `Rodada: ${shown(runDir)} · caminho: ${steps ? 'passos ' + steps : shown(resolve(pathFile))} (${path.ops.length} ações) · ${minutes} min, ${actions} comandos, ${resets} resets`,
  `Variantes: ${VARIANT_LIST.join(', ') || '—'} · checagens: ${[...CHECKS].join(', ') || '—'} · axe: ${AUDIT ? 'sim' : 'não'}`, '',
  `## Anomalias (${anomalies.length})`, '',
  anomalies.length ? '| # | Checagem | Passo (trail) | Ação | O que difere | Confirmação | Captura (esperado → observado) |\n| --- | --- | --- | --- | --- | --- | --- |\n' +
    anomalies.map((a, i) => `| ${i + 1} | ${a.check === 'variante' ? a.variant : a.check} | ${a.from} | \`${a.op.replace(/\|/g, '\\|')}\` | ${String(a.what).replace(/\|/g, '\\|')}${a.observed ? ' — ' + a.observed.replace(/\|/g, '\\|').slice(0, 160) : ''} | ${confirmText(a)} | ${rel(a.expectedShot)} → ${rel(a.shot)} |`).join('\n') : 'Nenhuma.',
  ...anomalies.filter(a => a.missing?.length || a.extra?.length).map(a => `\n- **${anomalies.indexOf(a) + 1}** falta: ${(a.missing || []).join(' · ') || '—'}\n  sobra: ${(a.extra || []).join(' · ') || '—'}`),
  '', `## Acessibilidade (axe, ${axeSeen.size})`, '',
  axeSeen.size ? [...axeSeen.values()].map(v => `- ${v.rule} · passo ${v.from ?? 'open'}${v.variant ? ' · ' + v.variant : ''} · \`${v.target}\` — ${v.text}`).join('\n') : 'Nenhuma violação de contraste ou tamanho de alvo.',
  '', '## Cobertura', '', Object.entries(counts).map(([n, c]) => `- ${n}: ${c.checked} passos, ${c.found} anomalia(s)`).join('\n'),
  '', '## Notas e limites', '', ...infos.map(i => `- ${i}`),
  '- Compara endereço e árvore de acessibilidade (sem refs, foco, datas e horas); diferença só de pixels (contraste, sobreposição, espelhamento) fica para as folhas de contato e o axe.',
  '- Recarregar, voltar e toque duplo que mudam a tela de propósito (ex.: alternar uma escolha) também aparecem: julgar como a persona.',
  '- Limites do driver valem aqui: rolagem e gesto aproximados, sem teclado e barra reais do Safari, diálogos aceitos.',
  '', '## Folhas de contato', '', ...sheets.map(s => `- ${rel(s)}`), ''].join('\n');
writeFileSync(join(out, 'probe.md'), md);
writeFileSync(join(out, 'probe.json'), JSON.stringify({path, stable, anomalies, axe: [...axeSeen.values()], counts, infos, sheets, minutes: Number(minutes), actions}, null, 1));
console.log(md);
