// Voo Livro (public prototype), phone viewport: "I found a book", type the label code, land on that copy's logbook.
// Uses the public demo copy. Stops above the third logbook entry, which is a real tester's review.
import {chromium, cast, encode, SHOTS} from './cast.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR'})).newPage();
await p.goto('https://voo-livro.vercel.app', {waitUntil: 'networkidle'});
await p.waitForTimeout(1000);
const dir = await cast(p, 'voo-livro', async () => {
  await p.waitForTimeout(1800);
  await p.getByRole('link', {name: 'Encontrei um livro'}).tap(); await p.waitForLoadState('networkidle'); await p.waitForTimeout(1000);
  await p.locator('input[name=codigo]').tap(); await p.keyboard.type('DEM0-A001', {delay: 140}); await p.waitForTimeout(500);
  await p.getByRole('button', {name: 'Abrir o diário de bordo'}).tap();
  await p.getByRole('heading', {name: 'Diário de bordo'}).waitFor(); await p.waitForTimeout(2200);
  const lu = await p.getByText('deixou um relato').boundingBox();
  const y = Math.min(160, lu.y - 844 - 20); // keep the tester's entry off screen
  for (let s = 0; s < y; s += 8) { await p.mouse.wheel(0, 8); await p.waitForTimeout(25); }
  await p.waitForTimeout(2400);
});
await b.close();
encode(dir, `${SHOTS}/voo-livro/found`, {width: 540, speed: 1.1, poster: 1});
