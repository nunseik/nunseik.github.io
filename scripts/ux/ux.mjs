// UX reviewer's hands and eyes: one long-lived process holds the browsers, and each Bash call sends it
// one command, as a person would do one thing at a time. Every action is logged with a screenshot.
//   node scripts/ux/ux.mjs serve --out DIR [--env DIR]      (run in the background; `env.mjs up` first)
//   node scripts/ux/ux.mjs <command> [args] [--tab NAME]     (default tab: main)
// Commands:
//   open PERSONA DEVICE [/caminho] [--dark] [--slow] [--reduced-motion]   devices: iphone iphone-se iphone-landscape android desktop
//   look [--no-tree] [--diff]  screen: url, title, accessibility tree with refs, screenshot path, events, sensors
//   tap TARGET | doubletap TARGET | tapxy X Y   TARGET = e12 (ref from the last look) | text:Rótulo | role:button:Nome | css:#id
//                             tapxy usa pixels CSS: pixel da captura ÷ shot_scale (o mapa é canvas: pins e hexágonos só se tocam assim)
//   drag X1 Y1 X2 Y2          arrasta (o mapa), em pixels CSS
//   fill TARGET TEXT | press KEY | swipe TARGET left|right|up|down | scroll up|down
//   back | forward | reload | rotate | offline on|off | wait MS | dialogs accept|dismiss
//   close                     ends the visit and keeps the persona's cookies (reopen = coming back later)
//   inspect TARGET            box, visibility, what receives a tap at its centre (diagnosis only)
//   audit                     axe colour contrast and target size on the current screen
//   note TEXT                 records an observation in the trail
//   batch FILE|-              runs one command per line (same syntax, # comments) and prints one short line per step;
//                             stops at the first error or tap without visible change (--keep-going: does not stop)
//   stop                      closes the browsers
// Any action takes --look to return the new tree too (saves a call), --diff to return only the tree lines
// that changed since the last tree of the tab, and --note "quero …" to record the intent in the same step.
// tap/fill refuse targets outside the viewport and report `landed_on` when something else covers the target,
// as a finger would. Output is JSON. `changed` says whether the tree, the pixels or the address changed.
// Each action records `replay` (a role:name target that survives renumbered refs), `sensors` and `requests`,
// which scripts/ux/probe.mjs uses to replay a path under other devices and perturbations.
import {createServer} from 'node:http';
import {mkdirSync, appendFileSync, readFileSync, writeFileSync, existsSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {takeFlag, parse, words, REF, runningProbe, envDir} from './lib.mjs';
import {fileURLToPath} from 'node:url';
import {webkit, chromium, devices} from './node_modules/@playwright/test/index.mjs';

// UX_SLOT=N pairs this driver with `UX_SLOT=N env.mjs up` (port 8790+10N, <tmpdir>/portfolio-uxN).
const SLOT = Number(process.env.UX_SLOT || 0), TAG = SLOT > 0 ? String(SLOT) : '';
const PORT = Number(process.env.UX_DRIVER_PORT || 8790 + 10 * SLOT);
const argv = process.argv.slice(2);
const flag = name => takeFlag(argv, name);

const AXE = readFileSync(fileURLToPath(new URL('./node_modules/axe-core/axe.min.js', import.meta.url)), 'utf8') + ';0';

const DEVICES = {
  iphone: {engine: 'webkit', options: devices['iPhone 13']},
  'iphone-se': {engine: 'webkit', options: devices['iPhone SE']},           // 320 px wide
  // Opened lying down: `rotate` only swaps the window size, and mobile WebKit then keeps a scale that puts the
  // boxes it reports away from what it paints.
  'iphone-landscape': {engine: 'webkit', options: devices['iPhone 13 landscape']},
  android: {engine: 'chromium', options: devices['Pixel 7']},
  desktop: {engine: 'chromium', options: {viewport: {width: 1440, height: 900}}},
};

if (argv[0] === 'serve') await serve();
else await client();


async function send(command, args, tab, options) {
  const response = await fetch(`http://127.0.0.1:${PORT}/`, {method: 'POST', body: JSON.stringify({command, args, tab, options})}).catch(() => null);
  if (!response) { console.error('Driver parado: rode `node scripts/ux/ux.mjs serve --out DIR` em segundo plano.'); process.exit(2); }
  return response.json();
}
async function client() {
  const {command, args, tab = 'main', options, keepGoing} = parse(argv);
  if (!command) { console.error('Use: ux.mjs <command> …'); process.exit(2); }
  // The probe resets this slot's database on every visit: an action now would run on a state about to vanish.
  // (The probe's own driver takes requests directly, not through this client.)
  if (!['stop', 'note'].includes(command) && runningProbe(envDir(SLOT))) {
    console.log(JSON.stringify({error: 'Sondagem em andamento neste slot: ela reseta o banco a cada visita. Espere numa chamada só: UX_SLOT=' + SLOT + ' node scripts/ux/probe.mjs --wait'}));
    process.exit(3);
  }
  if (command === 'batch') return batch(args[0], tab, options, keepGoing);
  const result = await send(command, args, tab, options);
  const {tree, ...head} = result;
  console.log(JSON.stringify(head, null, 1));
  if (tree) console.log('--- tree ---\n' + tree);
  if (result.error) process.exitCode = 1;
}
// One short line per step, so a known stretch of the path costs one call. The tree comes only after the last step.
async function batch(file, tab, options, keepGoing) {
  if (!file) { console.error('Use: ux.mjs batch FILE|-'); process.exit(2); }
  const text = file === '-' ? readFileSync(0, 'utf8') : readFileSync(file, 'utf8');
  const lines = text.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  let last, failed = false;
  for (const [index, line] of lines.entries()) {
    const step = parse(words(line));
    const final = index === lines.length - 1;
    const stepOptions = {...step.options, ...(final ? {look: step.options.look || options.look, diff: step.options.diff || options.diff} : {})};
    const result = last = await send(step.command, step.args, step.tab || tab, stepOptions);
    const flags = result.changed ? Object.entries(result.changed).filter(([, v]) => v).map(([k]) => k).join(',') : '';
    const events = (result.events || []).filter(e => e.type !== 'already_reported');
    const sensors = result.sensors || {};
    // Only a tap is expected to change the screen; wait, offline or a key may rightly leave it as it was.
    const stuck = ['tap', 'doubletap', 'tapxy'].includes(step.command) && result.no_visible_change;
    const alerts = [stuck && 'SEM MUDANÇA VISÍVEL', result.landed_on && 'caiu em ' + result.landed_on, sensors.overflow_x && 'rolagem horizontal',
      sensors.clipped_count && sensors.clipped_count + ' cortado(s)', events.length && Object.entries(events.reduce((a, e) => { const k = e.type + (e.status ? ' ' + e.status : ''); a[k] = (a[k] || 0) + (e.count || 1); return a; }, {})).map(([k, n]) => n > 1 ? k + '×' + n : k).join(' ')].filter(Boolean);
    const target = result.target ? ' ' + result.target : '';
    const where = result.url ? ' → ' + result.url : '';
    const shot = result.shot && (result.changed?.url || alerts.length || final || result.error) ? ' ' + result.shot : '';
    console.log(`${result.step ?? '-'} ${line.split(/\s+--/)[0]}${target}${where}${flags ? ' [' + flags + ']' : ''}${alerts.length ? ' ⚠ ' + alerts.join('; ') : ''}${result.error ? ' ✗ ' + result.error : ''}${shot}`);
    if (result.error || stuck) failed = true;
    if (!keepGoing && (result.error || stuck)) { if (!final) console.log(`parou no passo ${index + 1} de ${lines.length}`); break; }
  }
  if (last?.tree) console.log('--- tree ---\n' + last.tree);
  if (failed) process.exitCode = 1;
}

// Repeated events (the same console error 30 times) collapse into one line with a count.
// Events already reported in this tab come back only as a count, so known noise does not fill every answer.
function grouped(events, known = new Set()) {
  const seen = new Map();
  let repeated = 0;
  for (const event of events) {
    const key = JSON.stringify(event), item = seen.get(key);
    if (known.has(key)) { repeated++; continue; }
    if (item) item.count = (item.count || 1) + 1; else seen.set(key, {...event});
  }
  for (const key of seen.keys()) known.add(key);
  return repeated ? [...seen.values(), {type: 'already_reported', count: repeated}] : [...seen.values()];
}

// Where the person is: path, query and hash (the map keeps state in the path; SEO pages are /sp/{slug}/…).
const where = url => { try { const u = new URL(url); return u.pathname + u.search + u.hash; } catch { return url; } };

async function serve() {
  const out = resolve(flag('out') || join(tmpdir(), 'portfolio-ux-run'));
  const envDir = resolve(flag('env') || process.env.UX_ENV || join(tmpdir(), 'portfolio-ux' + TAG));
  const state = JSON.parse(readFileSync(join(envDir, 'state.json'), 'utf8'));
  mkdirSync(join(out, 'shots'), {recursive: true});
  const engines = {};
  const tabs = {};
  let step = existsSync(join(out, 'trail.jsonl')) ? readFileSync(join(out, 'trail.jsonl'), 'utf8').trim().split('\n').filter(Boolean).length : 0;
  const trail = entry => appendFileSync(join(out, 'trail.jsonl'), JSON.stringify(entry) + '\n');
  const engine = async name => engines[name] ||= await (name === 'webkit' ? webkit.launch() : chromium.launch({channel: 'chrome', headless: true}));
  const geoCacheFile = join(envDir, 'nominatim-cache.json');
  const geoCache = existsSync(geoCacheFile) ? JSON.parse(readFileSync(geoCacheFile, 'utf8')) : {};
  let geoNext = 0;
  async function nominatim(route) {
    const url = route.request().url();
    if (geoCache[url]) return route.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: geoCache[url]});
    const wait = geoNext - Date.now(); geoNext = Math.max(Date.now(), geoNext) + 1100;
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    const response = await route.fetch().catch(() => null);
    if (!response) return route.abort().catch(() => {});
    const body = await response.text();
    if (response.ok()) { geoCache[url] = body; writeFileSync(geoCacheFile, JSON.stringify(geoCache)); }
    return route.fulfill({response, body}).catch(() => {});
  }

  async function open(tab, [persona, device = 'iphone', path = ''], options) {
    if (!state.personas[persona]) throw new Error('Persona desconhecida: ' + persona + '. Use: ' + Object.keys(state.personas).join(', '));
    if (!DEVICES[device]) throw new Error('Aparelho desconhecido: ' + device + '. Use: ' + Object.keys(DEVICES).join(', '));
    if (tabs[tab]) await close(tab);
    const {engine: kind, options: profile} = DEVICES[device];
    const context = await (await engine(kind)).newContext({...profile, storageState: state.personas[persona].storage, locale: 'en-US',
      timezoneId: 'America/Sao_Paulo', colorScheme: options.dark ? 'dark' : 'light', reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference'});
    if (options.slow) await context.route('**', route => setTimeout(() => route.continue().catch(() => {}), 1200));
    // A busca e a análise de endereço chamam o Nominatim público direto do navegador (1 req/s por app): as respostas
    // ficam num cache do ambiente e as consultas novas saem espaçadas, para o revisor não estourar o limite.
    await context.route(/^https:\/\/nominatim\.openstreetmap\.org\//, nominatim);
    const page = await context.newPage();
    page.setDefaultTimeout(options.slow ? 10000 : 4000);
    const t = tabs[tab] = {context, page, persona, device, scale: profile.deviceScaleFactor || 1, touch: !!profile.hasTouch, events: [], known: new Set(), inflight: 0, requests: {fetch: 0, write: 0}, dialogs: 'accept', options, lastTree: ''};
    page.on('pageerror', e => t.events.push({type: 'pageerror', text: e.message.slice(0, 300)}));
    page.on('console', m => { if (m.type() === 'error') t.events.push({type: 'console', text: m.text().slice(0, 300)}); });
    page.on('request', r => { t.inflight++; if (['fetch', 'xhr'].includes(r.resourceType())) { t.requests.fetch++; if (r.method() !== 'GET') t.requests.write++; } });
    page.on('requestfinished', async r => { t.inflight--; const s = (await r.response().catch(() => null))?.status(); if (s >= 400) t.events.push({type: 'http', status: s, method: r.method(), path: new URL(r.url()).pathname}); });
    page.on('requestfailed', r => { t.inflight--; t.events.push({type: 'network', method: r.method(), path: new URL(r.url()).pathname, text: r.failure()?.errorText}); });
    page.on('dialog', d => { t.events.push({type: 'dialog', kind: d.type(), text: d.message().slice(0, 200), answer: t.dialogs}); (t.dialogs === 'accept' ? d.accept() : d.dismiss()).catch(() => {}); });
    // Sem caminho, a persona chega por onde chegaria (o mapa, uma página de cidade vinda do Google…).
    const start = path.startsWith('/') ? path : path.startsWith('#') ? '/' + path : state.personas[persona].start || '/';
    await page.goto(state.origin + start, {timeout: options.slow ? 30000 : 15000});
    await settle(t);
    return {opened: {persona, device, engine: kind, viewport: page.viewportSize(), dark: !!options.dark, slow: !!options.slow, reducedMotion: !!options.reducedMotion}};
  }
  async function close(tab) {
    const t = tabs[tab]; if (!t) return {};
    // Keep cookies so a later `open` with the same persona is the same person coming back.
    await t.context.storageState({path: state.personas[t.persona].storage}).catch(() => {});
    await t.context.close(); delete tabs[tab];
    return {closed: tab};
  }
  async function settle(t) {
    await t.page.waitForTimeout(200);
    const end = Date.now() + 3000;
    while (Date.now() < end) {
      const busy = await t.page.evaluate(() => document.getAnimations().some(a => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity)
        || !!document.querySelector('[aria-busy="true"]')).catch(() => false);
      if (!busy && t.inflight <= 0) break;
      await t.page.waitForTimeout(100);
    }
    await t.page.waitForTimeout(150);
  }
  async function fingerprint(t) {
    const tree = await t.page.ariaSnapshot({mode: 'ai'}).catch(() => '');
    const pixels = await t.page.screenshot().catch(() => Buffer.alloc(0));
    // Refs are renumbered on every snapshot; compare the tree without them.
    return {tree, treeHash: createHash('sha1').update(tree.replace(/ \[ref=(?:f\d+)?e\d+\]/g, '').replace(/ \[active\]/g, '')).digest('hex'),
      pixelHash: createHash('sha1').update(pixels).digest('hex'), url: t.page.url(), pixels};
  }
  function locate(t, target) {
    if (!target) throw new Error('Falta o alvo (ref, text:… ou role:papel:nome).');
    if (REF.test(target)) return t.page.locator('aria-ref=' + target);
    if (target.startsWith('css:')) return t.page.locator(target.slice(4)).first();
    if (target.startsWith('text:')) return t.page.getByText(target.slice(5), {exact: true}).filter({visible: true}).first();
    if (target.startsWith('role:')) { const [, role, ...name] = target.split(':'); return t.page.getByRole(role, name.length ? {name: name.join(':'), exact: true} : {}).filter({visible: true}).first(); }
    throw new Error('Alvo inválido: ' + target);
  }
  // Centre of the element's part inside the viewport, and what a tap there would hit.
  // refuseCovered (probe.mjs): a target wholly under something else is not tapped; the probe scrolls, as a person would.
  async function reach(locator, options = {}) {
    const spot = await locator.evaluate(el => {
      const r = el.getBoundingClientRect();
      const left = Math.max(r.left, 0), right = Math.min(r.right, innerWidth), top = Math.max(r.top, 0), bottom = Math.min(r.bottom, innerHeight);
      if (right - left < 4 || bottom - top < 4) return {out: true};
      const hitsAt = (x, y) => { const hit = document.elementFromPoint(x, y); return !!hit && (hit === el || el.contains(hit) || (hit.contains(el) && hit.tagName === 'LABEL')); };
      const x = (left + right) / 2, y = (top + bottom) / 2;
      if (hitsAt(x, y)) return {x, y, landed_on: null};
      // Partly covered (a fixed bar over its lower half): a finger taps the part that shows, centre-most first.
      const spots = [];
      for (const fy of [0.5, 0.3, 0.7, 0.15, 0.85]) for (const fx of [0.5, 0.3, 0.7, 0.15, 0.85]) spots.push([left + (right - left) * fx, top + (bottom - top) * fy]);
      const free = spots.find(([px, py]) => hitsAt(px, py));
      if (free) return {x: free[0], y: free[1], landed_on: null, partly_covered: true};
      const hit = document.elementFromPoint(x, y);
      const name = hit ? hit.tagName.toLowerCase() + (hit.id ? '#' + hit.id : '') + ' "' + (hit.getAttribute('aria-label') || hit.innerText || '').trim().slice(0, 40) + '"' : 'nada';
      return {x, y, landed_on: name};
    }, null, {timeout: 2000});
    if (spot.out) throw new Error('Alvo fora da tela: a pessoa não o vê nem alcança. Role (scroll/swipe) se ela rolaria; se devia estar à vista, é achado.');
    if (spot.landed_on && options.refuseCovered) throw new Error('Alvo coberto por ' + spot.landed_on + '.');
    return spot;
  }
  // A ref names an element only until the next snapshot; the role and name on its tree line survive a replay.
  function stable(tree, target) {
    if (!REF.test(target || '')) return target;
    const line = tree.split('\n').find(l => l.includes(`[ref=${target}]`));
    const m = line && line.match(/^\s*- '?([a-z]+)(?: "((?:[^"\\]|\\.)*)")?/);
    return m && m[2] ? `role:${m[1]}:${m[2].replace(/\\(.)/g, '$1')}` : null;
  }
  const describe = locator => locator.evaluate(el => {
    const name = el.getAttribute('aria-label') || el.innerText || el.value || el.getAttribute('title') || '';
    return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${name.trim().replace(/\s+/g, ' ').slice(0, 60)}"`;
  }).catch(() => null);
  async function sensors(t) {
    return t.page.evaluate(touch => {
      const visible = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && r.bottom > 0 && r.top < innerHeight; };
      const targets = [...document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],[tabindex="0"]')].filter(visible);
      const small = targets.filter(el => { const r = el.getBoundingClientRect(); return Math.min(r.width, r.height) < (touch ? 44 : 24) && !el.closest('.sr-only'); })
        .map(el => (el.getAttribute('aria-label') || el.innerText || el.tagName).trim().slice(0, 30));
      // Text cut by its box (hidden overflow or ellipsis) or pushed past the right edge of the screen.
      const leaves = [...document.querySelectorAll('body *')].filter(el => el.children.length === 0 && el.textContent.trim() && visible(el) && !el.closest('.sr-only,svg'));
      const clipped = leaves.filter(el => { const s = getComputedStyle(el), r = el.getBoundingClientRect();
        // Text for screen readers only (1×1 boxes) and skip links parked off screen are cut on purpose.
        if (r.width <= 2 || r.height <= 2 || r.right <= 0 || r.left >= innerWidth) return false;
        return (el.scrollWidth > el.clientWidth + 1 && s.overflowX !== 'visible') || r.right > innerWidth + 1 || r.left < -1; })
        .map(el => el.textContent.trim().replace(/\s+/g, ' ').slice(0, 30));
      const active = document.activeElement;
      return {overflow_x: document.documentElement.scrollWidth > innerWidth + 1, scroll_y: Math.round(scrollY), page_height: document.documentElement.scrollHeight,
        small_targets: small.slice(0, 6), small_target_count: small.length, clipped: clipped.slice(0, 6), clipped_count: clipped.length, busy: !!document.querySelector('[aria-busy="true"]'),
        focus: active && active !== document.body ? (active.getAttribute('aria-label') || active.innerText || active.id || active.tagName).trim().slice(0, 40) : null};
    }, t.touch).catch(() => ({}));
  }
  async function act(t, command, args, options) {
    const {page} = t;
    switch (command) {
      case 'tap': {
        // A person taps what is on screen, where it is: no auto-scroll into view (that hid the stuck carousel of 03/11).
        const l = locate(t, args[0]); const what = await describe(l); const spot = await reach(l, options);
        await (t.touch ? page.touchscreen.tap(spot.x, spot.y) : page.mouse.click(spot.x, spot.y));
        return {target: what, ...(spot.landed_on ? {landed_on: spot.landed_on} : {}), ...(spot.partly_covered ? {partly_covered: true} : {})};
      }
      case 'drag': {
        // Arrastar o mapa. O Playwright não tem arrasto de dedo: no toque, vai pelo mouse (o MapLibre aceita os dois).
        const [x1, y1, x2, y2] = args.map(Number); if ([x1, y1, x2, y2].some(Number.isNaN)) throw new Error('Use: drag X1 Y1 X2 Y2 (pixels CSS).');
        await page.mouse.move(x1, y1); await page.mouse.down(); await page.mouse.move(x2, y2, {steps: 12}); await page.mouse.up();
        return {target: `(${x1},${y1})→(${x2},${y2})`, ...(t.touch ? {approximate: 'arrasto de dedo simulado pelo mouse'} : {})};
      }
      case 'tapxy': { const [x, y] = args.map(Number); await (t.touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y)); return {target: `(${x},${y})`}; }
      case 'fill': { const l = locate(t, args[0]); const what = await describe(l); await reach(l); await l.fill(args.slice(1).join(' ')); return {target: what}; }
      case 'press': await page.keyboard.press(args[0]); return {target: args[0]};
      case 'swipe': {
        const l = locate(t, args[0]); const box = await l.boundingBox(); if (!box) throw new Error('Alvo sem caixa visível.');
        const dir = args[1] || 'left', dx = {left: 1, right: -1}[dir] || 0, dy = {up: 1, down: -1}[dir] || 0;
        // Playwright has no touch drag: scroll the nearest scroll container (wheel where there is one).
        if (t.touch) await l.evaluate((el, [dx, dy]) => { let c = el; while (c && !(c.scrollWidth > c.clientWidth && dx) && !(c.scrollHeight > c.clientHeight && dy)) c = c.parentElement;
          (c || document.scrollingElement).scrollBy({left: dx * el.clientWidth * 0.9, top: dy * el.clientHeight * 0.9}); }, [dx, dy]);
        else { await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.wheel(dx * box.width * 0.9, dy * box.height * 0.9); }
        return {target: await describe(l), approximate: 'gesto de dedo simulado por rolagem'};
      }
      case 'scroll': {
        const dy = (args[0] === 'up' ? -1 : 1) * Math.round(page.viewportSize().height * 0.8);
        // Mobile WebKit has no mouse wheel: scroll the page as a finger flick would.
        if (t.touch) { await page.evaluate(dy => scrollBy(0, dy), dy); return {approximate: 'rolagem por script'}; }
        await page.mouse.wheel(0, dy); return {};
      }
      case 'doubletap': { const l = locate(t, args[0]); const what = await describe(l); const {x, y} = await reach(l, options);
        for (let i = 0; i < 2; i++) { await (t.touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y)); await page.waitForTimeout(80); }
        return {target: what}; }
      case 'back': await page.goBack({waitUntil: 'commit'}).catch(() => {}); return {};
      case 'forward': await page.goForward({waitUntil: 'commit'}).catch(() => {}); return {};
      case 'reload': await page.reload(); return {};
      case 'rotate': { const v = page.viewportSize(); await page.setViewportSize({width: v.height, height: v.width}); return {viewport: page.viewportSize()}; }
      case 'offline': await t.context.setOffline(args[0] !== 'off'); return {offline: args[0] !== 'off'};
      case 'wait': await page.waitForTimeout(Math.min(Number(args[0]) || 1000, 30000)); return {};
      default: throw new Error('Comando desconhecido: ' + command);
    }
  }
  async function handle({command, args, tab, options}) {
    if (command === 'open') {
      const r = await open(tab, args, options);
      // An address that starts an activity writes while loading (probe.mjs resets the seed after it).
      const requests = tabs[tab].requests.fetch ? {...tabs[tab].requests} : undefined;
      return {...r, ...(await look(tab, {...options, diff: false}, 'open ' + args.join(' '), {opened: r.opened, args, ...(requests ? {requests} : {})}))};
    }
    if (command === 'stop') { for (const name of Object.keys(tabs)) await close(name); for (const e of Object.values(engines)) await e.close(); setTimeout(() => process.exit(0), 50); return {stopped: true}; }
    if (command === 'note') { trail({step: ++step, t: new Date().toISOString(), tab, action: 'note', text: args.join(' ')}); return {noted: step}; }
    const t = tabs[tab];
    if (!t) throw new Error(`Aba "${tab}" não está aberta: use open.`);
    if (command === 'close') { const r = await close(tab); trail({step: ++step, t: new Date().toISOString(), tab, persona: t.persona, device: t.device, action: 'close'}); return r; }
    if (command === 'look') return look(tab, options);
    if (command === 'dialogs') { t.dialogs = args[0] === 'dismiss' ? 'dismiss' : 'accept'; return {dialogs: t.dialogs}; }
    if (command === 'audit') {
      // Injected through the protocol, not eval in the page: the app's CSP stays as in production.
      await t.page.evaluate(AXE).catch(() => {});
      const violations = await t.page.evaluate(() => axe.run(document, {runOnly: {type: 'rule', values: ['color-contrast', 'target-size']}, resultTypes: ['violations']})
        .then(r => r.violations.flatMap(v => v.nodes.slice(0, 8).map(n => ({rule: v.id, target: n.target.join(' '), text: (n.any[0]?.message || '').slice(0, 140)}))))).catch(e => [{rule: 'erro', text: e.message.slice(0, 200)}]);
      trail({step: ++step, t: new Date().toISOString(), tab, persona: t.persona, device: t.device, action: 'audit', url: where(t.page.url()), violations});
      return {step, audit: violations};
    }
    if (command === 'inspect') {
      const l = locate(t, args[0]);
      return {inspect: await l.evaluate(el => {
        const r = el.getBoundingClientRect(), s = getComputedStyle(el), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return {box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], visibility: s.visibility, opacity: s.opacity,
          pointer_events: s.pointerEvents, disabled: !!el.disabled, receives_tap: hit === el || el.contains(hit),
          hit: hit ? hit.tagName.toLowerCase() + (hit.id ? '#' + hit.id : '') + (hit.className && typeof hit.className === 'string' ? '.' + hit.className.split(' ').join('.') : '') : null};
      })};
    }
    const before = await fingerprint(t);
    t.events = []; t.requests = {fetch: 0, write: 0};
    let replay = ['tap', 'doubletap', 'fill', 'swipe'].includes(command) ? stable(before.tree, args[0]) : undefined;
    // A generic element (e.g. a <summary>) or one with no accessible name at all (a <table>, a dropdown item; #784)
    // cannot be found by role and name: replay by tag and aria-label, or by tag and first line of text ("⋯" alone
    // would match every card's menu). Whitespace is folded so table cells (tabs) make a valid selector.
    if (REF.test(args[0] || '') && (replay === null || replay?.startsWith('role:generic:'))) replay = await locate(t, args[0]).evaluate(el => {
      const tag = el.tagName.toLowerCase(), label = el.getAttribute('aria-label');
      const line = (el.innerText || '').trim().split('\n')[0].replace(/\s+/g, ' ').trim().slice(0, 60);
      return label ? `css:${tag}[aria-label=${JSON.stringify(label)}]` : line ? `css:${tag}:has-text(${JSON.stringify(line)})` : null;
    }, null, {timeout: 2000}).catch(() => null);
    let result, error;
    try { result = await act(t, command, args, options); } catch (e) { error = e.message.replace(/\u001b\[\d+m/g, '').split('\n').slice(0, 3).join(' ').slice(0, 400); }
    await settle(t);
    const after = await fingerprint(t);
    const changed = {tree: before.treeHash !== after.treeHash, pixels: before.pixelHash !== after.pixelHash, url: before.url !== after.url};
    const shot = join(out, 'shots', `${String(++step).padStart(4, '0')}-${tab}-${command}.png`);
    writeFileSync(shot, after.pixels);
    const requests = t.requests.fetch ? {...t.requests} : undefined;
    const entry = {step, t: new Date().toISOString(), tab, persona: t.persona, device: t.device, action: command, args, ...(replay !== undefined ? {replay} : {}),
      ...(options.note ? {intent: options.note} : {}), ...result, error, url: where(after.url), changed,
      no_visible_change: !error && !changed.tree && !changed.pixels && !changed.url, events: grouped(t.events, t.known), sensors: await sensors(t), ...(requests ? {requests} : {}), shot};
    trail(entry);
    t.events = [];
    if (options.look && !error) entry.tree = present(t, after.tree, options);
    return entry;
  }
  // The tree as shown to the model; --diff keeps only the lines that are new since the last tree of the tab.
  function present(t, tree, options) {
    const shown = tree.split('\n').filter(line => !/^\s*- option /.test(line));
    const key = line => line.replace(/ \[ref=(?:f\d+)?e\d+\]/g, '').replace(/ \[active\]/g, '');
    const previous = t.lastTree; t.lastTree = shown;
    if (!options.diff || !previous) return shown.join('\n');
    const old = new Map(); for (const line of previous) old.set(key(line), (old.get(key(line)) || 0) + 1);
    const added = shown.filter(line => { const k = key(line), n = old.get(k) || 0; if (n) { old.set(k, n - 1); return false; } return true; });
    const removed = [...old.values()].reduce((a, n) => a + n, 0);
    if (added.length > shown.length * 0.6) return shown.join('\n');
    return `(diff: ${added.length} linhas novas, ${removed} saíram, ${shown.length - added.length} iguais)\n` + added.join('\n');
  }
  async function look(tab, options, action = 'look', extra = {}) {
    const t = tabs[tab];
    await settle(t);
    const {tree, pixels} = await fingerprint(t);
    const shot = join(out, 'shots', `${String(++step).padStart(4, '0')}-${tab}-look.png`);
    writeFileSync(shot, pixels);
    const entry = {step, t: new Date().toISOString(), tab, persona: t.persona, device: t.device, action, ...extra, ...(options.note ? {intent: options.note} : {}), url: where(t.page.url()),
      title: await t.page.title(), viewport: t.page.viewportSize(), shot_scale: t.scale, sensors: await sensors(t), events: grouped(t.events, t.known), shot};
    trail(entry);
    t.events = [];
    return {...entry, tree: options.noTree ? undefined : present(t, tree, options)};
  }
  createServer((request, response) => {
    let body = '';
    request.on('data', chunk => body += chunk);
    request.on('end', async () => {
      let result;
      try { result = await handle(JSON.parse(body)); } catch (e) { result = {error: e.message.split('\n')[0].slice(0, 400)}; }
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(result));
    });
  }).listen(PORT, '127.0.0.1', () => console.log(JSON.stringify({driver: PORT, out, origin: state.origin})));
}
