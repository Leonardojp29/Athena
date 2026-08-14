import { chromium } from '@playwright/test';
const S = '/tmp/claude-1000/-home-leonardo-personal-athenea/ec569081-26c2-4512-a7f0-074d84384203/scratchpad';
const id = '3f5f9bb6-1c11-4958-9f4c-b5c512971eee';
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 1600, height: 1000 } });
const p = await ctx.newPage();
await p.goto(`http://localhost:4321/partidos/${id}?vista=historial`, { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
await p.locator('main section').first().screenshot({ path: `${S}/k1-balanza.png` });
await p.goto(`http://localhost:4321/partidos/${id}`, { waitUntil: 'networkidle' });
await p.locator('main aside section').filter({ hasText: 'Historial' }).first().screenshot({ path: `${S}/k1-riel.png` });
/* Y el móvil, que es donde la fila de cruces se apila. */
const m = await (await nav.newContext({ viewport: { width: 390, height: 900 } })).newPage();
await m.goto(`http://localhost:4321/partidos/${id}?vista=historial`, { waitUntil: 'networkidle' });
await m.waitForTimeout(400);
await m.screenshot({ path: `${S}/k1-movil.png` });
await nav.close();
