// Shared helpers for the local Habla Mucho platform (scripts/run-platform.sh on :8770, Keycloak demo realm).
// SMOKE matches the dev database's smoke-test leftovers; hideSmoke() filters them out of list responses while
// recording, so nothing has to be deleted.
export const BASE = 'http://127.0.0.1:8770';
export const SMOKE = /\d{10,}|smoke|diagn[oó]stico mv|valida[cç][aã]o local|rascunho local|preservad|demonstra[cç][aã]o 0000/i;

export async function login(page, who) {
  await page.goto(BASE); await page.getByRole('button', {name: 'Entrar', exact: true}).click();
  await page.locator('#username').fill(who); await page.locator('#password').fill('local-demo-only'); await page.locator('#kc-login').click();
  await page.getByRole('button', {name: 'Sair', exact: true}).waitFor();
}

const dropSmoke = (value) => {
  if (Array.isArray(value)) return value.filter(item => !(item && typeof item === 'object' && SMOKE.test(JSON.stringify(Object.values(item).filter(v => typeof v === 'string'))))).map(dropSmoke);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, dropSmoke(v)]));
  return value;
};
export async function hideSmoke(page) {
  await page.route(url => url.origin === BASE, async route => {
    const req = route.request();
    if (!['fetch', 'xhr'].includes(req.resourceType())) return route.fallback(); // POSTs return lists too
    const res = await route.fetch();
    if (!(res.headers()['content-type'] || '').includes('json')) return route.fulfill({response: res});
    route.fulfill({response: res, json: dropSmoke(await res.json())});
  });
}
