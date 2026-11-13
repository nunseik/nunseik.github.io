// Teacher profile → "Conectar IA": name a token, get it once with the Claude Code / Codex commands.
// The token is blurred in the clip and written to TOKEN_OUT (mode 600) for the MCP demo step.
import {writeFileSync} from 'node:fs';
import {chromium, cast, encode, SHOTS} from './cast.mjs';
import {login, hideSmoke} from './habla-platform.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport: {width: 1280, height: 800}, deviceScaleFactor: 1.5, bypassCSP: true})).newPage(); // CSP blocks the blur style
await hideSmoke(p);
// the commands under the token repeat it in clear text: mask it there as it renders
await p.addInitScript(() => new MutationObserver(() => {
  for (const id of ['ai-token-claude', 'ai-token-codex']) {
    const el = document.getElementById(id);
    if (el && /hm_mcp_[\w-]{8}/.test(el.textContent)) el.textContent = el.textContent.replace(/hm_mcp_[\w-]+/g, 'hm_mcp_••••••••••••');
  }
}).observe(document, {subtree: true, childList: true, characterData: true}));
await login(p, 'professor-demo');
await p.addStyleTag({content: '#ai-token-value{filter:blur(5px)}'});
await p.locator('[data-workspace-link="profile"]:visible').first().click(); await p.waitForTimeout(1200);
await p.locator('#ai-connect-title').scrollIntoViewIfNeeded();
await p.evaluate(() => window.scrollBy(0, -80)); await p.waitForTimeout(500);
let token;
const dir = await cast(p, 'habla-connect-ai', async () => {
  await p.waitForTimeout(1000);
  await p.locator('#ai-token-label').click(); await p.keyboard.type('Claude Code no notebook', {delay: 55});
  await p.waitForTimeout(500); await p.locator('#ai-token-create').click();
  await p.locator('#ai-token-created').waitFor(); await p.waitForTimeout(600);
  await p.evaluate(() => document.getElementById('ai-token-created').scrollIntoView({behavior: 'smooth', block: 'center'}));
  await p.waitForTimeout(3500);
  token = (await p.locator('#ai-token-value').textContent()).trim();
});
if (process.env.TOKEN_OUT) writeFileSync(process.env.TOKEN_OUT, token, {mode: 0o600});
await b.close();
encode(dir, `${SHOTS}/habla-mucho/connect-ai`, {width: 960, speed: 1.1, poster: 99});
