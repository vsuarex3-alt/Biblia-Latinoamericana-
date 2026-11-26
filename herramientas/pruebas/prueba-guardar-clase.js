/* Botón «Guardar» de la clase: la clase guardada queda solo con su cuadro de título y se abre
   en automático una clase nueva con el cursor listo para escribir su tema.
   Uso: (cd biblia-app && python3 -m http.server 8765) y node herramientas/pruebas/prueba-guardar-clase.js [captura1.png captura2.png] */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
  let fallos = 0; const ver = (ok, txt) => { console.log((ok ? '  ✔ ' : '  ✘ ') + txt); if (!ok) fallos++; };
  await p.goto('http://localhost:8765/'); await p.evaluate(() => localStorage.clear()); await p.reload();
  const buscar = async q => { await p.fill('#q', q); await p.press('#q', 'Enter'); await p.waitForTimeout(300); };
  const grupos = () => p.$$eval('.day', ds => ds.map(d => ({ nombre: d.querySelector('.name').value, n: d.querySelectorAll('.entry').length, cnt: d.querySelector('.cnt').textContent,
    plegada: d.classList.contains('plegada'), activo: d.classList.contains('activo'), guardada: !!d.querySelector('.guardada-ok') })));
  await buscar('Jer 13,20-22'); await buscar('Prov 19,18');
  await p.click('#tabHist'); await p.waitForSelector('[data-a=guardar]');
  await p.fill('.day.activo .name', 'Corrección fraterna'); await p.press('.day.activo .name', 'Enter');
  await p.click('[data-a=guardar]'); await p.waitForTimeout(400);
  let g = await grupos();
  ver(g.length === 2, 'quedan 2 clases: la guardada y una nueva');
  ver(g[0].activo && g[0].n === 0 && !g[0].guardada, 'arriba está la clase nueva, vacía y activa');
  ver(g[1].guardada && g[1].plegada && g[1].n === 0 && g[1].cnt.startsWith('2'), 'la guardada solo muestra su título («2 citas», sin la lista)');
  ver(g[1].nombre === 'Corrección fraterna', 'la guardada conserva su nombre');
  const foco = await p.evaluate(() => { const a = document.activeElement; return a && a.classList.contains('name') && a.closest('.day').classList.contains('activo') && a.selectionEnd - a.selectionStart === a.value.length; });
  ver(foco, 'el cursor queda en el título de la clase nueva, listo para escribir');
  if (process.argv[2]) await p.screenshot({ path: process.argv[2] });
  await p.keyboard.type('Los sacramentos'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  await buscar('Jn 3,16'); await p.click('#tabHist'); await p.waitForTimeout(300);
  g = await grupos();
  ver(g[0].nombre === 'Los sacramentos' && g[0].n === 1, 'lo escrito queda como tema y Jn 3,16 se guarda ahí');
  ver(g[1].plegada && g[1].cnt.startsWith('2'), 'la clase guardada no cambió');
  await p.click('.day.plegada [data-a=ver]'); await p.waitForTimeout(200);
  g = await grupos();
  ver(!g[1].plegada && g[1].n === 2, '«Ver citas» muestra sus 2 citas');
  if (process.argv[3]) await p.screenshot({ path: process.argv[3], fullPage: true });
  await p.click('.day:not(.activo) [data-a=usar]'); await p.waitForTimeout(200); await buscar('Sal 23');
  await p.click('#tabHist'); await p.waitForTimeout(300); g = await grupos();
  ver(g.some(x => x.activo && x.nombre === 'Corrección fraterna' && x.n === 3), '«Seguir esta clase» la vuelve a abrir y Sal 23 se guarda ahí');
  console.log('fallos:', fallos, '| errores de la página:', err);
  await b.close();
})();
