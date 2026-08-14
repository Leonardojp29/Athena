import { chromium } from '@playwright/test';
/* Sin barras superpuestas, que en headless no ocupan ancho y no dejan medir nada. */
const nav = await chromium.launch({ args: ['--disable-features=OverlayScrollbar'] });
const p = await (await nav.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
await p.goto('http://localhost:4321/competencias/conmebol-libertadores', { waitUntil: 'networkidle' });
console.log(await p.evaluate(() => {
  const lista = document.querySelector('[data-ronda-panel]:not([hidden]) [data-lista]');
  const pseudo = (el) => getComputedStyle(el, '::-webkit-scrollbar').width;
  return {
    lista: { ocupa: lista.offsetWidth - lista.clientWidth, pseudo: pseudo(lista), desborda: lista.scrollHeight > lista.clientHeight },
    documento: { ocupa: window.innerWidth - document.documentElement.clientWidth, pseudo: pseudo(document.documentElement) },
  };
}));
await p.goto('http://localhost:4321/?liga=primera-division', { waitUntil: 'networkidle' });
console.log('riel:', await p.evaluate(() => {
  const el = document.querySelector('.barra-fina');
  return el ? { ocupa: el.offsetWidth - el.clientWidth, pseudo: getComputedStyle(el, '::-webkit-scrollbar').width, desborda: el.scrollHeight > el.clientHeight } : 'sin barra-fina';
}));
await nav.close();
