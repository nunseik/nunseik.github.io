// Class Central Banner Studio (wysiwyg-wp-editor/banner-studio, `npm run studio` on :4321): retitle, then try themes.
import {chromium, cast, encode, SHOTS} from './cast.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport: {width: 1280, height: 720}, deviceScaleFactor: 1})).newPage();
await p.goto('http://localhost:4321/', {waitUntil: 'networkidle'});
await p.waitForTimeout(1200);
const dir = await cast(p, 'banner-studio', async () => {
  await p.waitForTimeout(1200);
  await p.click('#title'); await p.keyboard.press('ControlOrMeta+a'); await p.keyboard.press('Backspace'); await p.waitForTimeout(300);
  await p.keyboard.type('Philosophy', {delay: 110}); await p.waitForTimeout(1600);
  for (const t of ['paper-red', 'mint-teal', 'clay-terracotta']) { await p.selectOption('#theme', t); await p.waitForTimeout(1500); }
  await p.waitForTimeout(800);
});
await b.close();
encode(dir, `${SHOTS}/class-central-formatter/banner-studio`, {width: 960, poster: 8});
