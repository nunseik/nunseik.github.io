// Habla Mucho speech lab (local Vite on :5173 + API on :8765): play a reading, then select the flagged word.
import {chromium, cast, encode, SHOTS} from './cast.mjs';
const b = await chromium.launch({args: ['--autoplay-policy=no-user-gesture-required']});
const p = await b.newPage({viewport: {width: 1280, height: 800}, deviceScaleFactor: 1.5});
await p.goto('http://127.0.0.1:5173/#laboratorio'); await p.waitForTimeout(2000);
await p.locator('.run-item', {hasText: 'Jogo · l2-01'}).first().click(); await p.waitForTimeout(2000);
const smooth = async (y, ms = 700) => { await p.evaluate(y => window.scrollTo({top: y, behavior: 'smooth'}), y); await p.waitForTimeout(ms + 200); };
const dir = await cast(p, 'habla-lab', async () => {
  await p.waitForTimeout(800);
  await p.locator('.run-item', {hasText: 'Tarefa de leitura'}).first().click(); await p.waitForTimeout(1600); // "Buenos días, ¿cómo estás…"
  await smooth(150);
  await p.getByRole('button', {name: /Reproduzir/}).click(); await p.waitForTimeout(5200);
  await smooth(560);
  await p.getByText('cómo', {exact: true}).last().click(); await p.waitForTimeout(1200);
  await smooth(760); await p.waitForTimeout(3000);
});
await b.close();
encode(dir, `${SHOTS}/habla-mucho/lab`, {width: 960, speed: 1.2});
