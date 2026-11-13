// Student on a phone: Baralhos → "La comida" → study a few cards (reveal, rate). The deck is the student's own,
// imported from a CSV (Baralho;Versão;Frente;Verso). Each take records real reviews for aluno-demo.
import {chromium, cast, encode, SHOTS} from './cast.mjs';
import {login, hideSmoke} from './habla-platform.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true})).newPage();
await hideSmoke(p); await login(p, 'aluno-demo');
const nav = async (k) => { const link = p.locator(`[data-workspace-link="${k}"]:visible`).first(); if (!(await link.count())) await p.getByRole('button', {name: /menu/i}).first().click(); await p.locator(`[data-workspace-link="${k}"]:visible`).first().click(); };
await nav('cards'); await p.waitForTimeout(1500);
const dir = await cast(p, 'habla-flashcards', async () => {
  await p.waitForTimeout(1000);
  await p.locator('#flashcard-list').getByText('La comida', {exact: true}).first().click(); await p.waitForTimeout(1200);
  await p.locator('#flashcard-deck-study').click(); await p.waitForTimeout(1300);
  for (let i = 0; i < 3; i++) {
    await p.getByRole('button', {name: 'Revelar verso'}).click(); await p.waitForTimeout(1300);
    const rate = p.locator('button:visible').filter({hasText: /^(Bom|Fácil|Lembrei|Acertei)/});
    if (i === 0) console.log('rating buttons:', await p.$$eval('button:visible', bs => bs.map(b => b.innerText.trim()).join(' | ')));
    await rate.first().click(); await p.waitForTimeout(1000);
  }
  await p.waitForTimeout(800);
});
await b.close();
encode(dir, `${SHOTS}/habla-mucho/flashcards`, {width: 540, speed: 1.1, poster: 3});
