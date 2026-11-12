// UX reviewer environment (local only): builds the site from the tested tree and serves it with static.mjs
// (GitHub Pages semantics) on its own port, then writes one storage-state per persona (personas.mjs). Never production.
//   node scripts/ux/env.mjs up    [--code DIR] [--port 8781]
//   node scripts/ux/env.mjs down
//   node scripts/ux/env.mjs reset   restores the personas' storage to the seed (probe.mjs calls it on every visit)
// --code builds another checkout (e.g. a worktree at an older commit, to calibrate against a known regression).
// UX_SLOT=N (or --slot N) runs an independent copy: port 8781+10N, <tmpdir>/portfolio-uxN, build in DIR/dist.
// Writes DIR/state.json (origin, personas → storage-state files). DIR = $UX_ENV or <tmpdir>/portfolio-ux.
import assert from 'node:assert/strict';
import {spawn, execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync, openSync, copyFileSync, unlinkSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {PERSONAS} from './personas.mjs';
import {runningProbe} from './lib.mjs';

const repo = resolve(new URL('../..', import.meta.url).pathname);
const args = process.argv.slice(2), command = args[0];
const option = (name, fallback) => { const i = args.indexOf('--' + name); return i > 0 ? args[i + 1] : fallback; };
const slot = Number(option('slot', process.env.UX_SLOT || 0)), tag = slot > 0 ? String(slot) : '';
const run = resolve(option('env', process.env.UX_ENV || join(tmpdir(), 'portfolio-ux' + tag)));
assert.ok(!run.startsWith(repo + '/'), 'The environment lives outside the repository.');
const saved = existsSync(join(run, 'state.json')) ? JSON.parse(readFileSync(join(run, 'state.json'), 'utf8')) : null;
const code = resolve(option('code', command === 'reset' && saved?.code || repo));
const port = Number(option('port', 8781 + 10 * slot));
mkdirSync(run, {recursive: true});

const pause = ms => new Promise(r => setTimeout(r, ms));
async function healthy(url, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const ok = await fetch(url, {signal: AbortSignal.timeout(3000)}).then(r => r.ok).catch(() => false);
    if (ok) return true;
    await pause(400);
  }
  return false;
}
function stop() {
  const file = join(run, 'server.pid');
  if (!existsSync(file)) return {server: false};
  const pid = Number(readFileSync(file, 'utf8'));
  try { process.kill(-pid, 'SIGTERM'); } catch { try { process.kill(pid, 'SIGTERM'); } catch {} }
  unlinkSync(file);
  return {server: true};
}

if (command === 'up') {
  if (runningProbe(run)) { console.error('A probe is running on this slot: wait with probe.mjs --wait.'); process.exit(3); }
  stop();
  const astro = join(code, 'node_modules/.bin/astro');
  assert.ok(existsSync(astro), `No Astro in ${code}: run npm install there first.`);
  // 1. Static build of the tested tree, into the slot's own directory (never the repo's dist/).
  const dist = join(run, 'dist');
  execFileSync(astro, ['build', '--outDir', dist], {cwd: code, stdio: ['ignore', 'ignore', 'inherit']});
  // 2. Server (detached, own process group so `down` stops it).
  const log = openSync(join(run, 'server.log'), 'w');
  // A tiny static server instead of `astro preview`, which allows only one instance per project.
  const server = spawn(process.execPath, [join(repo, 'scripts/ux/static.mjs'), dist, String(port)],
    {cwd: code, detached: true, stdio: ['ignore', log, log]});
  server.unref();
  writeFileSync(join(run, 'server.pid'), String(server.pid));
  const origin = `http://127.0.0.1:${port}`;
  if (!await healthy(origin + '/', 60000)) { console.error('Server did not answer; see ' + join(run, 'server.log')); stop(); process.exit(1); }
  // 3. Personas: Playwright storage-state, plus a seed copy for reset.
  mkdirSync(join(run, 'personas'), {recursive: true});
  const personas = {};
  for (const [name, persona] of Object.entries(PERSONAS)) {
    const storage = join(run, 'personas', name + '.json');
    const state = {cookies: [], origins: Object.keys(persona.localStorage).length
      ? [{origin, localStorage: Object.entries(persona.localStorage).map(([key, value]) => ({name: key, value}))}] : []};
    writeFileSync(storage, JSON.stringify(state));
    copyFileSync(storage, storage.replace(/\.json$/, '.seed.json'));
    personas[name] = {storage, start: persona.start, device: persona.device, brief: persona.brief};
  }
  writeFileSync(join(run, 'state.json'), JSON.stringify({origin, code, slot, personas}, null, 1));
  console.log(JSON.stringify({up: true, origin, code, personas: Object.keys(personas), env: run}));
} else if (command === 'reset') {
  assert.ok(saved, 'Run env.mjs up first.');
  for (const persona of Object.values(saved.personas)) copyFileSync(persona.storage.replace(/\.json$/, '.seed.json'), persona.storage);
  console.log(JSON.stringify({reset: true}));
} else if (command === 'down') {
  if (runningProbe(run)) { console.error('A probe is running on this slot: wait with probe.mjs --wait.'); process.exit(3); }
  const stopped = stop();
  for (let i = 0; i < 20; i++) {
    try { execFileSync('lsof', ['-iTCP:' + port, '-sTCP:LISTEN'], {stdio: 'ignore'}); } catch { break; }
    await pause(250);
  }
  console.log(JSON.stringify({down: true, ...stopped}));
} else {
  console.error('Use: env.mjs up|down|reset');
  process.exit(2);
}
