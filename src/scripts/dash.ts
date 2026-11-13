// Dashboard home: the preview pane follows the project under the cursor (hover, focus, j/k),
// like btop's detail view following the selected process. ◀ ▶ step through projects on any device.
// Without this script the pane shows the first project and every row is still a plain link.

type Shot = { src: string; alt: string; video?: string; ar: number } | null;
type Item = { id: string; tagline: string; stats: { label: string; value: string }[]; shot: Shot };

const dataEl = document.getElementById('preview-data');
const pane = document.querySelector<HTMLElement>('.prev');

if (dataEl && pane) {
  const data: Item[] = JSON.parse(dataEl.textContent || '[]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const q = <T extends HTMLElement>(s: string) => pane.querySelector<T>(s)!;
  const screen = q('.pv-screen');
  const video = q<HTMLVideoElement>('video');
  const nosig = q('.nosig');
  const rows = [...document.querySelectorAll<HTMLAnchorElement>('.pr[data-proc]')];
  let cur = 0;

  const inView = (el: Element) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  };

  function show(i: number) {
    i = (i + data.length) % data.length;
    if (i === cur) return;
    cur = i;
    const p = data[i];
    q('[data-pv-name]').textContent = `${p.id}/`;
    q('[data-pv-count]').textContent = `${i + 1}/${data.length}`;
    q('[data-pv-tag]').textContent = p.tagline;
    q('[data-pv-stats]').replaceChildren(
      ...p.stats.map((s) => {
        const span = document.createElement('span');
        const b = document.createElement('b');
        b.textContent = s.value;
        span.append(b, ` ${s.label}`);
        return span;
      }),
    );
    const open = q<HTMLAnchorElement>('[data-pv-open]');
    open.href = `/projects/${p.id}/`;
    open.textContent = `→ open ${p.id}.md`;
    rows.forEach((r) => r.classList.toggle('cur', Number(r.dataset.proc) === i));

    const s = p.shot;
    video.pause();
    video.replaceChildren();
    video.hidden = !s;
    nosig.hidden = !!s;
    screen.classList.toggle('is-clip', !!s?.video);
    if (!s) return video.removeAttribute('poster');
    video.poster = s.src;
    video.style.setProperty('--ar', s.ar.toFixed(4));
    video.setAttribute('aria-label', s.alt);
    if (s.video) {
      for (const [ext, type] of [['webm', 'video/webm'], ['mp4', 'video/mp4']]) {
        const source = document.createElement('source');
        source.src = `${s.video}.${ext}`;
        source.type = type;
        video.append(source);
      }
    }
    video.load();
    // a short power-on flicker, like switching channels
    screen.classList.remove('on');
    void screen.offsetWidth;
    screen.classList.add('on');
    if (s.video && !reduce && !video.dataset.paused && inView(video)) video.play().catch(() => {});
  }

  // hovering across the list shouldn't start a download per row: wait until the pointer settles
  let t = 0;
  const hover = matchMedia('(hover: hover)').matches;
  for (const r of rows) {
    const i = Number(r.dataset.proc);
    r.addEventListener('focus', () => show(i));
    if (hover) {
      r.addEventListener('mouseenter', () => { clearTimeout(t); t = window.setTimeout(() => show(i), 140); });
      r.addEventListener('mouseleave', () => clearTimeout(t));
    }
  }
  rows.find((r) => r.dataset.proc === '0')?.classList.add('cur');

  const ctl = q('.pv-ctl');
  ctl.hidden = false;
  ctl.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-pv]');
    if (!b) return;
    clearTimeout(t); // a hover still settling must not override the button
    show(cur + Number(b.dataset.pv));
  });
}
