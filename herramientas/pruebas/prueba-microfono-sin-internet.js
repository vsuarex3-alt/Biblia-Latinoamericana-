/* El micrófono funciona sin internet después de la primera vez:
   1) con internet: dictar (descarga el reconocedor y queda guardado);  2) sin internet: recargar y volver a dictar.
   Uso: (cd biblia-app && python3 -m http.server 8765) y node herramientas/pruebas/prueba-microfono-sin-internet.js audio.wav carpeta-capturas */
const { chromium } = require('playwright');
const path = require('path');
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
(async () => {
  const [wav, capturas] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + path.resolve(wav)] });
  const ctx = await b.newContext({ userAgent: IPHONE, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, permissions: ['microphone'] });
  const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
  let dialogos = 0; p.on('dialog', d => { dialogos++; d.accept(); });
  const dictar = async (nombre) => {
    await p.fill('#q', ''); await p.click('#mic');
    await p.waitForTimeout(1500); if (capturas) await p.screenshot({ path: path.join(capturas, nombre + '-escuchando.png') });
    await p.waitForFunction(() => document.querySelector('#q').value && !document.querySelector('#mic').classList.contains('on') && !/Entendiendo|Descargando/.test(document.querySelector('#live').textContent), null, { timeout: 120000 });
    await p.waitForTimeout(400); if (capturas) await p.screenshot({ path: path.join(capturas, nombre + '-resultado.png') });
    return p.inputValue('#q');
  };
  await p.goto('http://localhost:8765/'); await p.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 20000 }).catch(() => p.reload());
  await p.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 20000 });
  console.log('con internet →', await dictar('1'), '| avisos de descarga:', dialogos);
  const cache = await p.evaluate(async () => { const c = await caches.open('biblia-voz-1'); return (await c.keys()).map(r => r.url.split('/voz/')[1]); });
  console.log('guardado en el teléfono:', cache.join(', '));
  await ctx.setOffline(true);
  await p.reload(); await p.waitForSelector('#mic:not([hidden])');
  console.log('sin internet →', await dictar('2'), '| avisos de descarga:', dialogos, '| errores:', err.length ? err : 'ninguno');
  await b.close();
})();
