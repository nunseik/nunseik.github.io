// AccessiTools (public site), phone viewport: open a recipe, scale it, then the hands-free cook mode.
import {chromium, cast, encode, SHOTS} from './cast.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true})).newPage();
await p.goto('https://accessible-tools-ten.vercel.app', {waitUntil: 'networkidle'});
await p.waitForTimeout(800);
const dir = await cast(p, 'accessible-tools', async () => {
  await p.waitForTimeout(1200);
  await p.getByRole('link', {name: /Recipes/}).tap(); await p.waitForTimeout(1400);
  await p.getByText('Classic Pancakes').tap(); await p.waitForTimeout(1600);
  for (const s of ['2×', '3×', '½×']) { await p.getByRole('button', {name: s, exact: true}).tap(); await p.waitForTimeout(1300); }
  await p.getByRole('button', {name: 'Cook'}).tap(); await p.waitForTimeout(2200);
  console.log((await p.locator('button').allInnerTexts()).join(' | '));
  const next = p.getByRole('button', {name: /Next/i});
  if (await next.count()) { await next.first().tap(); await p.waitForTimeout(2000); }
});
await b.close();
encode(dir, `${SHOTS}/accessible-tools/recipe`, {width: 540, speed: 1.15, poster: 4});
