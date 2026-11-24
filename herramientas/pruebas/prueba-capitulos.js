const { chromium, devices } = require('playwright');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); const E=[]; p.on('pageerror',e=>E.push(e.message));
await p.goto('http://localhost:8765/'); await p.waitForTimeout(3000);
const libros = await p.evaluate(()=>window.BIBLIA.libros.map(l=>({id:l.id, nombre:l.nombre, caps:l.capitulos.map(c=>c.numero)})));
const fallos=[]; let n=0;
async function buscar(q){ await p.fill('#q',q); await p.press('#q','Enter'); await p.waitForTimeout(25); return (await p.textContent('#main')); }
// 1) cada capítulo de cada libro por nombre
for(const l of libros){ for(const c of l.caps){ n++; const h=await buscar(l.nombre+' '+c); if(!/\d+ versículos?/.test(h)) fallos.push(l.nombre+' '+c); } }
console.log('capítulos probados:', n, '| fallos:', fallos.length, fallos.slice(0,20).join(', '));
// 2) referencias marginales: primer versículo con referencias de cada libro; tocar cada referencia
const f2=[]; let r=0;
const sample = await p.evaluate(()=>{ const X=window.XREF_DATA, out=[]; const vistos=new Set(); for(const k of Object.keys(X)){ for(const s of X[k]){ const id=s.split('|')[0]; if(!vistos.has(id)){ vistos.add(id); out.push(k); } } } return out; });
for(const k of sample){ const [id,c,v]=k.split('.'); const l=libros.find(x=>x.id===id); await buscar(l.nombre+' '+c+','+v); const chips=await p.$$eval('.hit .xr', e=>e.map(x=>x.dataset.q)); for(const q of chips){ r++; const h=await buscar(q); if(!/\d+ versículos?/.test(h)) f2.push(q); } }
console.log('referencias tocadas:', r, '| fallos:', f2.length, [...new Set(f2)].slice(0,30).join(', '));
// 3) navegación: libro → capítulos → leer → siguiente
await p.click('#tabBooks'); await p.waitForTimeout(200); const nb=await p.$$eval('.book', e=>e.length);
await p.click('.book >> text=Eclesiastés'); await p.waitForTimeout(200); const chs=await p.$$eval('.chaps button', e=>e.length);
await p.click('.chaps button >> nth=0'); await p.waitForTimeout(200); const h1=(await p.textContent('.reader h2')).trim(); await p.click('#next'); await p.waitForTimeout(200); const h2=(await p.textContent('.reader h2')).trim();
console.log('Libros:', nb, '| Eclesiastés capítulos:', chs, '| leer:', h1, '→ siguiente:', h2);
console.log('errores', E); await b.close(); })();
