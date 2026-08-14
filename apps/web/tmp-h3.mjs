import { chromium } from '@playwright/test';
const S = '/tmp/claude-1000/-home-leonardo-personal-athenea/ec569081-26c2-4512-a7f0-074d84384203/scratchpad';
const nav = await chromium.launch();
const p = await (await nav.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
await p.goto('http://localhost:4321/partidos/3f5f9bb6-1c11-4958-9f4c-b5c512971eee?vista=historial', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
await p.locator('section', { has: p.getByRole('heading', { name: 'Cara a cara' }) }).screenshot({ path: `${S}/k2-balanza.png` });
await nav.close();
