/* Evangelio del día dentro de la app: lee evangelio.json y muestra el texto de la Biblia Latinoamericana.
   Uso: (cd biblia-app && python3 -m http.server 8765) y node herramientas/pruebas/prueba-evangelio.js [captura.png] */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const datos = JSON.parse(fs.readFileSync(path.join(__dirname, '../../biblia-app/evangelio.json'), 'utf8'));
  const dia = Object.keys(datos.dias).sort().pop();
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'America/Mexico_City' });
  const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
  await p.addInitScript(d => { const R = Date; const t = new R(d + 'T12:00:00-06:00').getTime(); globalThis.Date = class extends R { constructor(...a) { super(...(a.length ? a : [t])); } static now() { return t; } }; }, dia);
  let fallos = 0; const ver = (ok, txt) => { console.log((ok ? '  ✔ ' : '  ✘ ') + txt); if (!ok) fallos++; };
  await p.goto('http://localhost:8765/'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForFunction(c => (document.querySelector('#evgCard') || {}).textContent?.includes(c), datos.dias[dia].evangelio.cita, { timeout: 8000 }).catch(() => {});
  ver((await p.textContent('#evgCard')).includes(datos.dias[dia].evangelio.cita), `la portada muestra «${datos.dias[dia].evangelio.cita}» (${dia})`);
  await p.click('#tabEvg'); await p.waitForSelector('#evgRef');
  const txt = await p.textContent('#main .hit .txt');
  ver(txt && txt.length > 100, 'el Evangelio aparece completo en la pestaña: «' + txt.replace(/\s+/g, ' ').slice(0, 70) + '…»');
  ver(await p.locator('.evg-otra[data-q]').count() >= 1, 'aparecen las otras lecturas del día');
  if (process.argv[2]) await p.screenshot({ path: process.argv[2], fullPage: true });
  await p.click('#evgGuardar'); await p.waitForTimeout(200);
  const hist = await p.evaluate(() => JSON.parse(localStorage.getItem('blat-hist') || '{}'));
  ver(Object.values(hist.entries || {}).length === 1, '«Guardar en mi clase» lo guarda en el historial');
  await p.click('.evg-otra[data-q]'); await p.waitForTimeout(300);
  ver(/\d/.test(await p.textContent('#main h2')), 'la primera lectura abre: ' + (await p.textContent('#main h2')));
  console.log('fallos:', fallos, '| errores de la página:', err);
  await b.close();
})();
