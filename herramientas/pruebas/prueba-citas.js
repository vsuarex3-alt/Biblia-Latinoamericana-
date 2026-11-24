const { chromium, devices } = require('playwright');
const C = require('./citas.js');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); const E=[]; p.on('pageerror',e=>E.push(e.message));
await p.goto('http://localhost:8765/'); await p.waitForTimeout(2000);
const fallos=[];
for(const [q,libro,cap,v,v2] of C){
  await p.fill('#q',q); await p.press('#q','Enter'); await p.waitForTimeout(40);
  const h2=(await p.textContent('#main .meta h2').catch(()=>''))||(await p.textContent('#main .reader h2').catch(()=>''))||'';
  const res=(await p.textContent('#main').catch(()=>'')).replace(/\s+/g,' ');
  const esperado = libro+' '+cap+(v!=null?','+v+(v2?'-'+v2:''):'');
  const ok = h2.replace(/\s+/g,' ').trim()===esperado && /\d+ versículos?/.test(res);
  if(!ok) fallos.push(`${JSON.stringify(q)} → «${h2.replace(/\s+/g,' ').trim()}» (esperado «${esperado}»)`);
}
console.log('formas probadas:', C.length, '| fallos:', fallos.length); console.log(fallos.join('\n'));
console.log('errores', E); await b.close(); })();
