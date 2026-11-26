// Prueba del historial por grupos (las citas van al grupo activo y no se mezclan)
const { chromium, devices } = require('playwright');
(async()=>{
  const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13'], timezoneId:'America/Mexico_City'}); const p=await c.newPage();
  const E=[]; p.on('pageerror',e=>E.push(e.message));
  let fallos=0; const ok=(cond, txt)=>{ console.log((cond?'  ✔ ':'  ✘ ')+txt); if(!cond) fallos++; };
  // 6) historial anterior (por día) ya guardado en el teléfono
  await p.addInitScript(()=>{ if(!localStorage.getItem('prueba-ini')){ localStorage.setItem('prueba-ini','1');
    localStorage.setItem('blat-hist', JSON.stringify({entries:{'2026-11-20_juan-3-16':{label:'Juan 3,16', refs:JSON.stringify([{id:'jn',c1:3,v1:16,c2:3,v2:16}]), day:'2026-11-20', at:Date.parse('2026-11-20T18:00:00-06:00'), note:'nota vieja'}}, days:{'2026-11-20':{name:'Clase anterior'}}})); } });
  const fecha = d => p.evaluate(t=>{ window.__ahora=t; }, Date.parse(d));
  await p.addInitScript(()=>{ const R=Date; window.__ahora=window.__ahora||R.parse('2026-11-25T10:00:00-06:00'); Date=class extends R{ constructor(...a){ super(...(a.length?a:[window.__ahora])); } static now(){ return window.__ahora; } }; });
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(1500); await p.click('#instalarCerrar').catch(()=>{});
  const buscar=async q=>{ await p.fill('#q',q); await p.press('#q','Enter'); await p.waitForTimeout(250); return (await p.textContent('.guardado').catch(()=>'')).replace(/\s+/g,' ').trim(); };
  const grupos=async()=>{ await p.click('#tabHist'); await p.waitForTimeout(250); return p.$$eval('section.day', ss=>ss.map(s=>({nombre:s.querySelector('.name').value, activo:s.classList.contains('activo'), citas:[...s.querySelectorAll('.eref')].map(x=>x.textContent)}))); };

  console.log('1) Sin grupo activo: la primera búsqueda crea el grupo de hoy');
  let g=await buscar('Jn 3,16'); ok(/Se guardó en Clase del 25 de noviembre de 2026/.test(g), 'Jn 3,16 → '+g);
  g=await buscar('Mt 5,1-12'); ok(/Clase del 25 de noviembre de 2026/.test(g), 'Mt 5,1-12 → '+g);
  let G=await grupos(); const hoy=G.find(x=>x.activo);
  ok(hoy && hoy.citas.join('|')==='Juan 3,16|Mateo 5,1-12', 'grupo de hoy activo con 2 citas: '+JSON.stringify(hoy));
  ok(G.some(x=>x.nombre==='Clase anterior' && x.citas.join('|')==='Juan 3,16' && !x.activo), '6) el historial anterior aparece como grupo «Clase anterior»');

  console.log('2) Grupo nuevo con nombre: las siguientes citas van solo ahí');
  await p.click('#grupoNuevo'); await p.waitForTimeout(300);
  await p.fill('section.day.activo .name', 'Retiro de jóvenes'); await p.press('section.day.activo .name','Enter'); await p.waitForTimeout(250);
  g=await buscar('Sal 23'); ok(/Se guardó en Retiro de jóvenes/.test(g), 'Sal 23 → '+g);
  g=await buscar('1 Co 13,4-7'); ok(/Retiro de jóvenes/.test(g), '1 Co 13,4-7 → '+g);
  G=await grupos();
  ok(G.find(x=>x.nombre==='Retiro de jóvenes')?.citas.join('|')==='Salmos 23|1 Corintios 13,4-7', 'Retiro: '+JSON.stringify(G.find(x=>x.nombre==='Retiro de jóvenes')));
  ok(G.find(x=>x.nombre.startsWith('Clase del 25'))?.citas.length===2, 'la clase del 25 sigue con sus 2 citas (sin mezclar)');

  console.log('3) Volver a la clase del 25 con el selector');
  const id25 = await p.$eval('#grupoSel', s=>[...s.options].find(o=>o.text.startsWith('Clase del 25')).value);
  await p.selectOption('#grupoSel', id25); await p.waitForTimeout(250);
  g=await buscar('Rom 8,28'); ok(/Clase del 25 de noviembre/.test(g), 'Rom 8,28 → '+g);
  G=await grupos();
  ok(G.find(x=>x.nombre.startsWith('Clase del 25')).citas.join('|')==='Juan 3,16|Mateo 5,1-12|Romanos 8,28', 'clase del 25 con 3 citas');
  ok(G.find(x=>x.nombre==='Retiro de jóvenes').citas.length===2, 'Retiro sigue con 2');

  console.log('4) Al día siguiente sigue guardando en el grupo elegido');
  await fecha('2026-11-26T09:00:00-06:00');
  g=await buscar('Lc 1,38'); ok(/Clase del 25 de noviembre/.test(g), '26 nov, Lc 1,38 → '+g);

  console.log('5) Cerrar y abrir la app: todo se conserva');
  await p.click('#tabHist'); await p.waitForTimeout(200);
  await p.fill('section.day.activo textarea.note >> nth=0', 'Leer en voz alta'); await p.locator('section.day.activo textarea.note >> nth=0').blur(); await p.waitForTimeout(800);
  await p.reload(); await p.waitForTimeout(1500); await fecha('2026-11-26T09:30:00-06:00');
  G=await grupos();
  const a=G.find(x=>x.activo);
  ok(a && a.nombre.startsWith('Clase del 25') && a.citas.length===4, 'grupo activo tras reabrir: '+JSON.stringify(a));
  ok(await p.inputValue('section.day.activo textarea.note >> nth=0')==='Leer en voz alta', 'la nota se conservó');
  ok(G.length===3, 'grupos: '+G.map(x=>x.nombre).join(' / '));

  console.log('7) Borrar el grupo activo: la siguiente cita crea uno nuevo');
  await p.click('section.day.activo [data-a=delday]'); await p.click('section.day.activo [data-a=delday]'); await p.waitForTimeout(300);
  G=await grupos(); ok(G.length===2 && !G.some(x=>x.activo), 'quedan 2 grupos y ninguno activo');
  g=await buscar('Ap 21,4'); ok(/Se guardó en Clase del 26 de noviembre de 2026/.test(g), 'Ap 21,4 → '+g);
  G=await grupos(); ok(G.find(x=>x.activo)?.citas.join('|')==='Apocalipsis 21,4', 'nuevo grupo con Ap 21,4');
  ok(G.find(x=>x.nombre==='Retiro de jóvenes')?.citas.length===2, 'Retiro intacto');

  await p.screenshot({path:'/tmp/claude-0/-home-user/74072619-4532-585b-b277-53804acc04a4/scratchpad/n15-historial.png'});
  console.log('fallos:', fallos, '| errores de la página:', E);
  await b.close();
})();
