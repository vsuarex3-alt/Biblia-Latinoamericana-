/* Botón «Guardar clase»: guarda la clase y la siguiente cita empieza una clase nueva.
   Uso: (cd biblia-app && python3 -m http.server 8765) y node herramientas/pruebas/prueba-guardar-clase.js [captura.png] */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
  let fallos = 0; const ver = (ok, txt) => { console.log((ok ? '  ✔ ' : '  ✘ ') + txt); if (!ok) fallos++; };
  await p.goto('http://localhost:8765/'); await p.evaluate(() => localStorage.clear()); await p.reload();
  const buscar = async q => { await p.fill('#q', q); await p.press('#q', 'Enter'); await p.waitForTimeout(300); };
  await buscar('Jer 13,20-22'); await buscar('Prov 19,18');
  await p.click('#tabHist');
  await p.waitForSelector('[data-a=guardar]');
  ver(await p.locator('.day').count() === 1, 'hay 1 clase con 2 citas');
  if (process.argv[2]) await p.screenshot({ path: process.argv[2] });
  await p.click('[data-a=guardar]'); await p.waitForTimeout(300);
  ver(await p.locator('.guardada-ok').count() === 1, 'la clase aparece «✓ Guardada»');
  await buscar('Jn 3,16');
  await p.click('#tabHist'); await p.waitForTimeout(300);
  const grupos = await p.$$eval('.day', ds => ds.map(d => ({ n: d.querySelectorAll('.entry').length, guardada: !!d.querySelector('.guardada-ok'), activo: d.classList.contains('activo') })));
  ver(grupos.length === 2, 'Jn 3,16 empezó una clase nueva (2 clases)');
  ver(grupos.some(g => g.activo && g.n === 1 && !g.guardada), 'la clase nueva tiene 1 cita y es la activa');
  ver(grupos.some(g => g.guardada && g.n === 2), 'la clase guardada sigue con sus 2 citas');
  await p.click('[data-a=usar]'); await p.waitForTimeout(300); await buscar('Sal 23');
  await p.click('#tabHist'); await p.waitForTimeout(300);
  const g2 = await p.$$eval('.day', ds => ds.map(d => ({ n: d.querySelectorAll('.entry').length, activo: d.classList.contains('activo') })));
  ver(g2.some(g => g.activo && g.n === 3), '«Seguir esta clase» la vuelve a abrir y Sal 23 se guarda ahí');
  if (process.argv[3]) await p.screenshot({ path: process.argv[3] });
  console.log('fallos:', fallos, '| errores de la página:', err);
  await b.close();
})();
