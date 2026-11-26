/* ---------- Dictado ---------- */
/* [app] Dos formas de dictar:
   · Android/Chrome: el reconocimiento de voz del teléfono (SpeechRecognition).
   · iPhone (y donde no hay reconocimiento o no responde): la app graba y entiende la voz
     DENTRO del teléfono con Whisper (carpeta voz/). La primera vez descarga el reconocedor (unos 115 MB);
     después funciona sin internet. La voz no se envía a ningún servidor. */
function mejorOpcion(r){
  // prefiere una cita que exista y que traiga versículo («Juan 5,3») sobre un rango de capítulos («Juan 5-8»)
  let mejor=r[0].transcript, punt=0;
  for(let k=0;k<r.length;k++){ for(const t of [r[k].transcript, corregirDictado(r[k].transcript)]){ const u=understand(t.trim()); let p=0;
    if(u && u.refs.some(x=>resolveRef(x).verses.length)) p = u.refs.some(x=>x.v1!=null) ? 2 : 1;
    if(p>punt){ punt=p; mejor=t; } } }
  return mejor;
}

/* ---- Corregir lo que se oyó mal en el nombre del libro («Calata 5,22» → «Gálatas 5,22») ---- */
const fonetica = s => norm(s).replace(/[^a-z]/g,'').replace(/h/g,'').replace(/v/g,'b').replace(/z/g,'s')
  .replace(/c([ei])/g,'s$1').replace(/qu/g,'k').replace(/c/g,'k').replace(/g([ei])/g,'j$1').replace(/ll/g,'y').replace(/y/g,'i').replace(/w/g,'u').replace(/k/g,'j').replace(/(.)\1+/g,'$1');   // j/k/qu se confunden al oír
function distancia(a,b){
  const m=a.length, n=b.length; if(!m) return n; if(!n) return m;
  let prev=Array.from({length:n+1},(_,j)=>j);
  for(let i=1;i<=m;i++){ const cur=[i]; for(let j=1;j<=n;j++) cur[j]=Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+(a[i-1]===b[j-1]?0:1)); prev=cur; }
  return prev[n];
}
const NOMBRES_VOZ = (()=>{ const out=[];
  for(const b of P.BOOKS){ const pre=(b[1].match(/^([1-3])\s/)||[])[1]||'';
    const nombres=[b[1], ...b[2]].map(x=>x.replace(/^[1-3]\s*/,'')).filter(x=>norm(x).replace(/[^a-z]/g,'').length>=3);
    if(b[0]==='sal') nombres.push('Salmo'); if(b[0]==='hch') nombres.push('Hechos'); if(b[0]==='si') nombres.push('Eclesiástico');
    for(const x of new Set(nombres)) out.push({id:b[0], pre, f:fonetica(x)}); }
  return out; })();
const ORDINAL = {primera:'1', primero:'1', primer:'1', segunda:'2', segundo:'2', tercera:'3', tercero:'3', i:'1', ii:'2', iii:'3', '1':'1', '2':'2', '3':'3'};
function libroParecido(texto){
  let w=norm(texto).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean);
  while(w.length>1 && /^(y|e|de|el|la|en|a|o|libro|del)$/.test(w[0])) w.shift();
  let pre='';
  if(w.length>1){ const o=w[0]; let hit=ORDINAL[o];
    if(!hit && o.length>=5) for(const k of ['primera','primero','segunda','segundo','tercera','tercero']) if(distancia(o,k)<=2){ hit=ORDINAL[k]; break; }
    if(hit){ pre=hit; w.shift(); if(w.length>1 && /^(de|a|del)$/.test(w[0])) w.shift(); } }
  const clave=fonetica(w.join('')); if(clave.length<2) return null;
  const tope = clave.length<=4 ? 1 : Math.max(2, Math.floor(clave.length*0.34));
  let mejor=null, dMejor=99, empate=false;
  for(const c of NOMBRES_VOZ){ if(c.pre!==pre) continue;
    const d0=distancia(clave, c.f); if(d0>tope) continue;
    const d=d0/Math.max(clave.length, c.f.length);   // a igual número de letras distintas, gana el nombre más parecido en proporción
    if(d<dMejor-1e-9){ dMejor=d; mejor=c.id; empate=false; } else if(Math.abs(d-dMejor)<1e-9 && c.id!==mejor) empate=true; }
  return (mejor && !empate) ? mejor : null;
}
const ROMANO = {i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10,xi:11,xii:12,xiii:13,xiv:14,xv:15,xvi:16,xvii:17,xviii:18,xix:19,xx:20};
const NUM_PALABRA = ['uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince'];
/* «8, Alcatorse» → «8 al catorce»: palabras de número mal escritas después del nombre del libro */
const PALABRAS_NUM = ['uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciseis','diecisiete','dieciocho','diecinueve','veinte','veintiuno','veintidos','veintitres','veinticuatro','veinticinco','veintiseis','veintisiete','veintiocho','veintinueve','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa','cien','ciento'];
const NUM_FON = new Map(PALABRAS_NUM.map(x=>[fonetica(x), x]));
function palabraNumero(w){ const f=fonetica(w); if(f.length<3) return null; if(NUM_FON.has(f)) return NUM_FON.get(f);
  if(f.length>=5){ for(const [k,x] of NUM_FON) if(Math.abs(k.length-f.length)<=1 && distancia(k,f)<=1) return x; } return null; }
function arreglarNumeros(resto){
  return resto.replace(/\p{L}+/gu, w=>{
    const n=norm(w); if(/^(al|a|y|e|del|de|hasta|coma|capitulo|versiculo|versiculos|cap|vers)$/.test(n)) return w;
    const x=palabraNumero(w); if(x) return x;
    const m=n.match(/^(.?al|del|y)(.+)$/); if(m){ const y=palabraNumero(m[2]); if(y) return (m[1]==='del'||m[1]==='y'?m[1]:'al')+' '+y; }   // «Valonce» → «al once»
    return w; }).replace(/(\d)\s*,\s*(al|del|y)\s/g, '$1 $2 ');
}
function corregirDictado(texto){ const c=corregirDictado0(texto); return separarDosCifras(c); }
/* «Habacuq 24» cuando Habacuq no tiene capítulo 24 → «Habacuq 2,4» (se dijo «dos, cuatro») */
function separarDosCifras(c){
  const m=String(c).match(/^(.*\D)\s(\d)(\d)$/); if(!m) return c;
  const id=findBook(m[1].trim()); if(!id || getChapter(id, +(m[2]+m[3]))) return c;
  return existeVers(id, +m[2], +m[3]) ? `${m[1]} ${m[2]},${m[3]}` : c;
}
function corregirDictado0(texto){
  let t=String(texto||'').replace(/[¡!¿?"“”«»]/g,' ').replace(/\s+/g,' ').trim().replace(/[.,;:\s]+$/,'');
  if(!t) return t;
  // «Juan VI, 8» → «Juan 6, 8» (números romanos después del nombre del libro)
  t=t.replace(/(\p{L}{3,}[\s,]+)([IVX]{1,5})\b/gu, (m,a,r)=>ROMANO[r.toLowerCase()] ? a+ROMANO[r.toLowerCase()] : m);
  // «5 de 11» entre números casi siempre es «5 al 11»
  t=t.replace(/(\p{L})(\d)/gu,'$1 $2').replace(/(\d)\s*[x×]\s*(\d)/g,'$1,$2').replace(/(\d)\s+de\s+(\d)/g,'$1 al $2');
  // «5/22» → 5,22; pero «2, 5/11» (ya hay capítulo) → 2, 5 al 11
  t=t.replace(/(\d)\s*\/\s*(\d)/g, (x,a,b,i,todo)=>{ const antes=todo.slice(0,i); return (/\d\s*,/.test(antes) || antes.split(/[\s,]+/).some(w=>palabraNumero(w))) ? a+' al '+b : a+','+b; });
  // «Gálatas 5-22» (sin coma) es capítulo 5, versículo 22
  t=t.replace(/^((?:[1-3]\s+)?\D*\d+)\s*-\s*(\d+)(?!.*,)/, '$1,$2');
  let m=t.match(/^((?:[1-3]\s+)?\D*?)[\s,]*(\d.*)$/);
  if(!m){ // «Hénesis uno, uno»: los números vienen en palabras
    const w=t.split(' '); const k=w.findIndex((x,i)=>i>0 && palabraNumero(x.replace(/[,.]/g,'')));
    if(k<1) return t; m=[t, w.slice(0,k).join(' '), w.slice(k).join(' ')]; }
  let libro=m[1].replace(/[,.]+$/,'').trim(), resto=m[2];
  resto=arreglarNumeros(resto);
  if(!libro) return resto;
  if(findBook(libro) && understand(libro+' '+resto)) return libro+' '+resto;
  let id=libroParecido(libro);
  // «Cuantres, 16» → «Juan tres, 16»: el número quedó pegado al nombre
  const n=norm(libro).replace(/[^a-z]/g,'');
  for(const p of NUM_PALABRA){ if(n.length>p.length+1 && n.endsWith(p)){ const id2=libroParecido(n.slice(0,-p.length)); if(id2){ id=id2; resto=(NUM_PALABRA.indexOf(p)+1)+', '+resto; break; } } }
  if(!id) return t;
  return bookName(id)+' '+resto;
}

const micBtn=$('#mic'), live=$('#live');
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec=null, dictText='', escuchando=false;
const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
const puedeGrabar = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (window.AudioContext||window.webkitAudioContext) && window.WebAssembly);
const usarVozPropia = esIOS || !SR;
if(SR || puedeGrabar) micBtn.hidden=false;
function dictarConTeclado(msg){
  qEl.value=''; syncClear(); qEl.focus();
  live.textContent=msg || 'Toca el micrófono 🎙 del teclado, di la cita (por ejemplo «Juan cinco coma tres») y luego toca Buscar.';
  qEl.addEventListener('blur', ()=>setTimeout(()=>{ live.textContent=''; }, 300), {once:true});
}
function micEncendido(si, etiqueta){ micBtn.classList.toggle('on', si); micBtn.setAttribute('aria-label', si ? (etiqueta||'Terminar dictado') : 'Dictar cita'); }

/* ---- Grabar la voz y entenderla en el teléfono ---- */
let voz=null, vozEstado='', vozDetener=null;
function cargarVoz(){ if(!voz) voz=import(new URL('voz/voz.js', document.baseURI).href).catch(e=>{ voz=null; throw e; }); return voz; }
function aMono16k(trozos, tasa){
  let n=0; for(const t of trozos) n+=t.length;
  const todo=new Float32Array(n); let o=0; for(const t of trozos){ todo.set(t,o); o+=t.length; }
  if(tasa===16000) return todo;
  const largo=Math.floor(n*16000/tasa), out=new Float32Array(largo), paso=tasa/16000;
  for(let i=0;i<largo;i++){ const x=i*paso, j=Math.floor(x), f=x-j; out[i]=(todo[j]||0)*(1-f)+(todo[j+1]||0)*f; }
  return out;
}
function grabar(ctx, stream, alHablar){
  return new Promise(res=>{
    const src=ctx.createMediaStreamSource(stream), proc=ctx.createScriptProcessor(4096,1,1);
    const trozos=[]; let habla=false, silencio=0, total=0, ruido=0, nRuido=0, termino=false;
    const fin=()=>{ if(termino) return; termino=true; try{ proc.disconnect(); src.disconnect(); }catch(e){} stream.getTracks().forEach(t=>t.stop()); res({audio:aMono16k(trozos, ctx.sampleRate), habla}); try{ ctx.close(); }catch(e){} };
    vozDetener=fin;
    proc.onaudioprocess=e=>{
      const d=e.inputBuffer.getChannelData(0), dur=d.length/ctx.sampleRate; trozos.push(new Float32Array(d)); total+=dur;
      let s=0; for(let i=0;i<d.length;i++) s+=d[i]*d[i]; const rms=Math.sqrt(s/d.length);
      if(total<0.35){ ruido+=rms; nRuido++; return; }
      const umbral=Math.max(0.012, (ruido/Math.max(nRuido,1))*2.5);
      if(rms>umbral){ if(!habla) alHablar(); habla=true; silencio=0; } else if(habla) silencio+=dur;
      if((habla && silencio>1.4) || total>12 || (!habla && total>7)) fin();
    };
    src.connect(proc); proc.connect(ctx.destination);
  });
}
async function dictarConVoz(){
  if(vozEstado==='grabando'){ if(vozDetener) vozDetener(); return; }
  if(vozEstado) return;
  if(!store.get('blat-voz-lista', false) && !confirm('Para dictar, la app descarga una sola vez el reconocedor de voz (unos 115 MB; mejor con wifi). Después funciona sin internet y tu voz no sale del teléfono.\n\n¿Descargarlo ahora?')){
    dictarConTeclado(); return; }
  const AC=window.AudioContext||window.webkitAudioContext, ctx=new AC();   // se crea al tocar el botón (lo pide el iPhone)
  vozEstado='grabando'; dictText=''; qEl.value=''; syncClear(); micEncendido(true);
  let listo=false, pct='';
  const modelo=cargarVoz().then(m=>m.preparar((a,t)=>{ pct=Math.round(a*100/t)+' %'; if(vozEstado!=='grabando') live.textContent='Descargando el reconocedor de voz… '+pct; })).then(()=>{ listo=true; store.set('blat-voz-lista', true); });
  modelo.catch(()=>{});
  try{
    try{ await ctx.resume(); }catch(e){}
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:true, channelCount:1}});
    live.textContent='Te escucho… di la cita, por ejemplo «Juan seis, ocho al catorce». Toca 🎙 otra vez al terminar.';
    const {audio, habla}=await grabar(ctx, stream, ()=>{ live.textContent='Te escucho… (toca 🎙 al terminar)'; });
    vozEstado='pensando'; micEncendido(false);
    if(!habla || audio.length<16000*0.4){ live.textContent='No te escuché. Toca 🎙 y di la cita un poco más fuerte.'; return; }
    live.textContent = listo ? 'Entendiendo…' : 'Descargando el reconocedor de voz… '+pct;
    try{ await modelo; }catch(e){
      dictarConTeclado(navigator.onLine===false ? 'La primera vez se necesita internet para descargar el reconocedor de voz. Mientras, usa el micrófono 🎙 del teclado.' : 'No se pudo preparar el reconocedor de voz en este teléfono. Usa el micrófono 🎙 del teclado.');
      return; }
    live.textContent='Entendiendo…';
    const oido=await (await cargarVoz()).transcribir(audio); window.__vozOido=oido;
    const cita=corregirDictado(oido);
    if(!cita){ live.textContent='No te entendí. Toca 🎙 e inténtalo otra vez.'; return; }
    live.textContent=''; qEl.value=cita; syncClear(); runQuery(cita, {tidy:true});
  }catch(err){
    micEncendido(false);
    if(err && (err.name==='NotAllowedError' || err.name==='SecurityError')) dictarConTeclado('Sin permiso para el micrófono. Puedes permitirlo en Ajustes, o usar el micrófono 🎙 del teclado.');
    else dictarConTeclado('No se pudo usar el micrófono. Usa el micrófono 🎙 del teclado.');
  }finally{ if(vozEstado!=='grabando'){ vozEstado=''; micEncendido(false); } vozDetener=null; }
}
window.__corregirDictado = corregirDictado;   // para pruebas

micBtn.addEventListener('click', ()=>{
  if(usarVozPropia || vozEstado){ if(puedeGrabar) dictarConVoz(); else dictarConTeclado(); return; }
  if(escuchando && rec){ rec.stop(); return; }
  rec=new SR(); rec.lang='es-MX'; rec.interimResults=true; rec.continuous=false; rec.maxAlternatives=5;
  dictText=''; qEl.value=''; syncClear();
  let vigia=null, recibio=false, aOtro=false;
  const respaldo=()=>{ aOtro=true; try{ rec.abort(); }catch(e){} if(puedeGrabar) dictarConVoz(); else dictarConTeclado(); };
  vigia=setTimeout(()=>{ if(!recibio) respaldo(); }, 8000);   // si el reconocimiento del teléfono no responde, se usa el de la app
  rec.onstart=()=>{ escuchando=true; micEncendido(true, 'Detener dictado'); live.textContent='Te escucho… di la cita, por ejemplo «Juan seis ocho al catorce»'; };
  rec.onresult=e=>{ recibio=true; let fin='', tmp=''; for(let i=0;i<e.results.length;i++){ const r=e.results[i]; if(r.isFinal) fin+=mejorOpcion(r); else tmp+=r[0].transcript; }
    if(fin){ dictText=fin.trim(); qEl.value=dictText; syncClear(); } live.textContent=((dictText+' '+tmp).trim()+(tmp?' …':'')) || live.textContent; };
  rec.onerror=e=>{ if(e.error==='not-allowed'){ micBtn.hidden=!puedeGrabar; toast('Sin permiso para el micrófono; puedes escribir la cita'); }
    else if(!recibio && (e.error==='service-not-allowed' || e.error==='network' || e.error==='language-not-supported')){ clearTimeout(vigia); respaldo(); } };
  rec.onend=()=>{ clearTimeout(vigia); escuchando=false; if(!aOtro){ micEncendido(false); live.textContent=''; } if(dictText) runQuery(dictText, {tidy:true}); };
  try{ rec.start(); }catch(err){ respaldo(); }
});

