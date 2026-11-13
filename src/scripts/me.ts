// Pixel-art me (components/Me.astro): blinks, and waves when clicked, saying a line in a small
// bubble. He waves once when the home has finished printing.
// Reduced motion: no idle blinking; a click still shows the wave pose and the line.

const root = document.querySelector<HTMLElement>('[data-me]');

if (root) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const btn = root.querySelector<HTMLButtonElement>('.me-btn')!;
  const say = root.querySelector<HTMLElement>('.me-say')!;

  const lines = [
    "hi! I'm Fabio.",
    'yes, the hair is real.',
    "you're in vim, by the way. press ? for the keys.",
    'need something built? have a look at /work/.',
  ];
  let next = 0;
  let waveT = 0;
  let sayT = 0;

  function wave(ms = 1800) {
    root!.classList.add('waving');
    clearTimeout(waveT);
    waveT = window.setTimeout(() => root!.classList.remove('waving'), ms);
  }

  btn.addEventListener('click', () => {
    wave();
    say.textContent = lines[next];
    next = (next + 1) % lines.length;
    root.classList.add('talking');
    clearTimeout(sayT);
    sayT = window.setTimeout(() => root.classList.remove('talking'), 4000);
  });

  if (!reduce) {
    // blink every 2-6 s, sometimes twice
    const blink = () => {
      root.classList.add('blink');
      setTimeout(() => root.classList.remove('blink'), 130);
      if (Math.random() < 0.2) setTimeout(() => { root.classList.add('blink'); setTimeout(() => root.classList.remove('blink'), 130); }, 260);
      setTimeout(blink, 2000 + Math.random() * 4000);
    };
    setTimeout(blink, 2500);

    // say hi once the home intro (if any) has printed
    const hello = () => {
      if (document.documentElement.classList.contains('intro')) return setTimeout(hello, 200);
      setTimeout(() => wave(1300), 500);
    };
    hello();
  }
}
