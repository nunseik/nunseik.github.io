// Old-school terminal animations. Purely decorative: every page is complete without them,
// prefers-reduced-motion turns them off, and any key, tap or scroll skips to the end.

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── home intro: type `whoami`, then print the buffer line by line ──
// Base.astro sets html.intro (before first paint) only on the first home visit of a session.
async function intro() {
  const root = document.documentElement;
  if (!root.classList.contains('intro')) return;
  const blocks = Array.from(document.querySelectorAll<HTMLElement>('.buf > *'));
  const typed = document.querySelector<HTMLElement>('[data-type]');
  const text = typed?.textContent || '';
  let skipped = false;
  const finish = () => {
    skipped = true;
    if (typed) typed.textContent = text;
    blocks.forEach((b) => b.classList.add('shown'));
    root.classList.remove('intro');
    for (const ev of events) removeEventListener(ev, finish);
  };
  const events = ['keydown', 'pointerdown', 'wheel', 'touchstart'] as const;
  for (const ev of events) addEventListener(ev, finish, { passive: true });

  if (typed) typed.textContent = '';
  for (const b of blocks) {
    if (skipped) return;
    b.classList.add('shown');
    if (typed && b.contains(typed)) {
      await sleep(180);
      for (const ch of text) {
        if (skipped) return;
        typed.textContent += ch;
        await sleep(55);
      }
      await sleep(120);
    } else {
      await sleep(b.classList.contains('tilde') ? 15 : 55);
    }
  }
  finish();
}

// ── replay terminals: <pre data-replay> with .ln.in (typed) and .ln.out (printed) lines ──
function replay(pre: HTMLElement) {
  const lines = Array.from(pre.querySelectorAll<HTMLElement>('.ln'));
  const texts = lines.map((l) => l.querySelector<HTMLElement>('.typed')?.textContent ?? '');
  const ctl = document.createElement('p');
  ctl.className = 'nonum term-ctl';
  const btn = document.createElement('button');
  btn.type = 'button';
  ctl.append(btn);
  pre.after(ctl);

  let run = 0; // bumping it cancels the current playback
  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '&nbsp;';

  const showAll = () => {
    run++;
    lines.forEach((l, i) => {
      l.classList.remove('hide');
      const t = l.querySelector<HTMLElement>('.typed');
      if (t) t.textContent = texts[i];
    });
    cursor.remove();
    btn.textContent = '▶ replay';
  };

  const play = async () => {
    const me = ++run;
    btn.textContent = '■ skip';
    lines.forEach((l) => l.classList.add('hide'));
    for (const [i, l] of lines.entries()) {
      const t = l.querySelector<HTMLElement>('.typed');
      l.classList.remove('hide');
      if (t) {
        t.textContent = '';
        t.after(cursor);
        await sleep(350);
        for (const ch of texts[i]) {
          if (me !== run) return;
          t.textContent += ch;
          await sleep(22);
        }
        await sleep(300);
      } else {
        l.after(cursor);
        await sleep(40);
      }
      if (me !== run) return;
    }
    showAll();
  };

  btn.addEventListener('click', () => {
    if (btn.textContent === '■ skip') return showAll();
    // the button sits below the terminal; bring the top of the terminal into view so the typing is seen
    pre.scrollIntoView({ block: 'start', behavior: 'smooth' });
    play();
  });
  showAll();

  // autoplay once per session, the first time the terminal is mostly on screen
  const key = 'replay:' + location.pathname;
  try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch { /* storage blocked: still play */ }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); play(); }
  }, { threshold: 0.35 });
  io.observe(pre);
}

if (reduce) {
  document.documentElement.classList.remove('intro');
} else {
  intro();
  document.querySelectorAll<HTMLElement>('[data-replay]').forEach(replay);
}
