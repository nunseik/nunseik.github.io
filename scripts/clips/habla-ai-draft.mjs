// Teacher reviews a journey their AI drafted over MCP: list ("Via IA") → draft with the review note → student preview.
// Needs a draft titled DRAFT (default: the FATEC example created with the MCP SDK, see README).
import {chromium, cast, encode, SHOTS} from './cast.mjs';
import {login, hideSmoke} from './habla-platform.mjs';
const DRAFT = process.env.DRAFT || 'Mi primera presentación profesional';
const b = await chromium.launch();
const p = await (await b.newContext({viewport: {width: 1280, height: 800}, deviceScaleFactor: 1.5})).newPage();
await hideSmoke(p); await login(p, 'professor-demo');
await p.locator('[data-workspace-link="journeys"]:visible').first().click(); await p.waitForTimeout(1500);
const smooth = async (y, ms = 800) => { await p.evaluate(y => window.scrollTo({top: y, behavior: 'smooth'}), y); await p.waitForTimeout(ms + 200); };
const dir = await cast(p, 'habla-ai-draft', async () => {
  await p.waitForTimeout(1500);
  await p.getByText(DRAFT).first().click(); await p.waitForTimeout(2200);
  await smooth(260); await p.waitForTimeout(1200);
  await smooth(520); await p.waitForTimeout(800);
  await p.getByRole('button', {name: 'Prévia como aluno'}).click(); await p.waitForTimeout(1500);
  await smooth(0, 600); await p.waitForTimeout(3000);
});
await p.screenshot({path: process.env.END_SHOT || '/dev/null'}).catch(() => {});
await b.close();
encode(dir, `${SHOTS}/habla-mucho/ai-draft`, {width: 960, speed: 1.1});
