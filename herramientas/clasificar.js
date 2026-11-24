/* Clasifica los versículos que faltan frente a la versificación de referencia (NAB). Escribe faltantes.json */
const fs = require('fs');
global.window = {}; require('../biblia-app/js/datos-biblia.js');
const B = window.BIBLIA, R = require('./versificacion-nab.json');
const res = [];
for (const l of B.libros) {
  const ref = R[l.id];
  const tienen = {}, extras = {};
  l.capitulos.forEach(ch => {
    const s = new Set(); ch.versiculos.forEach(v => { const a = String(v.n).split('-').map(Number); for (let k = a[0]; k <= (a[1] || a[0]); k++) s.add(k); });
    tienen[ch.numero] = s;
    extras[ch.numero] = [...s].filter(k => k > (ref[ch.numero - 1] || 0)).length;
  });
  for (let c = 1; c <= ref.length; c++) {
    const s = tienen[c];
    const faltan = []; for (let k = 1; k <= ref[c - 1]; k++) if (!s || !s.has(k)) faltan.push(k);
    if (!faltan.length) continue;
    let tipo;
    if (!s) tipo = 'capitulo-ausente';
    else if ((extras[c - 1] || 0) >= faltan.length || (extras[c + 1] || 0) >= faltan.length) tipo = 'numeracion';
    else if (l.id === 'sal' && faltan[0] === 1) tipo = 'titulo-salmo';
    else tipo = 'no-impreso';
    // ¿el número aparece impreso dentro de otro versículo (a mitad de frase)?
    let dentro = [];
    if (tipo === 'no-impreso' && s) {
      const ch = l.capitulos.find(x => x.numero === c);
      dentro = faltan.filter(k => ch.versiculos.some(v => new RegExp('(^|[\\s(])' + k + '(?=[\\s)])').test(v.t)));
      if (dentro.length) {
        res.push({ id: l.id, libro: l.nombre, cap: c, versiculos: dentro, tipo: 'dentro-de-otro' });
        const resto = faltan.filter(k => !dentro.includes(k));
        if (!resto.length) continue;
        faltan.length = 0; faltan.push(...resto);
      }
    }
    // en los salmos, el v.1 es el título y el resto puede ser no impreso
    if (tipo === 'titulo-salmo' && faltan.length > 1) {
      res.push({ id: l.id, libro: l.nombre, cap: c, versiculos: [1], tipo });
      res.push({ id: l.id, libro: l.nombre, cap: c, versiculos: faltan.slice(1), tipo: 'no-impreso' });
    } else res.push({ id: l.id, libro: l.nombre, cap: c, versiculos: faltan, tipo });
  }
}
fs.writeFileSync(__dirname + '/faltantes.json', JSON.stringify(res, null, 1));
const cuenta = {}; res.forEach(r => { cuenta[r.tipo] = (cuenta[r.tipo] || 0) + r.versiculos.length; });
console.log(cuenta);
res.filter(r => r.tipo !== 'titulo-salmo').forEach(r => console.log(r.tipo.padEnd(16), r.libro, r.cap + ':' + r.versiculos.join(',')));
