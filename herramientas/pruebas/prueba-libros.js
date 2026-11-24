const { chromium, devices } = require('playwright');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); const E=[]; p.on('pageerror',e=>E.push(e.message));
await p.goto('http://localhost:8765/'); await p.waitForTimeout(2500);
// exponer funciones internas para la prueba: cargar app.js en modo prueba no es posible; usamos la interfaz
const books = await p.evaluate(()=>window.BibliaParser.BOOKS.map(b=>({id:b[0], name:b[1], alias:b[2]})));
const ABBR = await p.evaluate(()=>{ const s=[...document.scripts].find(x=>x.src.includes('app.js')); return null; });
const src = await (await p.request.get('http://localhost:8765/js/app.js')).text();
const abbr = (new Function('return {'+src.match(/const ABBR = \{(.*?)\};/)[1]+'}'))();
const fallos=[];
async function buscar(q){ await p.fill('#q',q); await p.press('#q','Enter'); await p.waitForTimeout(60); const h=(await p.textContent('#main')); return h; }
for(const bk of books){
  const pruebas=[bk.name+' 1,1', abbr[bk.id]+' 1,1', ...bk.alias.map(a=>a+' 1,1')];
  for(const q of pruebas){ const h=await buscar(q); if(!h.includes(bk.name+' 1,1') && !h.includes(bk.name+' 1')){ fallos.push(q+' → '+h.replace(/\s+/g,' ').slice(0,60)); } }
}
console.log('búsquedas probadas:', books.reduce((a,b)=>a+b.alias.length+2,0), '| fallos:', fallos.length); console.log(fallos.join('\n'));
console.log('errores', E); await b.close(); })();
