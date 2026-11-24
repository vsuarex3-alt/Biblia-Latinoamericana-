/* Revisión de integridad: compara la Biblia extraída con una versificación católica estándar
   (NAB, versificacion-nab.json) y busca en el PDF cada versículo que falte.
   Uso: node analizar.js "ruta/al/PDF.pdf"   → escribe analisis.json */
const fs = require('fs');
const path = require('path');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
const P = require('./analizador-biblia.js');
const REF = require('./versificacion-nab.json');

function lineas(items) {
  const its = items.filter(i => i.str.trim()).map(i => ({ s: i.str, y: i.transform[5], x: i.transform[4], w: i.width || 0 }));
  its.sort((a, b) => (b.y - a.y) || (a.x - b.x));
  const out = []; let L = null;
  for (const it of its) {
    if (!L || Math.abs(L.y - it.y) > 3) { L = { y: it.y, parts: [] }; out.push(L); }
    L.parts.push(it);
  }
  return out.map(L => {
    L.parts.sort((a, b) => a.x - b.x);
    let s = '', end = null;
    for (const p of L.parts) { s += (end !== null && p.x - end > 1.2 ? ' ' : '') + p.s; end = p.x + p.w; }
    return { y: Math.round(L.y), t: s.replace(/\s+/g, ' ').trim() };
  });
}

(async () => {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(process.argv[2])), disableFontFace: true, isEvalSupported: false, verbosity: 0 }).promise;
  const st = P.newStateRef(require('./versificacion-nab.json')), paginas = [null];
  for (let p = 1; p <= doc.numPages; p++) {
    const pg = await doc.getPage(p); const tc = await pg.getTextContent();
    paginas.push(lineas(tc.items));
    P.parsePage(tc.items, p, st); pg.cleanup();
  }
  const r = P.finish(st);
  const resultado = [];
  for (const b of r.books) {
    const ref = REF[b.id];
    const caps = {}; b.chapters.forEach(c => { caps[c.n] = c; });
    for (let c = 1; c <= ref.length; c++) {
      const ch = caps[c];
      if (!ch) { resultado.push({ libro: b.id, nombre: b.name, cap: c, tipo: 'capitulo', esperado: ref[c - 1] }); continue; }
      const tiene = new Set(ch.v.map(v => v[0]));
      const max = Math.max(ref[c - 1], ...ch.v.map(v => v[0]));
      for (let k = 1; k <= max; k++) {
        if (tiene.has(k)) continue;
        // páginas donde debería estar: entre el versículo anterior y el siguiente presentes
        const ant = ch.v.filter(v => v[0] < k).pop(), sig = ch.v.find(v => v[0] > k);
        const p1 = ant ? ant[2] : (sig ? sig[2] : b.page), p2 = sig ? sig[2] : (ant ? ant[2] + 1 : p1);
        const hallazgos = [];
        for (let p = p1; p <= Math.min(p2, doc.numPages); p++) {
          paginas[p].forEach((L, i) => {
            if (new RegExp('(^|[\\s.,;:!?»”")(])' + k + '(?=$|[\\s«¿¡"“A-Za-zÁÉÍÓÚÑáéíóúñ(])').test(L.t)) {
              hallazgos.push({ p, y: L.y, linea: L.t, sig: (paginas[p][i + 1] || {}).t || '' });
            }
          });
        }
        resultado.push({
          libro: b.id, nombre: b.name, cap: c, v: k, tipo: k > ref[c - 1] ? 'extra' : 'versiculo',
          paginas: [p1, p2], antes: ant ? ant[1].slice(-120) : '', despues: sig ? sig[1].slice(0, 80) : '', hallazgos
        });
      }
    }
  }
  const rangos = {};
  r.books.forEach(b => { let max = b.page; b.chapters.forEach(c => c.v.forEach(v => { if (v[2] > max) max = v[2]; })); rangos[b.id] = [b.page, max]; });
  fs.writeFileSync(path.join(__dirname, 'paginas-libros.json'), JSON.stringify(rangos));
  fs.writeFileSync(path.join(__dirname, 'analisis.json'), JSON.stringify(resultado, null, 1));
  fs.writeFileSync('/tmp/claude-0/-home-user-NOVIEMBRE/74072619-4532-585b-b277-53804acc04a4/scratchpad/paginas.json', JSON.stringify(paginas));
  const caps = resultado.filter(x => x.tipo === 'capitulo'), vs = resultado.filter(x => x.tipo === 'versiculo');
  console.log('Capítulos faltantes:', caps.map(x => x.nombre + ' ' + x.cap).join(', ') || 'ninguno');
  console.log('Versículos faltantes frente a la referencia:', vs.length, '| con el número visible en el PDF:', vs.filter(x => x.hallazgos.length).length);
})().catch(e => { console.error(e); process.exit(1); });
