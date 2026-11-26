// World Cup Players, all local: the stats table (React) over the read-only API, re-sorted and filtered.
// Setup (see scripts/clips/README.md): a throwaway Postgres loaded from the repo's saved ESPN 2022 fixtures,
// a local API key, `world-cup-api --port 8010` and `vite --port 5199`. Nothing is scraped and no server is involved.
// The page is captured without browser chrome, so no address bar or key is in the frames. Uses installed Chrome.
import {chromium, cast, encode, SHOTS} from './cast.mjs';
const b = await chromium.launch({channel: 'chrome'});
const p = await (await b.newContext({viewport: {width: 1100, height: 680}, deviceScaleFactor: 2})).newPage();
await p.goto(process.env.WC_URL || 'http://localhost:5199/', {waitUntil: 'networkidle'});
await p.getByRole('button', {name: /Stats table/}).click();
await p.waitForTimeout(1500);
const dir = await cast(p, 'world-cup-players', async () => {
  await p.waitForTimeout(1800);
  const sort = p.locator('select').nth(2);
  await sort.selectOption({label: 'Assists ↓'}); await p.waitForTimeout(2200);
  await sort.selectOption({label: 'Goals ↓'}); await p.waitForTimeout(1200);
  await p.getByPlaceholder('e.g. Brazil').click();
  await p.keyboard.type('Argentina', {delay: 110}); await p.waitForTimeout(2600);
});
await b.close();
encode(dir, `${SHOTS}/world-cup-players/stats`, {width: 960, poster: 1});
