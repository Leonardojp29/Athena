import { chromium } from '@playwright/test';
const S = '/tmp/claude-1000/-home-leonardo-personal-athenea/ec569081-26c2-4512-a7f0-074d84384203/scratchpad';
const nav = await chromium.launch();
const p = await (await nav.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
/* Un clásico con historia: se busca el partido más reciente entre dos grandes. */
const r = await fetch('http://localhost:3001/v1/views/competition/primera-division').then((x) => x.json());
const cruce = r.porRonda.flatMap((x) => x.partidos).find((m) => ['alianza-lima','universitario','sporting-cristal'].includes(m.homeTeam.slug) && ['alianza-lima','universitario','sporting-cristal'].includes(m.awayTeam.slug));
const id = cruce?.id ?? r.porRonda[0].partidos[0].id;
console.log('partido:', cruce?.homeTeam.name, 'vs', cruce?.awayTeam.name, id);
await p.goto(`http://localhost:4321/partidos/${id}?vista=historial`, { waitUntil: 'networkidle' });
await p.waitForTimeout(600);
await p.screenshot({ path: `${S}/i1-historial.png`, fullPage: true });
await p.goto(`http://localhost:4321/partidos/${id}`, { waitUntil: 'networkidle' });
await p.locator('main aside section').filter({ hasText: 'Historial' }).first().screenshot({ path: `${S}/i1-riel.png` });
await nav.close();
