/* Prueba de cobertura: revisa que cada línea del PDF (dentro de cada libro) esté en el texto de la app.
   Las líneas que no aparecen son títulos, introducciones o comentarios... o texto bíblico perdido.
   Uso: node cobertura.js paginas.json   (paginas.json lo genera analizar.js) */
const fs = require('fs');
global.window = {};
require('../biblia-app/js/datos-biblia.js');
const B = window.BIBLIA;
const paginas = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const P = require('./analizador-biblia.js');

const sinMarcas = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-zñ]/g, '');
// texto completo de la app, un solo bloque por libro
const porLibro = {};
B.libros.forEach(l => { porLibro[l.id] = sinMarcas(l.capitulos.map(c => c.versiculos.map(v => v.t).join(' ')).join(' ')); });
const todo = Object.values(porLibro).join('');

// páginas de cada libro: desde la primera página con texto del libro hasta la siguiente
const inicio = JSON.parse(fs.readFileSync(__dirname + '/paginas-libros.json', 'utf8'));
const orden = Object.entries(inicio).sort((a, b) => a[1][0] - b[1][0]);
const bloques = [];
orden.forEach(([id, [p1, p2]]) => {
  let actual = null;
  for (let p = p1; p <= p2; p++) {
    for (const L of paginas[p]) {
      if (L.y > 735 || L.y < 65) continue;                 // encabezado y número de página
      const k = sinMarcas(L.t.replace(/^[^\p{L}\d]{0,3}\p{Lu}?[^\p{L}\d]{1,3}(?=\d)/u, ''));
      if (k.length < 12) { continue; }
      const ok = porLibro[id].includes(k) || todo.includes(k);
      if (!ok) {
        if (!actual || actual.p !== p) { actual = { libro: id, p, lineas: [] }; bloques.push(actual); }
        actual.lineas.push(L.t);
      } else actual = null;
    }
  }
});
// clasificar: ¿parece texto bíblico numerado?
bloques.forEach(b => { b.numeros = (b.lineas.join(' ').match(/(^|\s)\d{1,3}(?=\s+[«¿¡"“A-ZÁÉÍÓÚÑa-záéíóúñ])/g) || []).length; });
fs.writeFileSync(__dirname + '/cobertura.json', JSON.stringify(bloques, null, 1));
const conNum = bloques.filter(b => b.numeros > 0);
console.log('Bloques de líneas del PDF que no están en la app:', bloques.length, '| con números de versículo:', conNum.length,
  '| líneas totales:', bloques.reduce((a, b) => a + b.lineas.length, 0));
