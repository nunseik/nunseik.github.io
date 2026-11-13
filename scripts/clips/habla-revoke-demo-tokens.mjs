// Cleanup after habla-connect-ai.mjs: revokes every "Claude Code no notebook" token of professor-demo
// (each take creates one; the limit is 5). KEEP_LAST4=abcd keeps the one still in use.
import {chromium} from './cast.mjs';
import {login} from './habla-platform.mjs';
const b = await chromium.launch(); const p = await b.newPage();
await login(p, 'professor-demo');
await p.locator('[data-workspace-link="profile"]:visible').first().click(); await p.waitForTimeout(1500);
for (;;) {
  const rows = p.locator('#ai-token-list > li').filter({hasText: 'Claude Code no notebook'});
  const keep = process.env.KEEP_LAST4;
  const target = keep ? rows.filter({hasNotText: keep}) : rows;
  if (!(await target.count())) break;
  await target.first().getByRole('button', {name: 'Revogar'}).click();
  await p.locator('#ai-token-list').getByRole('button').filter({hasText: /^(Sim|Revogar agora|Confirmar)/}).first().click();
  await p.waitForTimeout(800);
}
console.log(await p.locator('#ai-token-count').textContent());
await b.close();
