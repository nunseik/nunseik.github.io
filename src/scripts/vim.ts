// Tiny vim-flavoured navigation layer. Everything still works without it.

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const projects: { id: string; title: string }[] = JSON.parse($('projects-data').textContent || '[]');

const msg = $('msg');
const mode = $('mode');
const cmdline = $('cmdline');
const form = $<HTMLFormElement>('cmdform');
const input = $<HTMLInputElement>('cmd');
const help = $<HTMLDialogElement>('help');
const pos = $('pos');

function say(text: string, kind: '' | 'err' | 'ok' = '') {
  msg.textContent = text;
  msg.className = 'msg' + (kind ? ' ' + kind : '');
}

// ── position indicator (Top / Bot / NN%) ─────────────────
function updatePos() {
  const max = document.documentElement.scrollHeight - innerHeight;
  if (max <= 4) pos.textContent = 'All';
  else if (scrollY <= 4) pos.textContent = 'Top';
  else if (scrollY >= max - 4) pos.textContent = 'Bot';
  else pos.textContent = Math.round((scrollY / max) * 100) + '%';
}
addEventListener('scroll', updatePos, { passive: true });
addEventListener('resize', updatePos);
updatePos();

// ── link navigation (j/k), lynx-style ─────────────────
// j/k move between the links in the buffer (list rows included); Enter follows.
// Reading stays smooth: j scrolls a small step (32 px, a bit over one line) until the next link is
// on screen or one step away, then selects it. No move ever scrolls more than about one step.
// collected on every move: the replay terminal adds its button after this script runs
const collect = () => Array.from(document.querySelectorAll<HTMLElement>('#buf a[href], #buf button')).filter(
  (a) => a.getClientRects().length > 0,
);
let items = collect();
let sel = -1;
const chrome = () => ({
  top: document.querySelector('.tabline')?.getBoundingClientRect().bottom ?? 0,
  bottom: document.querySelector('.status')?.getBoundingClientRect().top ?? innerHeight,
});
// fully visible between the tab bar and the status line (a half-clipped link doesn't count)
const onScreen = (el: Element) => {
  const r = el.getBoundingClientRect(), c = chrome();
  return r.top >= c.top && r.bottom <= c.bottom;
};
// like scrollIntoView({block:'nearest'}), but clear of the sticky tab bar and status line
function reveal(el: Element) {
  const r = el.getBoundingClientRect(), c = chrome(), m = 8;
  if (r.bottom > c.bottom - m) scrollBy({ top: r.bottom - c.bottom + m });
  else if (r.top < c.top + m) scrollBy({ top: r.top - c.top - m });
}
function select(i: number) {
  if (i < 0 || i >= items.length) return false;
  sel = i;
  const el = items[sel];
  items.forEach((a, n) => a.classList.toggle('sel', n === sel));
  el.focus({ preventScroll: true });
  reveal(el);
  say(el.dataset.nav || (el.getAttribute('href') ? `→ ${el.getAttribute('href')}` : `[${el.textContent?.trim()}]`));
  return true;
}
function clearSel() {
  items.forEach((a) => a.classList.remove('sel'));
  if (sel >= 0) items[sel].blur();
  sel = -1;
}
function step(dir: 1 | -1) {
  const current = items[sel];
  items = collect();
  sel = current ? items.indexOf(current) : -1;
  // resume from the focused link (Tab, click) or the selection if still visible, else from what is on screen
  const active = items.indexOf(document.activeElement as HTMLElement);
  if (active >= 0) sel = active;
  // at the top of the buffer with nothing selected, k has nowhere to go (as in vim)
  if (dir === -1 && sel < 0 && scrollY <= 4) return;
  let next: number;
  if (sel >= 0 && onScreen(items[sel])) next = sel + dir;
  else {
    const c = chrome();
    next = dir === 1
      ? items.findIndex((a) => a.getBoundingClientRect().top >= c.top)
      : items.findLastIndex((a) => a.getBoundingClientRect().bottom <= c.bottom);
  }
  const c = chrome(), STEP = 32;
  const target = items[next];
  const r = target?.getBoundingClientRect();
  const near = r && (dir === 1 ? r.bottom <= c.bottom + STEP : r.top >= c.top - STEP);
  if (target && near) return select(next);
  scrollBy({ top: dir * STEP });
}

// ── jumplist (Ctrl-o / Ctrl-i) ───────────────────────────
// Big in-page jumps are recorded; once the list runs out, fall back to browser history.
const jumps: number[] = [];
let jumpAt = 0;
function markJump() {
  jumps.length = jumpAt;
  if (jumps[jumps.length - 1] !== scrollY) jumps.push(scrollY);
  jumpAt = jumps.length;
}
function jumpBack() {
  if (jumpAt > 0) {
    if (jumpAt === jumps.length) jumps.push(scrollY);
    scrollTo({ top: jumps[--jumpAt] });
  } else history.back();
}
function jumpForward() {
  if (jumpAt < jumps.length - 1) scrollTo({ top: jumps[++jumpAt] });
  else history.forward();
}

// ── search (/ ? n N) ─────────────────────────────────────
let lastSearch = '';
let hit = -1;
function matches(q: string) {
  const out: Range[] = [];
  const needle = q.toLowerCase();
  const walk = document.createTreeWalker($('buf'), NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const text = (n.textContent || '').toLowerCase();
    for (let i = text.indexOf(needle); i >= 0; i = text.indexOf(needle, i + needle.length)) {
      const r = document.createRange();
      r.setStart(n, i);
      r.setEnd(n, i + needle.length);
      out.push(r);
    }
  }
  return out;
}
function search(q: string, step: 1 | -1 = 1) {
  if (!q) return say('E35: No previous regular expression', 'err');
  if (q !== lastSearch) { lastSearch = q; hit = -1; }
  const found = matches(q);
  if (!found.length) return say(`E486: Pattern not found: ${q}`, 'err');
  hit = (hit + step + found.length) % found.length;
  const r = found[hit];
  markJump();
  clearSel();
  const sel = getSelection();
  sel?.removeAllRanges();
  sel?.addRange(r);
  r.startContainer.parentElement?.scrollIntoView({ block: 'center' });
  say(`/${q}  [${hit + 1}/${found.length}]`, 'ok');
}

// ── command line ─────────────────────────────────────────
const prefix = $('cmdprefix');
function openCmd(prefill = '', lead = ':') {
  cmdline.classList.add('active');
  mode.textContent = lead === '/' ? 'SEARCH' : 'COMMAND';
  mode.classList.add('cmd');
  prefix.textContent = lead;
  input.value = prefill;
  input.focus({ preventScroll: true });
}
function closeCmd() {
  cmdline.classList.remove('active');
  mode.textContent = 'NORMAL';
  mode.classList.remove('cmd');
  input.blur();
}

const buffers: Record<string, string> = {
  index: '/', home: '/', '~': '/',
  projects: '/projects/',
  tools: '/tools/', tooling: '/tools/', 'ai-tooling': '/tools/', ai: '/tools/',
  memoryctl: '/tools/memoryctl/', memory: '/tools/memoryctl/', 'ai-tooling/memoryctl': '/tools/memoryctl/',
  about: '/about/', contact: '/about/#contact',
};

function findProject(q: string) {
  q = q.toLowerCase().replace(/\.md$/, '').replace(/^.*\//, '');
  return (
    projects.find((p) => p.id === q) ||
    projects.find((p) => p.id.startsWith(q)) ||
    projects.find((p) => p.id.includes(q) || p.title.toLowerCase().includes(q))
  );
}

// :q on a page closes that buffer (back to the index); on the index there is nowhere left to go.
const quitLines = [
  'E37: No write since last change. (There is no escape.) Try :e sentinel or press 4 for contact.',
  'Nice try. You are in vim now. :ls lists the projects, 4 opens about + contact.',
  'Recording @q... just kidding. Try :e sentinel instead.',
];
let quits = 0;

function run(raw: string) {
  const line = raw.trim().replace(/^:/, '');
  if (!line) return;
  const [cmd, ...rest] = line.split(/\s+/);
  const arg = rest.join(' ');
  switch (cmd) {
    case 'q': case 'q!': case 'qa': case 'wq': case 'x': case 'qa!': case 'wqa':
      if (location.pathname !== '/') { location.href = '/'; return; }
      say(quitLines[quits++ % quitLines.length], 'err');
      return;
    case 'h': case 'help':
      help.showModal();
      return;
    case 'e': case 'edit': case 'o': case 'open': case 'b': case 'buffer': {
      if (!arg) return say('E32: No file name. Try :ls', 'err');
      // Exact buffer names win over fuzzy project matches (":e tools" must not open accessible-tools).
      const buffer = buffers[arg.toLowerCase().replace(/\.md$/, '').replace(/\/$/, '')];
      const p = buffer ? undefined : findProject(arg);
      if (buffer) location.href = buffer;
      else if (p) location.href = `/projects/${p.id}/`;
      else if (/^(index|home|~)/.test(arg)) location.href = '/';
      else if (/^mem/.test(arg)) location.href = '/tools/memoryctl/';
      else if (/^(tool|ai)/.test(arg)) location.href = '/tools/';
      else if (/^about/.test(arg)) location.href = '/about/';
      else say(`E484: Can't open file ${arg}`, 'err');
      return;
    }
    case 'ls': case 'buffers': case 'files':
      say(projects.map((p) => p.id).join('  '), 'ok');
      return;
    case 'home': location.href = '/'; return;
    case 'projects': location.href = '/projects/'; return;
    case 'tools': location.href = '/tools/'; return;
    case 'about': location.href = '/about/'; return;
    case 'colo': case 'colorscheme':
      say('Only one colorscheme installed: dark. As it should be.', 'ok');
      return;
    case 'set':
      if (/background=light|bg=light/.test(arg)) return say('E474: Invalid argument (we do not do that here)', 'err');
      return say(`:set ${arg} — noted, ignored.`);
    case 'w': case 'write':
      return say('E45: \'readonly\' option is set — this portfolio is read-only.', 'err');
    case 'version':
      return say('portfolio 1.0 — built with Astro, hosted on GitHub Pages, edited in vim.', 'ok');
    case 'smile':
      return say(':-)  hello there, fellow vim user.', 'ok');
    default:
      if (/^\d+$/.test(cmd)) {
        const blocks = document.querySelectorAll('.buf > *:not(.nonum):not(.tilde)');
        const target = blocks[Math.max(0, +cmd - 1)];
        if (target) { markJump(); target.scrollIntoView({ block: 'center' }); }
        return;
      }
      say(`E492: Not an editor command: ${line}`, 'err');
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const v = input.value;
  const isSearch = prefix.textContent === '/';
  closeCmd();
  if (isSearch) search(v.trim() || lastSearch);
  else run(v);
});
input.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeCmd(); say(''); }
});
input.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== input) closeCmd(); }, 100));
$('cmdbtn').addEventListener('click', () => openCmd());

// ── normal-mode keys ─────────────────────────────────────
let pending = '';
addEventListener('keydown', (e) => {
  const t = e.target as HTMLElement;
  if (t.closest('input, textarea, select, [contenteditable]') || help.open) return;
  if (e.metaKey || e.altKey) return;

  if (e.ctrlKey) {
    if (e.key === 'd') { scrollBy({ top: innerHeight / 2 }); e.preventDefault(); }
    if (e.key === 'u') { scrollBy({ top: -innerHeight / 2 }); e.preventDefault(); }
    if (e.key === 'o') { jumpBack(); e.preventDefault(); }
    if (e.key === 'i') { jumpForward(); e.preventDefault(); }
    return;
  }

  const k = e.key;
  if (pending === 'g') {
    pending = '';
    if (k === 'g') { markJump(); scrollTo({ top: 0 }); clearSel(); return; }
  }
  switch (k) {
    case ':': e.preventDefault(); openCmd(); break;
    case '/': e.preventDefault(); openCmd('', '/'); break;
    case 'n': if (lastSearch) search(lastSearch, 1); else say('E35: No previous regular expression', 'err'); break;
    case 'N': if (lastSearch) search(lastSearch, -1); else say('E35: No previous regular expression', 'err'); break;
    case '?': help.showModal(); break;
    case 'j': e.preventDefault(); step(1); break;
    case 'k': e.preventDefault(); step(-1); break;
    case 'G': markJump(); clearSel(); scrollTo({ top: document.documentElement.scrollHeight }); break;
    case 'g': pending = 'g'; break;
    // a focused link follows itself on Enter; only click when the selection lost focus
    case 'Enter': if (sel >= 0 && items[sel] && document.activeElement !== items[sel]) items[sel].click(); break;
    case '-': {
      const up = location.pathname.replace(/[^/]+\/$/, '');
      if (up !== location.pathname) location.href = up || '/';
      break;
    }
    case 'Escape': clearSel(); say(''); break;
    default:
      if (/^[1-4]$/.test(k)) {
        const a = document.querySelector<HTMLAnchorElement>(`.tabline a[data-tab="${k}"]`);
        if (a) location.href = a.href;
      }
  }
});
