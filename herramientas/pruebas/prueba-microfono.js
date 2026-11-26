/* Prueba del micrófono de punta a punta, como en un iPhone:
   Chromium con un micrófono falso que "dice" un archivo .wav → la app graba, lo entiende con Whisper
   dentro del navegador y busca la cita.
   Uso: (cd biblia-app && python3 -m http.server 8765) y luego
        node herramientas/pruebas/prueba-microfono.js carpeta-con-wav  (cada archivo: N.wav con N en ESPERADO)  */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const carpeta = process.argv[2];
const ESPERADO = JSON.parse(fs.readFileSync(path.join(carpeta, 'esperado.json'), 'utf8'));
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
(async () => {
  let bien = 0, total = 0;
  for (const [archivo, esperado] of Object.entries(ESPERADO)) {
    const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
      '--use-file-for-fake-audio-capture=' + path.resolve(carpeta, archivo)] });
    const ctx = await b.newContext({ userAgent: IPHONE, viewport: { width: 390, height: 844 }, permissions: ['microphone'] });
    const p = await ctx.newPage();
    const errores = []; p.on('pageerror', e => errores.push(e.message));
    p.on('dialog', d => d.accept());
    await p.goto('http://localhost:8765/');
    await p.waitForSelector('#mic:not([hidden])');
    const t0 = Date.now();
    await p.click('#mic');
    const vistos = new Set();
    let titulo = '';
    for (let i = 0; i < 240; i++) {
      await p.waitForTimeout(500);
      const l = (await p.textContent('#live')) || ''; if (l && !vistos.has(l.replace(/\d+ %/, ''))) { vistos.add(l.replace(/\d+ %/, '')); }
      titulo = await p.evaluate(() => { const h = document.querySelector('#main h2, #main .ref-title, #main .res-head'); return h ? h.textContent.trim() : ''; });
      const q = await p.inputValue('#q');
      if (q && titulo) break;
    }
    const q = await p.inputValue('#q');
    total++;
    const ok = titulo.replace(/\s/g, "").toLowerCase().startsWith(esperado.replace(/\s/g, "").replace(/al/g,"-").toLowerCase()) || q.replace(/\s/g, "").toLowerCase() === esperado.replace(/\s/g, "").toLowerCase();
    if (ok) bien++;
    const oido = await p.evaluate(() => window.__vozOido || ""); console.log(`${ok ? 'BIEN' : 'MAL '}  ${archivo}  esperado «${esperado}»  escribió «${q}»  título «${titulo.slice(0, 60)}»  (Whisper oyó «${oido}»)  ${Math.round((Date.now() - t0) / 1000)} s` + (errores.length ? '  ERRORES: ' + errores.join(' | ') : ''));
    if (process.env.VER) console.log('   mensajes:', [...vistos].join(' / '));
    await b.close();
  }
  console.log(`\n${bien} de ${total} citas entendidas exactamente`);
})();
