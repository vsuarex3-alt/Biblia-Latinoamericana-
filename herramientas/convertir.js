/* Convierte el PDF de La Biblia Latinoamérica en biblia-app/js/datos-biblia.js
   usando exactamente el mismo analizador que tu buscador (analizador-biblia.js).
   No corrige ni cambia el texto: lo copia tal como lo extrae el analizador.

   Uso:  cd herramientas && npm install && node convertir.js "ruta/al/La-Biblia-Latinoamericana.pdf"
*/
const fs = require('fs');
const path = require('path');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
const P = require('./analizador-biblia.js');


/* Cuando un número de versículo viene a mitad de línea y fuera de orden, el analizador deja ese
   versículo pegado al anterior («…la tierra.» 11 Le volví…). Aquí se separa: solo se mueve el
   número a su lugar; las palabras quedan exactamente iguales y en el mismo orden del PDF.
   Solo para números que faltan en el capítulo y caben en él, después de fin de frase y antes de
   mayúscula o comillas. «11-12» queda como un solo versículo. */
let separados = 0;
const REF = require('./versificacion-nab.json');
function separarPegados(vs, maxRef) {
  const presentes = new Set();
  vs.forEach(v => String(v.n).split('-').forEach(x => presentes.add(+x)));
  const out = [];
  for (const v of vs) {
    let actual = { n: v.n, t: '' };
    const partes = v.t.split(' ');
    let buf = [];
    for (let i = 0; i < partes.length; i++) {
      const m = partes[i].match(/^(\d{1,3})(?:-(\d{1,3}))?$/);
      const sig = partes[i + 1] || '';
      const ant = buf.length ? buf[buf.length - 1] : '';
      const desde = m ? +m[1] : 0, hasta = m ? (m[2] ? +m[2] : +m[1]) : 0;
      if (m && buf.length && !presentes.has(desde) && hasta <= maxRef && hasta >= desde &&
          /[.;:!?»”")]$/.test(ant) && /^[«¿¡"“A-ZÁÉÍÓÚÑ]/.test(sig)) {
        actual.t = buf.join(' '); out.push(actual); buf = [];
        actual = { n: m[2] ? m[1] + '-' + m[2] : desde, t: '' };
        for (let k = desde; k <= hasta; k++) presentes.add(k);
        separados++;
        continue;
      }
      buf.push(partes[i]);
    }
    actual.t = buf.join(' ');
    out.push(actual);
  }
  return out;
}

/* Palabras partidas por un espacio de más en el PDF («Is rael» → «Israel»).
   Solo se unen dos pedazos cuando: la palabra completa aparece al menos 2 veces en el resto
   del texto, uno de los pedazos casi nunca aparece suelto (o mucho menos que la palabra
   completa) y ninguno es una palabra común frente a una palabra completa rara
   (así «yo sucedí a mi padre» o «el evan gelista» no se tocan). No se cambia ninguna
   letra: solo se quita el espacio. La lista queda en palabras-unidas.txt para revisarla. */
function unirPartidas(libros) {
  const pre = /^[«¿¡"“(\[‘]+/, post = /[»?!"”)\],.;:’…]+$/;
  const limpiar = w => w.replace(pre, '').replace(post, '').toLowerCase();
  const freq = new Map(), pares = new Map(), trios = new Map();
  const suma = (m, k) => m.set(k, (m.get(k) || 0) + 1);
  libros.forEach(l => l.capitulos.forEach(c => c.versiculos.forEach(v => {
    const w = v.t.split(' ').map(limpiar);
    w.forEach((x, i) => { if (!x) return; suma(freq, x); if (w[i + 1]) suma(pares, x + ' ' + w[i + 1]); if (w[i + 1] && w[i + 2]) suma(trios, x + ' ' + w[i + 1] + ' ' + w[i + 2]); });
  })));
  const f = k => freq.get(k) || 0;
  const letras = x => /^\p{L}+$/u.test(x);
  const unidas = [];
  libros.forEach(l => l.capitulos.forEach(c => c.versiculos.forEach(v => {
    const w = v.t.split(' '), out = [];
    for (let i = 0; i < w.length; i++) {
      const a = w[i].replace(pre, ''), b = (w[i + 1] || ''), c2 = (w[i + 2] || '');
      const al = a.toLowerCase();
      // tres pedazos: «to ma ron» → «tomaron»
      const b3 = b, c3 = c2.replace(post, '');
      if (letras(a) && letras(b3) && letras(c3)) {
        const j = (a + b3 + c3).toLowerCase(), n = trios.get(al + ' ' + b3.toLowerCase() + ' ' + c3.toLowerCase()) || 0;
        const sueltos = [al, b3.toLowerCase(), c3.toLowerCase()].filter(x => f(x) - n <= 1).length;
        if (f(j) >= 2 && sueltos >= 2 && Math.max(f(al), f(b3.toLowerCase()), f(c3.toLowerCase())) <= f(j) * 10) {
          unidas.push(`${l.nombre} ${c.numero}:${v.n}\t${a} ${b3} ${c3} → ${a}${b3}${c3}`);
          out.push(w[i] + w[i + 1] + w[i + 2]); i += 2; continue;
        }
      }
      // dos pedazos: «Is rael» → «Israel»
      const b2 = b.replace(post, '');
      if (letras(a) && letras(b2)) {
        const bl = b2.toLowerCase(), j = al + bl, n = pares.get(al + ' ' + bl) || 0;
        // el pedazo raro no debe aparecer suelto en ninguna otra parte
        if (f(j) >= 2 && Math.min(f(al) - n, f(bl) - n) <= 1 && Math.max(f(al), f(bl)) <= f(j) * 10) {
          unidas.push(`${l.nombre} ${c.numero}:${v.n}\t${a} ${b2} → ${a}${b2}`);
          out.push(w[i] + w[i + 1]); i++; continue;
        }
      }
      out.push(w[i]);
    }
    v.t = out.join(' ');
  })));
  return unidas;
}

(async () => {
  const archivo = process.argv[2];
  if (!archivo) { console.error('Indica la ruta del PDF.'); process.exit(1); }
  const datos = new Uint8Array(fs.readFileSync(archivo));
  const doc = await pdfjs.getDocument({ data: datos, disableFontFace: true, isEvalSupported: false, verbosity: 0 }).promise;
  const st = P.newStateRef(require('./versificacion-nab.json')), N = doc.numPages;
  for (let p = 1; p <= N; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    P.parsePage(tc.items, p, st);
    page.cleanup();
    if (p % 100 === 0 || p === N) process.stdout.write(`\rPágina ${p} de ${N}${st.book ? ' · ' + st.book.name : ''}        `);
  }
  const r = P.finish(st);
  await doc.destroy();
  console.log(`\nLibros encontrados: ${r.books.length}`);

  const orden = {}; P.BOOKS.forEach((b, i) => { orden[b[0]] = i; });
  const inicioNT = orden.mt;
  const libros = r.books
    .slice()
    .sort((a, b) => orden[a.id] - orden[b.id])
    .map(b => ({
      id: b.id,
      nombre: b.name,
      testamento: orden[b.id] < inicioNT ? 'AT' : 'NT',
      alias: P.BOOKS[orden[b.id]][2],
      capitulos: b.chapters.map(c => ({
        numero: c.n,
        versiculos: separarPegados(c.v.map(v => ({ n: v[0], t: v[1] })), (REF[b.id] || [])[c.n - 1] || 0)
      }))
    }));

  const unidas = unirPartidas(libros);
  fs.writeFileSync(path.join(__dirname, 'palabras-unidas.txt'), unidas.join('\n') + '\n');
  console.log('Palabras partidas unidas: ' + unidas.length + ' (ver herramientas/palabras-unidas.txt)');

  // Correcciones manuales de palabras partidas (revisadas una por una en contexto)
  const manuales = JSON.parse(fs.readFileSync(path.join(__dirname, 'correcciones-manuales.json'), 'utf8'));
  let nManual = 0;
  const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const reglas = manuales.map(m => ({ re: new RegExp('(^|[\\s«¿¡"“(\\[‘])' + esc(m.de) + '(?=$|[\\s»?!"”),.;:’…\\]])', 'g'), a: m.a, de: m.de, n: 0 }));
  libros.forEach(l => l.capitulos.forEach(c => c.versiculos.forEach(v => {
    for (const r of reglas) v.t = v.t.replace(r.re, (_, p) => { r.n++; nManual++; return p + r.a; });
  })));
  fs.writeFileSync(path.join(__dirname, 'correcciones-aplicadas.txt'), reglas.map(r => `${r.n}\t${r.de} → ${r.a}`).join('\n') + '\n');
  console.log('Correcciones manuales aplicadas: ' + nManual);

  // Versículos agregados a mano (desde la Biblia impresa), marcados con a:1
  const archivoAgregados = path.join(__dirname, 'versiculos-agregados.json');
  let agregados = 0;
  if (fs.existsSync(archivoAgregados)) {
    for (const x of JSON.parse(fs.readFileSync(archivoAgregados, 'utf8'))) {
      if (!x.t || !x.t.trim()) continue;
      const l = libros.find(b => b.id === x.libro); if (!l) continue;
      let ch = l.capitulos.find(c => c.numero === x.cap);
      if (!ch) { ch = { numero: x.cap, versiculos: [] }; l.capitulos.push(ch); l.capitulos.sort((a, b) => a.numero - b.numero); }
      if (ch.versiculos.some(v => String(v.n) === String(x.v))) continue;
      ch.versiculos.push({ n: x.v, t: x.t.trim(), a: 1 });
      ch.versiculos.sort((a, b) => parseInt(a.n) - parseInt(b.n));
      agregados++;
    }
  }
  if (agregados) console.log('Versículos agregados a mano: ' + agregados);
  let totalV = 0; libros.forEach(l => l.capitulos.forEach(c => { totalV += c.versiculos.length; }));
  const faltan = P.BOOKS.filter(b => !libros.some(l => l.id === b[0])).map(b => b[1]);
  console.log(`Versículos: ${totalV} (separados ${separados} que estaban pegados)`);
  if (faltan.length) console.log('Libros no encontrados: ' + faltan.join(', '));
  if (r.anomalies.length) console.log(`Avisos del analizador: ${r.anomalies.length} (ver herramientas/avisos.txt)`);
  fs.writeFileSync(path.join(__dirname, 'avisos.txt'), r.anomalies.join('\n') + '\n');

  const salida = path.join(__dirname, '..', 'biblia-app', 'js', 'datos-biblia.js');
  fs.writeFileSync(salida,
    '/* Texto de La Biblia Latinoamérica, extraído del PDF con el analizador de tu buscador. No editar a mano. */\n' +
    'window.BIBLIA = ' + JSON.stringify({ titulo: 'Biblia Latinoamericana', libros }) + ';\n');
  console.log('Guardado en ' + salida);
})().catch(e => { console.error(e); process.exit(1); });
