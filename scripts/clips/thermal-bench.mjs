// thermal-bench-macos: the baseline vs modded report, rebuilt from the real runs in a temp copy (report.py writes
// next to itself), dark theme. Summary cards, verdict, then hover the SoC power chart.
import {execSync} from 'node:child_process';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {chromium, cast, encode, SHOTS} from './cast.mjs';
const repo = `${process.env.HOME}/workspace/bench-temp/thermal-bench`, tmp = mkdtempSync(`${tmpdir()}/thermal-`);
execSync(`cp -r report.py runs ${tmp}/ && cd ${tmp} && python3 -I report.py runs/base-ac-*.csv runs/base-batt-*.csv runs/mod-ac-*.csv runs/mod-batt-*.csv`, {cwd: repo, stdio: 'inherit', shell: '/bin/bash'});
const b = await chromium.launch();
const p = await (await b.newContext({viewport: {width: 1120, height: 700}, deviceScaleFactor: 1, colorScheme: 'dark'})).newPage();
await p.goto(`file://${tmp}/report.html`);
await p.waitForTimeout(1500);
const smooth = async (dy) => { for (let s = 0; s < Math.abs(dy); s += 12) { await p.mouse.wheel(0, Math.sign(dy) * 12); await p.waitForTimeout(16); } };
const dir = await cast(p, 'thermal-bench', async () => {
  await p.waitForTimeout(1800);
  await smooth(250); await p.waitForTimeout(2600);
  const chart = p.locator('.charts > *').first();
  await chart.scrollIntoViewIfNeeded(); await smooth(0);
  const box = await chart.boundingBox();
  await p.evaluate(y => scrollTo({top: scrollY + y - 40, behavior: 'smooth'}), box.y); await p.waitForTimeout(1200);
  const bx = await chart.boundingBox();
  const y = bx.y + bx.height * 0.45;
  for (let i = 0; i <= 60; i++) { await p.mouse.move(bx.x + bx.width * (0.12 + 0.82 * i / 60), y); await p.waitForTimeout(70); }
  await p.waitForTimeout(1500);
});
await b.close();
encode(dir, `${SHOTS}/thermal-bench-macos/report`, {width: 960, speed: 1.1, poster: 0.5});
