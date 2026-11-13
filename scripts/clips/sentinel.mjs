// Sentinel web map (public site), phone viewport: map modes, then an address search.
import {chromium, cast, encode, SHOTS} from './cast.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR'})).newPage();
await p.goto('https://mapadecrimes.ia.br', {waitUntil: 'networkidle'});
await p.click('#app-banner-close').catch(() => {});
await p.waitForFunction(() => !document.body.innerText.includes('Sobrevoando'), null, {timeout: 20000}).catch(() => {});
await p.waitForTimeout(1500);
const dir = await cast(p, 'sentinel-web-map', async () => {
  await p.waitForTimeout(1200);
  await p.getByRole('button', {name: 'Zoom in'}).click(); await p.waitForTimeout(1800);
  for (const mode of ['Grade de risco', 'Mapa de calor']) { await p.locator('.mode-seg', {hasText: mode}).click(); await p.waitForTimeout(2500); }
  await p.locator('.mode-seg', {hasText: 'Ocorrências'}).click(); await p.waitForTimeout(1500);
  await p.click('#search-input'); await p.keyboard.type('Avenida Paulista 1000', {delay: 70});
  await p.waitForTimeout(1200); await p.keyboard.press('Enter'); await p.waitForTimeout(4000);
});
await b.close();
encode(dir, `${SHOTS}/sentinel/web-map`, {width: 540, speed: 1.25});
