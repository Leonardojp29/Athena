import { chromium } from '@playwright/test';
const S = '/tmp/claude-1000/-home-leonardo-personal-athenea/ec569081-26c2-4512-a7f0-074d84384203/scratchpad';
const nav = await chromium.launch();
for (const objetivo of process.argv.slice(2)) {
  const [nombre, url, ancho = '1600', alto = '1000', sel] = objetivo.split('|');
  const ctx = await nav.newContext({ viewport: { width: +ancho, height: +alto } });
  const p = await ctx.newPage();
  await p.goto(`http://localhost:4321${url}`, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(600);
  if (sel) await p.locator(sel).first().screenshot({ path: `${S}/${nombre}.png` });
  else await p.screenshot({ path: `${S}/${nombre}.png` });
  console.log(nombre);
  await ctx.close();
}
await nav.close();
