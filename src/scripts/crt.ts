// Plays CRT clips (components/Crt.astro) only while they're on screen, with a short power-on flicker the first time.
// With reduced motion the poster stays; a tap toggles playback for anyone who wants it anyway.
const clips = [...document.querySelectorAll<HTMLVideoElement>('video[data-crt]')];
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

const play = (v: HTMLVideoElement) => v.play().catch(() => {}); // autoplay can be refused (low-power mode); the poster stays

if (clips.length && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const v = e.target as HTMLVideoElement;
        if (e.isIntersecting) {
          if (!v.dataset.on) { v.dataset.on = '1'; v.parentElement?.classList.add('on'); }
          if (!still && !v.dataset.paused) play(v);
        } else v.pause();
      }
    },
    { threshold: 0.35 },
  );
  for (const v of clips) {
    io.observe(v);
    v.addEventListener('click', () => {
      if (v.paused) { delete v.dataset.paused; play(v); } else { v.dataset.paused = '1'; v.pause(); }
    });
  }
}
