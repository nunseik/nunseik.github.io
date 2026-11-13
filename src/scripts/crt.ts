// Plays CRT clips (components/Crt.astro) only while they're on screen, with a short power-on flicker the first time.
// With reduced motion the poster stays; a tap toggles playback for anyone who wants it anyway.
const clips = [...document.querySelectorAll<HTMLVideoElement>('video[data-crt]')];
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const visible = new Set<HTMLVideoElement>();

// autoplay can be refused (low-power mode); the poster stays
const play = (v: HTMLVideoElement) => {
  if (v.readyState === 0 && v.networkState !== HTMLMediaElement.NETWORK_LOADING) v.load();
  v.play().catch(() => {});
};
// what the page starts on its own: never with reduced motion, never a clip the visitor paused
const autoplay = (v: HTMLVideoElement) => { if (!still && !v.dataset.paused) play(v); };

if (clips.length && 'IntersectionObserver' in window) {
  // preload="none" keeps clips far down the page off the network; start fetching ~one screen before one shows up,
  // so it's ready to play by the time it's visible instead of starting the download then
  const warm = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const v = e.target as HTMLVideoElement;
        v.preload = 'auto';
        if (v.readyState === 0 && v.networkState !== HTMLMediaElement.NETWORK_LOADING) v.load(); // flipping preload alone doesn't start a fetch everywhere
        warm.unobserve(v);
      }
    },
    { rootMargin: '300px 0px' },
  );
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const v = e.target as HTMLVideoElement;
        if (e.isIntersecting) {
          visible.add(v);
          if (!v.dataset.on) { v.dataset.on = '1'; v.parentElement?.classList.add('on'); }
          autoplay(v);
        } else {
          visible.delete(v);
          v.pause();
        }
      }
    },
    { threshold: 0.15 },
  );
  for (const v of clips) {
    warm.observe(v);
    io.observe(v);
    v.addEventListener('click', () => {
      if (v.paused) { delete v.dataset.paused; play(v); } else { v.dataset.paused = '1'; v.pause(); }
    });
  }

  // iOS pauses media when the tab or app goes to the background, and a page restored from the back/forward cache
  // comes back paused too. Visibility didn't change, so the observer never fires again: resume what's on screen.
  const resume = () => { if (document.visibilityState === 'visible') visible.forEach(autoplay); };
  document.addEventListener('visibilitychange', resume);
  addEventListener('pageshow', resume);
}
