// Higgs talk deck (local copy of the public page): the unitarity problem, then the W boson that fixes it.
import {chromium, cast, encode, SHOTS} from './cast.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport: {width: 1280, height: 720}, deviceScaleFactor: 1})).newPage();
await p.goto(`file://${process.env.HOME}/workspace/higgs-talk/index.html#unitarity`);
await p.waitForFunction(() => window.MathJax?.startup?.promise).then(() => p.evaluate(() => MathJax.startup.promise));
await p.waitForTimeout(2500);
const dir = await cast(p, 'higgs-talk', async () => {
  await p.waitForTimeout(1500);
  for (const wait of [2200, 2600, 2200, 2600, 3000]) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(wait); }
});
await b.close();
encode(dir, `${SHOTS}/higgs-talk/deck`, {width: 960, speed: 1.2, poster: 3});
