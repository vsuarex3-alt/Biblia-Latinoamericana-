(function(){
const P = window.BibliaParser, S = window.Hablado;
const $ = s => document.querySelector(s);
const main = $('#main'), side = $('#side');
const ABBR = {gn:'Gén',ex:'Ex',lv:'Lev',nm:'Núm',dt:'Dt',jos:'Jos',jue:'Jue','1s':'1 Sam','2s':'2 Sam','1r':'1 Re','2r':'2 Re','1cr':'1 Cró','2cr':'2 Cró',esd:'Es',ne:'Ne','1m':'1 Mac','2m':'2 Mac',is:'Is',jer:'Jer',ez:'Ez',os:'Os',jl:'Jl',am:'Am',abd:'Abd',jon:'Jon',mi:'Mi',na:'Na',ha:'Hab',so:'Sof',ag:'Ag',za:'Za',mal:'Mal',dn:'Dn',jb:'Job',pr:'Pro',qo:'Ec',ct:'Cant',rt:'Rt',lam:'Lam',est:'Est',tob:'Tob',jdt:'Jdt',bar:'Ba',sab:'Sab',si:'Sir',sal:'Sal',mt:'Mt',mc:'Mc',lc:'Lc',jn:'Jn',hch:'He',rom:'Rom','1co':'1 Co','2co':'2 Co',gal:'Gál',ef:'Ef',flp:'Fil',col:'Col',flm:'Filem','1ts':'1 Tes','2ts':'2 Tes','1tm':'1 Tim','2tm':'2 Tim',tit:'Ti',heb:'Heb',stg:'Stgo','1p':'1 Pe','2p':'2 Pe',jds:'Jud','1jn':'1 Jn','2jn':'2 Jn','3jn':'3 Jn',ap:'Ap'};   // [app] índice oficial
const SHORT = {};
const OTRO_NOMBRE = {qo:'Qohelet', si:'Eclesiástico'};   // [app] para no confundir Eclesiastés con Eclesiástico
const otroNombre = id => OTRO_NOMBRE[id] ? ` <small class=\"otro\">(${OTRO_NOMBRE[id]})</small>` : '';
const NT_START = P.BOOKS.findIndex(b=>b[0]==='mt');
const ORDER = {}; P.BOOKS.forEach((b,i)=>ORDER[b[0]]=i);
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const esc = s => String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt = n => n.toLocaleString('es-MX');
const store = { get(k,d){ try{ const v=localStorage.getItem(k); return v==null?d:JSON.parse(v); }catch(e){ return d; } }, set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} } };

let BIBLE=null, BYID={}, FLAT=[];
/* [app] Texto incluido en la app (js/datos-biblia.js). Cada versículo: [número, texto, página, etiqueta, hasta, agregado]
   «etiqueta» es para versículos combinados como «11-12». */
function desdeDatos(D){
  return {fileName:'La Biblia Latinoamericana', books: D.libros.map(l=>({id:l.id, name:l.nombre, chapters:l.capitulos.map(c=>({n:c.numero,
    v:c.versiculos.map(v=>{ const a=String(v.n).split('-').map(Number); return [a[0], v.t, '', a.length>1?String(v.n):null, a[1]||a[0], v.a?1:0]; })}))}))};
}
const vEtiqueta = v => v[3] || v[0];
let view='search', lastQuery='', lastRead=store.get('blat-read', null);
let selected=new Map();
let readSize = store.get('blat-size', 18);
let studyMode = store.get('blat-study', false);
document.documentElement.style.setProperty('--read-size', readSize+'px');

/* ---------- Altura de la cabecera (para el índice lateral) ---------- */
const band=$('#band');
const setBandH=()=>document.documentElement.style.setProperty('--bandh', band.offsetHeight+'px');
new ResizeObserver(setBandH).observe(band); setBandH();

/* ---------- Libros: alias y búsqueda ---------- */
const ALIAS = {};
P.BOOKS.forEach(b=>{ const id=b[0]; const add=k=>{ k=norm(k).replace(/[\s.()]/g,''); if(k && !ALIAS[k]) ALIAS[k]=id; }; add(id); add(b[1]); b[2].forEach(add); b[3].forEach(add); });
const WORDNUM = [[/^(primera|primer|primero|1a|1ra|1er|1o|i)\s+/, '1'], [/^(segunda|segundo|2a|2da|2do|2o|ii)\s+/, '2'], [/^(tercera|tercer|tercero|3a|3ra|3er|3o|iii)\s+/, '3']];
function cleanBook(raw){
  let s = norm(raw).trim().replace(/[ºª]/g,'');
  s = s.replace(/^(el\s+|la\s+|los\s+)?(evangelio\s+(segun\s+|de\s+)?(san\s+)?|san\s+|libro\s+de(l)?\s+(los\s+|las\s+)?|carta\s+(a\s+los\s+|a\s+|de\s+)?)/,'');
  for(const [re,n] of WORDNUM) s = s.replace(re, n);
  s = s.replace(/^([1-3])\s*(carta\s+|libro\s+)?(a\s+los\s+|a\s+|de\s+los\s+|de\s+las\s+|de\s+(san\s+)?)?/, '$1');
  if(/^salmo\b/.test(s)) s='salmos';
  return s.replace(/[\s.]/g,'');
}
function findBook(raw){
  const key=cleanBook(raw); if(!key) return null;
  if(ALIAS[key]) return ALIAS[key];
  if(key.replace(/^[1-3]/,'').length>=3){
    const c = P.BOOKS.filter(b=>norm(b[1]).replace(/[\s.()]/g,'').startsWith(key)).map(b=>b[0]);
    if(c.length===1) return c[0];
  }
  return null;
}
function bookCandidates(prefix){
  const key=cleanBook(prefix); if(!key) return [];
  const out=[];
  for(const b of P.BOOKS){
    const full=norm(b[1]).replace(/[\s.()]/g,'');
    const hit = full.startsWith(key) || b[2].some(a=>norm(a).replace(/[\s.]/g,'')===key) || (key.length>=3 && full.includes(key));
    if(hit) out.push(b[0]);
  }
  return out.slice(0,6);
}

/* ---------- Citas ---------- */
function parseRefs(q){
  const parts = q.split(';').map(s=>s.trim()).filter(Boolean);
  const out=[]; let lastBook=null;
  for(const part of parts){
    // [app] «Hch 2,1-4; 2,42-47»: la parte sin libro usa el libro anterior
    if(lastBook && /^\d+\s*([,:.\-–]|$)/.test(part)){
      const mm=part.match(/^(\d+)\s*(.*)$/), sub=parseRefs(bookName(lastBook)+' '+mm[1]+' '+mm[2]);
      if(!sub) return null; out.push(...sub); continue;
    }
    const m = part.match(/^((?:[1-3]|i{1,3})?\s*[^\d\s][^\d]*?)?\s*(\d+)\s*(.*)$/i);
    if(!m) return null;
    const id = m[1] ? findBook(m[1]) : lastBook;
    if(!id) return null;
    lastBook=id;
    const chap=+m[2]; const rest=m[3].trim(); let r;
    if(!rest){ out.push({id, c1:chap, c2:chap}); continue; }
    if((r=rest.match(/^[-–]\s*(\d+)$/))){ out.push({id, c1:chap, c2:Math.max(chap,+r[1])}); continue; }
    if((r=rest.match(/^[,:.]\s*(\d+)\s*[-–]\s*(\d+)\s*[,:.]\s*(\d+)$/))){ out.push({id, c1:chap, v1:+r[1], c2:+r[2], v2:+r[3]}); continue; }
    if((r=rest.match(/^[,:]\s*(.+)$/)) || (r=rest.match(/^\.\s*(\d.*)$/))){
      for(const sp of r[1].split(/[.,]/).map(s=>s.trim()).filter(Boolean)){
        const mm=sp.match(/^(\d+)[a-z]?(?:\s*[-–]\s*(\d+)[a-z]?)?$/i); if(!mm) return null;
        const a=+mm[1], b=mm[2]?+mm[2]:a;
        out.push({id, c1:chap, v1:a, c2:chap, v2:Math.max(a,b)});
      }
      continue;
    }
    return null;
  }
  return out.length?out:null;
}
const bookName = id => BYID[id]?.name || P.BOOKS.find(b=>b[0]===id)[1];
function refLabel(r, long){
  const name = long ? (SHORT[r.id] || bookName(r.id)) : ABBR[r.id];
  if(r.v1==null) return r.c1===r.c2 ? `${name} ${r.c1}` : `${name} ${r.c1}-${r.c2}`;
  if(r.c1!==r.c2) return `${name} ${r.c1},${r.v1}-${r.c2},${r.v2}`;
  return r.v1===r.v2 ? `${name} ${r.c1},${r.v1}` : `${name} ${r.c1},${r.v1}-${r.v2}`;
}
function getChapter(id,c){ const b=BYID[id]; return b && b.chapters.find(x=>x.n===c); }
function resolveRef(r){
  const verses=[];
  for(let c=r.c1; c<=r.c2; c++){
    const ch=getChapter(r.id,c); if(!ch) continue;
    for(const v of ch.v){
      if(r.v1!=null){ if(c===r.c1 && (v[4]||v[0])<r.v1) continue; if(c===r.c2 && v[0]>r.v2) continue; }
      verses.push({b:r.id, c, v:v[0], l:v[3], t:v[1], p:v[2]});
    }
  }
  return {ref:r, verses};
}
/* Interpreta texto escrito o dictado: «Juan seis ocho al catorce» → refs */
function understand(q){
  q = q.replace(/(\d+)\s*\(\s*\d+\s*\)/g,'$1')   // [app] «Sal 23 (22)»: doble numeración de los Salmos
       .replace(/[()\[\]{}]/g,' ').replace(/^[\s.,;:]+|[\s.,;:]+$/g,'').replace(/\s+/g,' ').trim();   // [app] «(Jn 3,16)», «Jn 3,16.»
  // [app] «Jn 3,16 y Rom 5,8»: una «y» seguida de otro libro separa dos citas
  q = q.replace(/\s+y\s+(?=((?:[1-3]\s*)?[a-záéíóúñ]+)\s*\d)/gi, (m, lib)=> findBook(lib) ? '; ' : m);
  let refs = parseRefs(q);
  if(refs){ const f=separarPegados(refs); return {refs:f.refs, spoken:f.cambio}; }
  const conv = S.toCita(q, findBook);
  if(conv){ refs = parseRefs(conv); if(refs) return {refs:separarPegados(refs).refs, spoken:true}; }
  return null;
}
/* [app] El dictado del teléfono a veces junta los números: «Juan cinco tres» → «Juan 503» o «Juan 53».
   Si ese capítulo no existe, se prueba a separarlo en capítulo y versículo que sí existan. */
function existeVers(id, c, v){ const ch=getChapter(id,c); return !!(ch && ch.v.some(x=>v>=x[0] && v<=(x[4]||x[0]))); }
function separarPegados(refs){
  let cambio=false;
  const out=refs.map(r=>{
    const b=BYID[r.id];
    // [app] libros de un solo capítulo (Abdías, Filemón, Judas, 2 y 3 Juan): «Flm 6» es el versículo 6
    if(b && b.chapters.length===1 && r.v1==null && Math.max(r.c1, r.c2)>1 && existeVers(r.id, 1, r.c1)){
      cambio=true; return {id:r.id, c1:1, v1:r.c1, c2:1, v2:Math.max(r.c1, r.c2)};   // también «Jds 3-5»
    }
    if(!b || r.v1!=null || r.c1!==r.c2 || getChapter(r.id, r.c1)) return r;
    const s=String(r.c1), opciones=[]; if(s.length<3) return r;
    const m=s.match(/^(\d+?)0(\d+)$/); if(m) opciones.push([+m[1], +m[2]]);      // 503 → 5,3
    for(let i=1;i<s.length;i++){ if(s[i]!=='0') opciones.push([+s.slice(0,i), +s.slice(i)]); }   // 316 → 3,16
    for(const [c,v] of opciones){ if(c>0 && v>0 && existeVers(r.id, c, v)){ cambio=true; return {id:r.id, c1:c, v1:v, c2:c, v2:v}; } }
    return r;
  });
  return {refs:out, cambio};
}

/* ---------- Búsqueda de palabras ---------- */
const ACC = {a:'aáàäâ', e:'eéèëê', i:'iíìïî', o:'oóòöô', u:'uúùüû', n:'nñ', c:'cç'};
const accentRe = t => t.split('').map(ch=>{ const k=norm(ch); return ACC[k] ? '['+ACC[k]+ACC[k].toUpperCase()+']' : ch.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }).join('');
function parseTerms(q){ const t=[]; q.replace(/"([^"]+)"|“([^”]+)”|(\S+)/g,(_,a,b,c)=>{ const x=(a||b||c||'').trim(); if(x) t.push(norm(x)); }); return t; }
function textSearch(q, scope){
  const terms=parseTerms(q); const hits=[];
  if(!terms.length) return {terms, hits};
  for(const x of FLAT){
    if(scope==='at' && x.bi>=NT_START) continue;
    if(scope==='nt' && x.bi<NT_START) continue;
    if(scope && scope!=='at' && scope!=='nt' && x.b!==scope) continue;
    if(terms.every(t=>x.n.includes(t))) hits.push(x);
  }
  return {terms, hits};
}
function highlight(text, terms){
  let html=esc(text); if(!terms || !terms.length) return html;
  const re=new RegExp('('+terms.map(t=>accentRe(esc(t))).sort((a,b)=>b.length-a.length).join('|')+')','gi');
  return html.replace(re,'<mark>$1</mark>');
}

/* ---------- Copiar ---------- */
let toastT;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'), 1900); }
function execCopy(text){
  // copia síncrona (dentro del toque), compatible con iPhone: selecciona TODO el texto
  const ta=document.createElement('textarea');
  ta.value=text; ta.contentEditable='true'; ta.readOnly=false;
  Object.assign(ta.style,{position:'fixed', top:'0', left:'0', width:'1px', height:'1px', opacity:'0', fontSize:'16px', whiteSpace:'pre'});
  document.body.appendChild(ta);
  const range=document.createRange(); range.selectNodeContents(ta);
  const sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
  ta.focus({preventScroll:true}); ta.select(); ta.setSelectionRange(0, text.length);
  let ok=false; try{ ok=document.execCommand('copy'); }catch(e){}
  sel.removeAllRanges(); ta.remove();
  return ok;
}
function copyText(text, opts){
  opts=opts||{};
  const ok=execCopy(text);
  let api=null; try{ api=navigator.clipboard && navigator.clipboard.writeText(text); }catch(e){}
  const msg = opts.label || 'Copiado con su cita';
  if(ok){ toast(msg); if(opts.show) showCopied(text, opts.title, true); return; }
  if(api && api.then){ api.then(()=>{ toast(msg); if(opts.show) showCopied(text, opts.title, true); }, ()=>showCopied(text, opts.title, false)); }
  else showCopied(text, opts.title, false);
}
function showCopied(text, title, done){
  document.getElementById('sheet')?.remove();
  const s=document.createElement('div'); s.id='sheet'; s.className='sheet';
  s.innerHTML=`<div class="sheet-in" role="dialog" aria-modal="true" aria-label="Texto copiado">
    <div class="sheet-h"><b>${esc(title||'Texto para tus apuntes')}</b><span>${done?'Ya está copiado. Revisa que esté todo:':'Mantén presionado el texto y elige Copiar:'}</span></div>
    <textarea id="sheetText" readonly>${esc(text)}</textarea>
    <div class="sheet-a"><button class="btn ghost" type="button" id="sheetClose">Cerrar</button><button class="btn" type="button" id="sheetCopy">Copiar otra vez</button></div></div>`;
  document.body.appendChild(s);
  const ta=s.querySelector('#sheetText');
  s.querySelector('#sheetClose').onclick=()=>s.remove();
  s.addEventListener('click', e=>{ if(e.target===s) s.remove(); });
  s.querySelector('#sheetCopy').onclick=()=>{
    ta.removeAttribute('readonly'); ta.focus(); ta.setSelectionRange(0, ta.value.length);
    let ok=false; try{ ok=document.execCommand('copy'); }catch(e){}
    ta.setAttribute('readonly','');
    if(ok) toast('Copiado'); else { try{ navigator.clipboard.writeText(ta.value).then(()=>toast('Copiado'), ()=>toast('Selecciona el texto y elige Copiar')); }catch(e){ toast('Selecciona el texto y elige Copiar'); } }
  };
}
function citeText(verses){
  if(!verses.length) return '';
  verses=verses.slice().sort((a,b)=>(ORDER[a.b]-ORDER[b.b]) || a.c-b.c || a.v-b.v);
  const groups=[];
  for(const v of verses){ const g=groups[groups.length-1]; if(g && g.b===v.b && g.c===v.c) g.vs.push(v); else groups.push({b:v.b,c:v.c,vs:[v]}); }
  return groups.map(g=>{
    const nums=g.vs.map(v=>v.v), rs=[]; let s=nums[0], p=nums[0];
    for(const n of nums.slice(1)){ if(n===p+1){ p=n; continue; } rs.push(s===p?`${s}`:`${s}-${p}`); s=p=n; }
    rs.push(s===p?`${s}`:`${s}-${p}`);
    const body=g.vs.map(v=>g.vs.length>1?`${v.v} ${v.t}`:v.t).join(' ');
    return `«${body}» (${SHORT[g.b]||bookName(g.b)} ${g.c},${rs.join('.')})`;
  }).join('\n\n');
}
const ICON_COPY='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
const ICON_READ='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5h6a4 4 0 0 1 4 4v11a3 3 0 0 0-3-3H2zM22 5h-6a4 4 0 0 0-4 4v11a3 3 0 0 1 3-3h7z"/></svg>';

/* ---------- Navegación ---------- */
function setView(v){
  view=v;
  $('#tabSearch').setAttribute('aria-selected', v==='search');
  $('#tabBooks').setAttribute('aria-selected', v==='books');
  $('#tabRead').setAttribute('aria-selected', v==='read');
  $('#tabHist').setAttribute('aria-selected', v==='history');
  $('#tabEvg').setAttribute('aria-selected', v==='gospel');
  $('#tabRead').disabled = !BIBLE || !lastRead;
  if(v!=='read') clearSel();
  renderSide();
}
const SVG_S='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>';
const SVG_H='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>';
function sideNav(){
  return `<div class="sidenav"><button type="button" data-n="search" aria-current="${view==='search'}">${SVG_S}Buscar</button><button type="button" data-n="history" aria-current="${view==='history'}"${BIBLE?'':' disabled'}>${SVG_H}Historial</button></div>`;
}
function bindSideNav(){ side.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>b.dataset.n==='history'?renderHistory():$('#tabSearch').click()); }
function renderSide(){
  if(!BIBLE){ side.innerHTML=sideNav(); bindSideNav(); return; }
  const cur = view==='read' && lastRead ? lastRead.id : null;
  const at=BIBLE.books.filter(b=>ORDER[b.id]<NT_START), nt=BIBLE.books.filter(b=>ORDER[b.id]>=NT_START);
  const list = bs => bs.map(b=>`<button class="bk${b.id===cur?' cur':''}" type="button" data-id="${b.id}"><span>${esc(SHORT[b.id]||b.name)}</span><small>${b.chapters.length}</small></button>`).join('');
  side.innerHTML = sideNav()+`<h4>Antiguo Testamento</h4>${list(at)}<h4>Nuevo Testamento</h4>${list(nt)}`;
  bindSideNav();
  side.querySelectorAll('.bk').forEach(el=>el.onclick=()=>renderChapters(el.dataset.id));
}

function renderLoader(state){
  view='search'; const s=state||{};
  main.innerHTML = `<div class="col">
    <section class="drop" id="drop">
      <h2>Carga tu Biblia en PDF</h2>
      <p>Elige el archivo de <b>La Biblia Latinoamérica</b>. Se lee aquí mismo, en tu navegador, y no se sube a ningún lado. La primera vez tarda menos de un minuto; después se abre al instante.</p>
      ${s.loading ? `<div class="progress"><div class="bar"><i id="barFill"></i></div><small id="progText">Abriendo el PDF…</small></div>`
                  : `<button class="btn" id="pick" type="button">Elegir PDF</button><small style="color:var(--ink-soft)">o arrástralo a este recuadro</small>`}
      ${s.error ? `<p class="err">${esc(s.error)}</p>` : ''}
    </section>
    <div class="howto">
      <div><b>Por cita</b><p>Como en tu Biblia: <code>Jn 3,16</code>, <code>Sal 23</code>, <code>Mt 5,1-12</code>, o varias con punto y coma.</p></div>
      <div><b>Hablando</b><p>Toca el micrófono o dicta con el teclado: <code>Juan seis ocho al catorce</code> se acomoda como <code>Juan 6,8-14</code>.</p></div>
      <div><b>Por palabra</b><p>Con o sin acentos. Usa comillas para una frase exacta: <code>"no temas"</code>.</p></div>
    </div></div>`;
  if(!s.loading){
    $('#pick').onclick=()=>$('#file').click();
    const d=$('#drop');
    d.addEventListener('dragover', e=>{ e.preventDefault(); d.classList.add('over'); });
    d.addEventListener('dragleave', ()=>d.classList.remove('over'));
    d.addEventListener('drop', e=>{ e.preventDefault(); d.classList.remove('over'); const f=e.dataTransfer.files[0]; if(f) loadPdf(f); });
  }
  renderSide();
}

function renderSearch(q, opts){
  opts=opts||{}; setView('search');
  q=(q||'').trim(); lastQuery=q; store.set('blat-q', q);
  if(!q){ renderHome(); return; }
  const u = understand(q);
  if(u){
    const label = u.refs.map(r=>refLabel(r,true)).join('; ');
    if(u.spoken || opts.tidy) $('#q').value = label;   // acomoda la cita en el buscador
    syncClear();
    addRecent(label);
    const blocks=u.refs.map(resolveRef), total=blocks.reduce((a,b)=>a+b.verses.length,0);
    const gGuardado = total ? Hist.record(label, u.refs) : null;   // [app] grupo donde se guardó
    main.innerHTML = `<div class="col">
      <div class="meta"><h2>${esc(label)}</h2><span class="count">${total?fmt(total)+(total===1?' versículo':' versículos'):''}</span></div>
      ${u.spoken ? `<p class="heard">Entendí <i>«${esc(q)}»</i></p>` : ''}
      ${gGuardado ? `<p class="guardado">Se guardó en <button class="linkbtn" type="button" id="irGrupo">${esc(Hist.nombre(gGuardado))}</button></p>` : ''}
      <div class="results" id="res"></div></div>`;
    const ig=$('#irGrupo'); if(ig) ig.onclick=()=>renderHistory();
    const res=$('#res');
    if(!total){ const FALTAN={za:[6], '2tm':[4]}; const sinCap=u.refs.find(r=>BYID[r.id] && !getChapter(r.id, r.c1) && (r.c1<=Math.max(...BYID[r.id].chapters.map(x=>x.n)) || (FALTAN[r.id]||[]).includes(r.c1)));
      res.innerHTML = sinCap ? `<div class="empty"><b>Este capítulo no está disponible</b>${esc(bookName(sinCap.id))} ${sinCap.c1} no viene en el PDF del que se tomó el texto de esta app.</div>`
        : (()=>{ const r0=u.refs.find(r=>getChapter(r.id, r.c1)); return r0 ? `<div class="empty"><b>Ese versículo no aparece con ese número</b>En esta edición, ${esc(bookName(r0.id))} ${r0.c1} no tiene un versículo con ese número (la numeración cambia un poco entre Biblias).<div class="recent"><button class="btn" type="button" id="verCap" data-id="${r0.id}" data-c="${r0.c1}">Leer ${esc(bookName(r0.id))} ${r0.c1}</button></div></div>` : (()=>{ const r1=u.refs.find(r=>BYID[r.id] && !getChapter(r.id, r.c1));
              if(!r1) return `<div class="empty"><b>No encontré esa cita</b>Revisa el libro, el capítulo y el versículo.</div>`;
              const nC=BYID[r1.id].chapters.length, s2=String(r1.c1); let sug='';
              if(s2.length===2 && r1.v1==null){ const c=+s2[0], v=+s2[1]; if(v>0 && existeVers(r1.id,c,v)) sug=`<div class="recent"><button class="btn" type="button" id="sugCita" data-q="${esc(bookName(r1.id))} ${c},${v}">¿Quisiste decir ${esc(bookName(r1.id))} ${c},${v}?</button></div>`; }
              return `<div class="empty"><b>${esc(bookName(r1.id))} tiene ${nC} capítulo${nC>1?'s':''}</b>No existe el capítulo ${r1.c1}. Revisa el número.${sug}</div>`; })(); })();
      const sg=$('#sugCita'); if(sg) sg.onclick=()=>runQuery(sg.dataset.q, {tidy:true});
      const vc=$('#verCap'); if(vc) vc.onclick=()=>openChapter(vc.dataset.id, +vc.dataset.c); return; }
    blocks.forEach(bl=>{
      if(!bl.verses.length) return;
      const multi=bl.verses.length>1, el=document.createElement('article'); el.className='hit';
      el.innerHTML=`<div class="top"><button class="ref" type="button">${esc(refLabel(bl.ref,true))}</button></div>
        <p class="txt">${bl.verses.map(x=>`${multi?`<sup>${x.l||x.v}</sup>`:''}${esc(x.t)}`).join(' ')}</p>
        ${XREF ? (()=>{ const xs=xrefsForVerses(bl.verses); return xs.length ? `<div class="xrefs"><span class="lbl">Referencias</span>${xrefChips(xs)}</div>` : ''; })() : ''}
        <div class="acts"><button class="pill" type="button" data-a="copy">${ICON_COPY}Copiar</button><button class="pill" type="button" data-a="read">${ICON_READ}Leer capítulo</button>${guideOK()?`<button class="pill" type="button" data-a="guide">${ICON_GUIDE}Guía de estudio</button>`:''}</div>`;
      el.querySelector('.ref').onclick=el.querySelector('[data-a=read]').onclick=()=>openChapter(bl.ref.id, bl.ref.c1, bl.ref.v1);
      el.querySelector('[data-a=copy]').onclick=()=>copyText(citeText(bl.verses));
      bindXref(el);
      const gb=el.querySelector('[data-a=guide]');
      if(gb) gb.onclick=()=>{ const lb=refLabel(bl.ref,true); const ent=Hist.entryFor(lb); openGuide({title:lb, passages:[passagesFromVerses(lb, bl.verses, ent?.note)], saved:ent?.guide, onSave:g=>Hist.setEntryGuide(lb, g)}); };
      res.appendChild(el);
    });
    window.scrollTo({top:0});
    return;
  }
  // [app] solo el nombre de un libro («Eclesiastés», «Ecl», «Qohelet») → abrir ese libro
  if(!/\d/.test(q) && !/["“”]/.test(q)){ const id=findBook(q); if(id && BYID[id]){ addRecent(bookName(id)); renderChapters(id); return; } }
  doTextSearch(q, '');
}
function scopeOptions(sel){
  return `<option value="">Toda la Biblia</option><option value="at"${sel==='at'?' selected':''}>Antiguo Testamento</option><option value="nt"${sel==='nt'?' selected':''}>Nuevo Testamento</option>`
   + BIBLE.books.map(b=>`<option value="${b.id}"${sel===b.id?' selected':''}>${esc(SHORT[b.id]||b.name)}</option>`).join('');
}
function doTextSearch(q, scope){
  const {terms, hits}=textSearch(q, scope);
  main.innerHTML=`<div class="col">
    <div class="meta"><h2>«${esc(q)}»</h2><span class="count">${fmt(hits.length)} ${hits.length===1?'versículo':'versículos'}</span></div>
    <select class="filter" id="scope" aria-label="Dónde buscar">${scopeOptions(scope)}</select>
    <div class="results" id="res"></div></div>`;
  $('#scope').onchange=e=>doTextSearch(q, e.target.value);
  const res=$('#res');
  if(!hits.length){ res.innerHTML=`<div class="empty"><b>Sin resultados</b>Prueba con menos palabras o con la raíz de la palabra (por ejemplo «perdon» en vez de «perdonaré»).</div>`; return; }
  let shown=0;
  const page=()=>{
    const frag=document.createDocumentFragment();
    hits.slice(shown, shown+50).forEach(x=>{
      const el=document.createElement('article'); el.className='hit';
      el.innerHTML=`<div class="top"><button class="ref" type="button">${esc(SHORT[x.b]||BYID[x.b].name)} ${x.c},${x.l||x.v}</button><button class="pill" type="button" data-a="copy">${ICON_COPY}Copiar</button></div>
        <p class="txt">${highlight(x.t, terms)}</p>`;
      el.querySelector('.ref').onclick=()=>openChapter(x.b, x.c, x.v);
      el.querySelector('[data-a=copy]').onclick=()=>copyText(citeText([x]));
      frag.appendChild(el);
    });
    shown+=50; res.appendChild(frag);
    $('#moreBtn')?.remove();
    if(shown<hits.length){ const b=document.createElement('button'); b.className='btn ghost more'; b.id='moreBtn'; b.type='button'; b.textContent=`Mostrar más (${fmt(hits.length-shown)} restantes)`; b.onclick=page; res.after(b); }
  };
  page();
}
function addRecent(label){ let r=store.get('blat-recent', []); r=[label, ...r.filter(x=>x!==label)].slice(0,8); store.set('blat-recent', r); }
function renderHome(){
  setView('search');
  const recent=store.get('blat-recent', []);
  main.innerHTML=`<div class="col">${tarjetaEvangelio()}
    <div class="empty"><b>Escribe o dicta una cita</b>Por ejemplo <button class="linkbtn" data-q="Jn 14,6">Jn 14,6</button>, <button class="linkbtn" data-q="Isaías cuarenta y tres uno al cinco">«Isaías cuarenta y tres uno al cinco»</button> o una palabra como <button class="linkbtn" data-q="paz">paz</button>.
      ${recent.length?`<div class="recent">${recent.map(r=>`<button class="pill" type="button" data-q="${esc(r)}">${esc(r)}</button>`).join('')}</div>`:''}
    </div>
    ${lastRead && getChapter(lastRead.id, lastRead.c) ? `<div style="text-align:center"><button class="btn ghost" id="resume" type="button">Seguir leyendo: ${esc(SHORT[lastRead.id]||bookName(lastRead.id))} ${lastRead.c}</button></div>`:''}
    ${xrefCard()}
    ${statsHTML()}</div>`;
  bindXrefCard();
  const ec=$('#evgCard'); if(ec) ec.onclick=renderEvangelio;
  main.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>runQuery(b.dataset.q));
  $('#resume') && ($('#resume').onclick=()=>openChapter(lastRead.id, lastRead.c));
  bindForget();
}
function statsHTML(){
  return `<div class="foot"><b>La Biblia Latinoamericana</b>: ${BIBLE.books.length} libros y ${fmt(FLAT.length)} versículos. Funciona sin internet; tu historial y tus notas se guardan solo en este teléfono. Versión del 26 de noviembre de 2026 (3). Referencias marginales: <a href="https://www.openbible.info/labs/cross-references/" target="_blank" rel="noopener">OpenBible.info</a> (CC BY).</div>`;
}
function bindForget(){
  const f=$('#forget'); if(!f) return;
  f.onclick=()=>{ if(f.dataset.armed){ forget(); return; } f.dataset.armed='1'; f.textContent='Toca otra vez para confirmar';
    setTimeout(()=>{ if(f.isConnected){ delete f.dataset.armed; f.textContent='Quitar la Biblia de este navegador'; } }, 4000); };
}
function renderBooks(){
  setView('books');
  const groups=[['Antiguo Testamento', BIBLE.books.filter(b=>ORDER[b.id]<NT_START)], ['Nuevo Testamento', BIBLE.books.filter(b=>ORDER[b.id]>=NT_START)]];
  main.innerHTML=`<div class="col">`+groups.map(([t,bs])=>`<section class="testament"><h3>${t}</h3><div class="books">${bs.map(b=>`<button class="book" type="button" data-id="${b.id}"><span>${esc(SHORT[b.id]||b.name)}</span><small>${b.chapters.length}</small></button>`).join('')}</div></section>`).join('')+xrefCard()+statsHTML()+`</div>`;
  bindXrefCard();
  main.querySelectorAll('.book').forEach(el=>el.onclick=()=>renderChapters(el.dataset.id));
  bindForget(); window.scrollTo({top:0});
}
function renderChapters(id){
  const b=BYID[id];
  if(b.chapters.length===1){ openChapter(id, b.chapters[0].n); return; }
  setView('books');
  main.innerHTML=`<div class="col"><div class="crumbs"><button type="button" id="back">Libros</button><span>›</span><span>${esc(b.name)}</span></div>
    <div class="meta" style="margin-top:4px"><h2>${esc(b.name)}${otroNombre(id)}</h2><span class="count">${b.chapters.length} capítulos</span></div>
    <div class="chaps">${b.chapters.map(c=>`<button type="button" data-c="${c.n}">${c.n}</button>`).join('')}</div></div>`;
  $('#back').onclick=renderBooks;
  main.querySelectorAll('[data-c]').forEach(el=>el.onclick=()=>openChapter(id, +el.dataset.c));
  window.scrollTo({top:0});
}
function openChapter(id, c, focusV){
  const b=BYID[id], ch=getChapter(id,c); if(!ch) return;
  lastRead={id, c}; store.set('blat-read', lastRead);
  setView('read');
  const idx=b.chapters.indexOf(ch), prev=b.chapters[idx-1], next=b.chapters[idx+1];
  const bi=BIBLE.books.indexOf(b), prevBook=!prev&&BIBLE.books[bi-1], nextBook=!next&&BIBLE.books[bi+1];
  const nm=SHORT[id]||b.name;
  main.innerHTML=`<div class="col"><div class="crumbs"><button type="button" id="cBooks">Libros</button><span>›</span><button type="button" id="cBook">${esc(nm)}</button><span>›</span><span>Capítulo ${c}</span></div>
    <article class="reader">
      <header><h2>${esc(nm)} <span class="cn">${c}</span>${otroNombre(id)}</h2>
        <div class="tools"><button class="sz" type="button" id="szDown" aria-label="Letra más chica">A−</button><button class="sz" type="button" id="szUp" aria-label="Letra más grande">A+</button><button class="sz wide${studyMode?' on':''}" type="button" id="refsBtn" aria-pressed="${studyMode}">Referencias</button></div></header>
      ${studyMode && XREF
        ? `<div class="chapter study">${ch.v.map(v=>`<div class="vrow"><span class="v${v[5]?' agregado':''}" data-v="${v[0]}"><sup>${vEtiqueta(v)}</sup>${esc(v[1])}</span><div class="mref">${xrefChips(xrefsFor(id,c,v[0]).slice(0,6))}</div></div>`).join('')}</div>`
        : `<p class="chapter">${ch.v.map(v=>`<span class="v${v[5]?' agregado':''}" data-v="${v[0]}"><sup>${vEtiqueta(v)}</sup>${esc(v[1])}</span>`).join(' ')}</p>`}
      <p class="hint">Toca uno o varios versículos para copiarlos con su cita.</p>
      <div class="nav">
        ${prev?`<button class="btn ghost" type="button" id="prev">‹ ${esc(ABBR[id])} ${prev.n}</button>`:prevBook?`<button class="btn ghost" type="button" id="prev">‹ ${esc(SHORT[prevBook.id]||prevBook.name)}</button>`:'<span></span>'}
        ${next?`<button class="btn ghost next" type="button" id="next">${esc(ABBR[id])} ${next.n} ›</button>`:nextBook?`<button class="btn ghost next" type="button" id="next">${esc(SHORT[nextBook.id]||nextBook.name)} ›</button>`:'<span></span>'}
      </div>
    </article></div>`;
  $('#cBooks').onclick=renderBooks; $('#cBook').onclick=()=>renderChapters(id);
  const go=(bk,cn)=>()=>openChapter(bk,cn);
  if(prev) $('#prev').onclick=go(id,prev.n); else if(prevBook) $('#prev').onclick=go(prevBook.id, prevBook.chapters[prevBook.chapters.length-1].n);
  if(next) $('#next').onclick=go(id,next.n); else if(nextBook) $('#next').onclick=go(nextBook.id, nextBook.chapters[0].n);
  const size=d=>{ readSize=Math.min(26, Math.max(15, readSize+d)); document.documentElement.style.setProperty('--read-size', readSize+'px'); store.set('blat-size', readSize); };
  $('#szDown').onclick=()=>size(-1); $('#szUp').onclick=()=>size(1);
  bindXref(main);
  $('#refsBtn').onclick=()=>{
    if(!XREF){ toast('Cargando referencias…'); return; }
    studyMode=!studyMode; store.set('blat-study', studyMode); openChapter(id, c);
  };
  main.querySelectorAll('.v').forEach(el=>el.onclick=()=>{
    const v=+el.dataset.v, key=`${id}|${c}|${v}`, d=ch.v.find(x=>x[0]===v);
    if(selected.has(key)){ selected.delete(key); el.classList.remove('sel'); } else { selected.set(key,{b:id,c,v,t:d[1],p:d[2]}); el.classList.add('sel'); }
    updateSel();
  });
  if(focusV){ const fv=(ch.v.find(x=>focusV>=x[0] && focusV<=(x[4]||x[0]))||[focusV])[0]; const el=main.querySelector(`.v[data-v="${fv}"]`); if(el){ el.classList.add('flash'); requestAnimationFrame(()=>{ const y=el.getBoundingClientRect().top+scrollY-band.offsetHeight-80; window.scrollTo({top:Math.max(0,y), behavior:'smooth'}); }); } }
  else window.scrollTo({top:0});
}
function updateSel(){ const n=selected.size; $('#selbar').hidden=n===0; $('#selCount').textContent=n===1?'1 versículo':`${n} versículos`; }
function clearSel(){ selected.clear(); main.querySelectorAll('.v.sel').forEach(e=>e.classList.remove('sel')); updateSel(); }
$('#selCopy').onclick=()=>copyText(citeText([...selected.values()]));
$('#selClear').onclick=clearSel;

/* ---------- Referencias marginales (OpenBible.info) ---------- */
const OSIS = {Gen:'gn',Exod:'ex',Lev:'lv',Num:'nm',Deut:'dt',Josh:'jos',Judg:'jue',Ruth:'rt','1Sam':'1s','2Sam':'2s','1Kgs':'1r','2Kgs':'2r','1Chr':'1cr','2Chr':'2cr',Ezra:'esd',Neh:'ne',Esth:'est',Job:'jb',Ps:'sal',Prov:'pr',Eccl:'qo',Song:'ct',Isa:'is',Jer:'jer',Lam:'lam',Ezek:'ez',Dan:'dn',Hos:'os',Joel:'jl',Amos:'am',Obad:'abd',Jonah:'jon',Mic:'mi',Nah:'na',Hab:'ha',Zeph:'so',Hag:'ag',Zech:'za',Mal:'mal',Matt:'mt',Mark:'mc',Luke:'lc',John:'jn',Acts:'hch',Rom:'rom','1Cor':'1co','2Cor':'2co',Gal:'gal',Eph:'ef',Phil:'flp',Col:'col','1Thess':'1ts','2Thess':'2ts','1Tim':'1tm','2Tim':'2tm',Titus:'tit',Phlm:'flm',Heb:'heb',Jas:'stg','1Pet':'1p','2Pet':'2p','1John':'1jn','2John':'2jn','3John':'3jn',Jude:'jds',Rev:'ap'};
// Diferencias de numeración con La Biblia Latinoamérica (Joel y Malaquías)
function fixNum(id,c,v){ if(id==='jl'){ if(c===2 && v>=28) return [3, v-27]; if(c===3) return [4, v]; } if(id==='mal' && c===4) return [3, v+18]; return [c,v]; }
function osisRef(s){
  const [a,b]=s.split('-'); const pa=a.split('.'); const id=OSIS[pa[0]]; if(!id || pa.length<3) return null;
  let [c,v]=fixNum(id,+pa[1],+pa[2]); let c2=c, v2=v;
  if(b){ const pb=b.split('.'); if(OSIS[pb[0]]===id && pb.length>=3) [c2,v2]=fixNum(id,+pb[1],+pb[2]); }
  return {id,c,v,c2,v2};
}
let XREF=null; const XREF_INCLUIDAS=true;   // [app] vienen dentro de la app  // {"jn.3.16": ["rom|5|8|5|8", ...]}
const XKEY='xref-v1';
function xrefLabel(s){
  const [id,c,v,c2,v2]=s.split('|'); const C=+c, V=+v, C2=+c2, V2=+v2;
  return `${ABBR[id]} ${C},${V}` + (C2!==C ? `-${C2},${V2}` : V2!==V ? `-${V2}` : '');
}
function xrefsFor(id, c, v){ return (XREF && XREF[`${id}.${c}.${v}`]) || []; }
function xrefsForVerses(verses, max){
  const seen=new Set(), self=new Set(verses.map(x=>`${x.b}|${x.c}|${x.v}`)), out=[];
  const per = verses.length>1 ? 3 : 8;
  for(const x of verses){
    for(const s of xrefsFor(x.b, x.c, x.v).slice(0, per)){
      const k=s.split('|').slice(0,3).join('|');
      if(seen.has(s) || self.has(k)) continue; seen.add(s); out.push(s);
      if(out.length>=(max||12)) return out;
    }
  }
  return out;
}
function xrefChips(list){
  return list.map(s=>`<button class="xr" type="button" data-q="${esc(xrefLabel(s))}">${esc(xrefLabel(s))}</button>`).join('');
}
function bindXref(root){ root.querySelectorAll('.xr').forEach(b=>b.onclick=e=>{ e.stopPropagation(); runQuery(b.dataset.q); }); }
async function xrefSave(data){ try{ const db=await idb(); await new Promise((res,rej)=>{ const tx=db.transaction(STORE,'readwrite'); tx.objectStore(STORE).put(data, XKEY); tx.oncomplete=res; tx.onerror=()=>rej(tx.error); }); }catch(e){} }
async function xrefLoadStored(){ try{ const db=await idb(); return await new Promise(res=>{ const r=db.transaction(STORE,'readonly').objectStore(STORE).get(XKEY); r.onsuccess=()=>res(r.result||null); r.onerror=()=>res(null); }); }catch(e){ return null; } }
async function xrefForget(){ try{ const db=await idb(); await new Promise(res=>{ const tx=db.transaction(STORE,'readwrite'); tx.objectStore(STORE).delete(XKEY); tx.oncomplete=res; tx.onerror=res; }); }catch(e){} XREF=null; toast('Referencias quitadas'); rerender(); }
function parseXrefText(txt){
  const tmp={}; let n=0;
  const lines=txt.split(/\r?\n/);
  for(const line of lines){
    if(!line || line.startsWith('From') || line.startsWith('#')) continue;
    const [from,to,votes]=line.split('\t'); const vt=+votes;
    if(!from || !to || !(vt>0)) continue;
    const f=osisRef(from), t=osisRef(to); if(!f || !t) continue;
    const key=`${f.id}.${f.c}.${f.v}`;
    (tmp[key] ||= []).push([vt, `${t.id}|${t.c}|${t.v}|${t.c2}|${t.v2}`]); n++;
  }
  const out={};
  for(const k in tmp){ out[k]=tmp[k].sort((a,b)=>b[0]-a[0]).slice(0,10).map(x=>x[1]); }
  return {map:out, count:n};
}
async function loadXrefFile(file){
  toast('Leyendo referencias…');
  try{
    let txt;
    if(/\.zip$/i.test(file.name) || file.type.includes('zip')){
      if(!window.JSZip) throw new Error('nozip');
      const zip=await JSZip.loadAsync(await file.arrayBuffer());
      const entry=Object.values(zip.files).find(f=>!f.dir && /\.txt$/i.test(f.name));
      if(!entry) throw new Error('notxt');
      txt=await entry.async('string');
    } else txt=await file.text();
    const {map, count}=parseXrefText(txt);
    const verses=Object.keys(map).length;
    if(verses<100){ toast('Ese archivo no parece ser el de referencias de OpenBible'); return; }
    XREF=map; xrefSave(map);
    toast(`Listo: referencias para ${fmt(verses)} versículos`);
    rerender();
  }catch(e){ console.error(e); toast('No pude leer ese archivo de referencias'); }
}
function xrefCard(){ if(XREF_INCLUIDAS) return '';
  if(XREF) return `<div class="xcard on"><div><b>Referencias marginales activas</b><span>${fmt(Object.keys(XREF).length)} versículos con referencias. Aparecen bajo cada cita y en el modo estudio al leer.</span></div><button class="linkbtn" id="xForget" type="button">Quitar</button></div>`;
  return `<div class="xcard"><div><b>Agrega referencias marginales</b><span>Descarga gratis el archivo <i>cross-references.zip</i> de <a href="https://www.openbible.info/labs/cross-references/" target="_blank" rel="noopener">OpenBible.info</a> y cárgalo aquí, sin descomprimirlo. Solo se hace una vez.</span></div><button class="btn" id="xPick" type="button">Cargar referencias</button></div>`;
}
function bindXrefCard(){
  $('#xPick') && ($('#xPick').onclick=()=>$('#xfile').click());
  if($('#xForget')) armButton($('#xForget'), 'Toca otra vez', xrefForget);
}
function rerender(){
  if(!BIBLE) return;
  if(view==='read' && lastRead) openChapter(lastRead.id, lastRead.c);
  else if(view==='history') renderHistory();
  else if(view==='books') renderBooks();
  else renderSearch(lastQuery);
}

/* ---------- Guía de estudio (la escribe Claude) ---------- */
let SAMPLE=null;
Promise.resolve(window.claude?.use ? window.claude.use('sample') : null).then(s=>{ SAMPLE=s||null; if(SAMPLE && BIBLE) rerender(); }).catch(()=>{});
const guideOK = ()=>!!SAMPLE;
const ICON_GUIDE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"/></svg>';
function guideToText(g){
  if(!g) return '';
  const L=[];
  L.push(`GUÍA DE ESTUDIO — ${g.titulo||''}`.trim());
  if(g.contexto) L.push('', 'Contexto', g.contexto);
  if(g.ideas?.length) L.push('', 'Ideas principales', ...g.ideas.map(x=>`• ${x}`));
  if(g.palabras?.length) L.push('', 'Palabras clave', ...g.palabras.map(p=>`• ${p.termino}: ${p.explicacion}`));
  if(g.preguntas?.length) L.push('', 'Preguntas para reflexionar', ...g.preguntas.map((x,i)=>`${i+1}. ${x}`));
  if(g.aplicacion) L.push('', 'Para la vida', g.aplicacion);
  if(g.oracion) L.push('', 'Oración', g.oracion);
  if(g.profundizar?.length) L.push('', `Para profundizar: ${g.profundizar.join('; ')}`);
  return L.join('\n');
}
function guideHTML(g){
  const sec=(t,b)=>b?`<section><h4>${t}</h4>${b}</section>`:'';
  return `<div class="guide">
    ${g.titulo?`<h3>${esc(g.titulo)}</h3>`:''}
    ${sec('Contexto', g.contexto?`<p>${esc(g.contexto)}</p>`:'')}
    ${sec('Ideas principales', g.ideas?.length?`<ul>${g.ideas.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'')}
    ${sec('Palabras clave', g.palabras?.length?`<dl>${g.palabras.map(p=>`<dt>${esc(p.termino)}</dt><dd>${esc(p.explicacion)}</dd>`).join('')}</dl>`:'')}
    ${sec('Preguntas para reflexionar', g.preguntas?.length?`<ol>${g.preguntas.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:'')}
    ${sec('Para la vida', g.aplicacion?`<p>${esc(g.aplicacion)}</p>`:'')}
    ${sec('Oración', g.oracion?`<p class="pray">${esc(g.oracion)}</p>`:'')}
    ${sec('Para profundizar', g.profundizar?.length?`<div class="xrefs">${g.profundizar.map(r=>`<button class="xr" type="button" data-q="${esc(r)}">${esc(r)}</button>`).join('')}</div>`:'')}
  </div>`;
}
function guidePrompt(title, passages){
  const blocks = passages.map(p=>`### ${p.label}\n${p.text}${p.note?`\nNota del alumno: ${p.note}`:''}${p.xrefs?.length?`\nReferencias cruzadas: ${p.xrefs.join('; ')}`:''}`).join('\n\n');
  return `Eres un catequista católico con buena formación bíblica. Prepara una guía de estudio en español de México para una persona que asiste a clases de Biblia en su parroquia y usa La Biblia Latinoamérica.

Tema o clase: ${title}

Pasajes (texto de La Biblia Latinoamérica):
${blocks}

Instrucciones:
- Sé fiel al texto y a la enseñanza de la Iglesia Católica; lenguaje sencillo y cálido, sin tecnicismos innecesarios.
- Si hay varios pasajes, muestra lo que los une.
- No copies los pasajes completos: explícalos.
- Las citas van con el formato de esta Biblia: libro abreviado, capítulo, coma, versículo (ej. "Jn 3,16", "Rom 5,1-5"). Prefiere las referencias cruzadas que te doy.

Responde SOLO con un objeto JSON, sin texto antes ni después, con esta forma:
{"titulo": "título breve de la guía",
 "contexto": "2 a 4 frases: quién escribe, a quién, qué está pasando",
 "ideas": ["3 a 5 ideas principales, una frase cada una"],
 "palabras": [{"termino": "palabra clave del pasaje", "explicacion": "qué significa aquí, 1 frase"}],
 "preguntas": ["4 a 6 preguntas abiertas para reflexionar o comentar en grupo"],
 "aplicacion": "2 o 3 frases para llevarlo a la vida diaria",
 "oracion": "una oración breve de 2 a 4 frases",
 "profundizar": ["3 a 6 citas relacionadas"]}`;
}
function openGuide({title, passages, saved, onSave}){
  document.getElementById('sheet')?.remove();
  const s=document.createElement('div'); s.id='sheet'; s.className='sheet';
  s.innerHTML=`<div class="sheet-in gsheet" role="dialog" aria-modal="true" aria-label="Guía de estudio">
    <div class="sheet-h"><b>Guía de estudio</b><span>${esc(title)}</span></div>
    <div class="gbody" id="gbody"></div>
    <div class="sheet-a"><button class="btn ghost" type="button" id="gClose">Cerrar</button><button class="btn" type="button" id="gMain">Copiar guía</button></div></div>`;
  document.body.appendChild(s);
  const body=s.querySelector('#gbody'), mainBtn=s.querySelector('#gMain');
  let ctl=null, guide=saved||null;
  const close=()=>{ ctl?.abort(); s.remove(); };
  s.querySelector('#gClose').onclick=close;
  s.addEventListener('click', e=>{ if(e.target===s) close(); });
  const show=()=>{
    body.innerHTML=guideHTML(guide)+`<div class="gfoot"><button class="linkbtn" id="gRedo" type="button">Hacer otra versión</button></div>`;
    bindXref(body); body.querySelectorAll('.xr').forEach(b=>b.addEventListener('click', close));
    body.querySelector('#gRedo').onclick=generate;
    mainBtn.disabled=false; mainBtn.textContent='Copiar guía'; mainBtn.onclick=()=>copyText(guideToText(guide), {label:'Guía copiada'});
  };
  async function generate(){
    if(!SAMPLE){ body.innerHTML='<p class="gwait">La guía de estudio no está disponible en esta vista.</p>'; return; }
    ctl=new AbortController();
    body.innerHTML='<div class="gwait"><span class="spin"></span>Preparando tu guía… suele tardar entre 20 segundos y un minuto.</div>';
    mainBtn.disabled=false; mainBtn.textContent='Detener'; mainBtn.onclick=()=>ctl.abort();
    try{
      const g=await SAMPLE.json(guidePrompt(title, passages), {signal:ctl.signal, cache:false});
      if(!g || typeof g!=='object') throw {code:'bad'};
      guide=g; show(); if(onSave) onSave(g);
    }catch(e){
      const msg = e?.code==='cancelled' ? 'Se detuvo la guía.' : e?.code==='not_granted' ? 'Para hacer guías hay que permitir que la página use Claude.' : e?.code==='rate_limited' ? 'Hay muchas solicitudes; intenta en un momento.' : 'No se pudo preparar la guía. Intenta de nuevo.';
      body.innerHTML=`<p class="gwait">${msg}</p>`;
      mainBtn.textContent='Intentar de nuevo'; mainBtn.onclick=generate;
    }
  }
  if(guide) show(); else generate();
}
function passagesFromVerses(label, verses, note){
  return {label, text: verses.map(v=>verses.length>1?`${v.v} ${v.t}`:v.t).join(' '), note, xrefs: XREF ? xrefsForVerses(verses, 8).map(xrefLabel) : []};
}

/* ---------- [app] Historial por grupos ----------
   Las citas que se buscan se guardan en el GRUPO ACTIVO (por ejemplo «Clase del 25 de noviembre»)
   hasta que la persona elige o crea otro grupo. Así las citas de clases distintas no se mezclan.
   Se guarda solo en este teléfono (localStorage). Los días del historial anterior quedan como grupos. */
const Hist = (function(){
  const LKEY='blat-hist', AKEY='blat-grupo';
  let st = store.get(LKEY, {entries:{}, days:{}});
  st.entries = st.entries || {}; st.days = st.days || {};
  let recording = store.get('blat-rec', true);
  let activo = store.get(AKEY, null);
  const listeners=[];
  const emit=()=>listeners.forEach(f=>f());
  const saveLocal=()=>store.set(LKEY, st);
  const slug = s => norm(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80) || 'cita';
  const esFecha = id => /^\d{4}-\d{2}-\d{2}$/.test(id);
  // historial anterior (agrupado por día): cada día queda como un grupo
  Object.values(st.entries).forEach(e=>{ if(e.day && !st.days[e.day]) st.days[e.day]={}; });
  Object.keys(st.days).forEach(k=>{ const g=st.days[k]; if(!g.creado) g.creado = esFecha(k) ? new Date(k+'T12:00:00').getTime() : Date.now(); });
  saveLocal();
  if(activo && !st.days[activo]) activo=null;

  function fechaCorta(ms){ return new Date(ms).toLocaleDateString('es-MX',{day:'numeric', month:'long', year:'numeric'}); }
  function nombre(id){
    const g=st.days[id]; if(!g) return '';
    if(g.name) return g.name;
    return esFecha(id) ? 'Clase del '+fechaCorta(new Date(id+'T12:00:00').getTime()) : 'Grupo sin nombre';
  }
  function crear(nom){
    let id; do { id='g'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); } while(st.days[id]);   // único aunque se creen dos en el mismo instante
    st.days[id]={name:(nom||'').trim() || ('Clase del '+fechaCorta(Date.now())), creado:Date.now()};
    activo=id; store.set(AKEY, id); saveLocal(); emit();
    return id;
  }
  function usar(id){ if(!st.days[id]) return; if(st.days[id].guardada){ st.days[id]={...st.days[id]}; delete st.days[id].guardada; saveLocal(); } activo=id; store.set(AKEY, id); emit(); }
  // «Guardar clase»: la clase queda guardada tal cual y la siguiente cita empieza una clase nueva
  function guardar(id){ if(!st.days[id]) return; st.days[id]={...st.days[id], guardada:Date.now()}; if(activo===id){ activo=null; store.set(AKEY, null); } saveLocal(); emit(); }
  return {
    on:f=>listeners.push(f), connect(){}, get synced(){ return false; },
    get recording(){ return recording; },
    setRecording(v){ recording=v; store.set('blat-rec', v); },
    get activo(){ return activo && st.days[activo] ? activo : null; },
    nombre, crear, usar, guardar, guardada(id){ return !!st.days[id]?.guardada; },
    creado(id){ return st.days[id]?.creado || Date.now(); },
    record(label, refs){
      if(!recording) return null;
      if(!activo || !st.days[activo]) crear();
      const id=`${activo}_${slug(label)}`, prev=st.entries[id];
      st.entries[id]={label, refs:JSON.stringify(refs), day:activo, at:Date.now(), note: prev?.note || ''};
      saveLocal(); emit();
      return activo;
    },
    setNote(id, note){ const e=st.entries[id]; if(!e || e.note===note) return; st.entries[id]={...e, note}; saveLocal(); },
    setDayName(gid, name){ if(!st.days[gid]) return; const n=(name||'').trim(); if((st.days[gid].name||'')===n) return; st.days[gid]={...st.days[gid], name:n}; saveLocal(); emit(); },
    entryFor(label){ return activo ? (st.entries[`${activo}_${slug(label)}`] || null) : null; },
    setEntryGuide(){}, setEntryGuideById(){}, setDayGuide(){},
    removeEntry(id){ delete st.entries[id]; saveLocal(); emit(); },
    removeDay(gid){
      Object.keys(st.entries).filter(id=>st.entries[id].day===gid).forEach(id=>{ delete st.entries[id]; });
      delete st.days[gid];
      if(activo===gid){ activo=null; store.set(AKEY, null); }
      saveLocal(); emit();
    },
    byDay(){
      const groups={};
      Object.keys(st.days).forEach(k=>{ groups[k]=[]; });
      Object.entries(st.entries).forEach(([id,e])=>{ (groups[e.day] ||= []).push({id, ...e}); });
      return Object.keys(groups)
        .sort((a,b)=> (b===activo)-(a===activo) || (st.days[b]?.creado||0)-(st.days[a]?.creado||0))
        .map(day=>({day, name:nombre(day), guide:null, items:groups[day].sort((a,b)=>a.at-b.at)}));
    }
  };
})();

const dateLong = day => { const [y,m,d]=day.split('-').map(Number); const s=new Date(y,m-1,d).toLocaleDateString('es-MX',{weekday:'long', day:'numeric', month:'long', year:'numeric'}); return s.charAt(0).toUpperCase()+s.slice(1); };
const timeShort = ms => new Date(ms).toLocaleTimeString('es-MX',{hour:'numeric', minute:'2-digit'});
const fechaHora = ms => { const d=new Date(ms); return d.toLocaleDateString('es-MX',{day:'numeric', month:'short'})+' · '+timeShort(ms); };
function entryVerses(e){ try{ return JSON.parse(e.refs).flatMap(r=>resolveRef(r).verses); }catch(err){ return []; } }
function dayText(g){
  const body = g.items.map(e=>{
    const vs=entryVerses(e);
    const txt = vs.length ? vs.map(v=> vs.length>1 ? `${v.l||v.v} ${v.t}` : v.t).join(' ') : '(texto no disponible)';
    return `${e.label}\n${txt}${e.note ? `\nNota: ${e.note}` : ''}`;
  }).join('\n\n');
  return `${Hist.nombre(g.day)}\n\n${body}\n`;
}
function armButton(btn, label, action){
  btn.onclick=()=>{
    if(btn.dataset.armed){ action(); return; }
    btn.dataset.armed='1'; const old=btn.innerHTML; btn.classList.add('armed'); btn.textContent=label;
    setTimeout(()=>{ if(btn.isConnected){ delete btn.dataset.armed; btn.classList.remove('armed'); btn.innerHTML=old; } }, 3500);
  };
}
const ICON_GUARDAR='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg>';
const ICON_X='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const abiertas=new Set();   // clases guardadas que la persona abrió para ver sus citas
function renderHistory(enfocar){
  setView('history');
  const groups=Hist.byDay(), act=Hist.activo;
  main.innerHTML=`<div class="col">
    <div class="histhead"><div class="meta"><h2>Historial</h2><span class="count">${groups.length} ${groups.length===1?'grupo':'grupos'}</span></div>
      <p>Cada cita que buscas se guarda en el <b>grupo activo</b>. Crea un grupo para cada clase o tema y cámbialo cuando quieras: las citas no se mezclan.</p>
      <span class="sync"><i style="background:var(--ink-soft)"></i>Guardado en este teléfono</span>
    </div>
    <div class="grupo-activo">
      <label class="lbl" for="grupoSel">Guardando en</label>
      <div class="ga-fila">
        <select id="grupoSel" class="filter">${act?'':'<option value="" selected>— Elige o crea un grupo —</option>'}${groups.map(g=>`<option value="${esc(g.day)}"${g.day===act?' selected':''}>${esc(g.name)}</option>`).join('')}</select>
        <button class="pill primary" id="grupoNuevo" type="button">+ Nuevo grupo</button>
      </div>
    </div>
    <div class="recbar"><span>Guardar mis búsquedas de citas</span><button class="switch" id="recSw" role="switch" aria-checked="${Hist.recording}" aria-label="Guardar búsquedas en el historial" type="button"></button></div>
    <div class="days" id="days"></div></div>`;
  $('#recSw').onclick=e=>{ const v=!Hist.recording; Hist.setRecording(v); e.currentTarget.setAttribute('aria-checked', v); toast(v?'El historial está activo':'Pausado: las búsquedas no se guardarán'); };
  $('#grupoSel').onchange=e=>{ if(e.target.value){ Hist.usar(e.target.value); toast('Ahora se guarda en «'+Hist.nombre(e.target.value)+'»'); } };
  $('#grupoNuevo').onclick=()=>{ const id=Hist.crear(); toast('Grupo nuevo: «'+Hist.nombre(id)+'». Puedes cambiarle el nombre.'); renderHistory(id); };
  const wrap=$('#days');
  if(!groups.length){ wrap.innerHTML=`<div class="empty"><b>Aún no hay grupos</b>Toca «+ Nuevo grupo» (por ejemplo, para la clase de hoy) o busca una cita, como <button class="linkbtn" data-q="Hch 2,1-4">Hch 2,1-4</button>, y se creará uno con la fecha de hoy.</div>`; wrap.querySelector('[data-q]').onclick=e=>runQuery(e.target.dataset.q); return; }
  groups.forEach(g=>{
    const esAct = g.day===act;
    const guardada=Hist.guardada(g.day), plegada = guardada && !esAct && !abiertas.has(g.day);   // guardada: solo se ve el cuadro del título
    const sec=document.createElement('section'); sec.className='day'+(esAct?' activo':'')+(plegada?' plegada':'');
    sec.innerHTML=`<header>
        <span class="date">${esAct?'<span class="badge-activo">● Guardando aquí</span> · ':''}Creado el ${esc(new Date(Hist.creado(g.day)).toLocaleDateString('es-MX',{day:'numeric', month:'long', year:'numeric'}))}</span>
        <div class="tit-fila"><textarea class="name" rows="1" placeholder="Nombre del grupo…" aria-label="Nombre del grupo" maxlength="80">${esc(g.name)}</textarea>
          ${Hist.guardada(g.day) ? '<span class="guardada-ok" title="Clase guardada">✓ Guardada</span>' : `<button class="btn-guardar" type="button" data-a="guardar" aria-label="Guardar clase"${g.items.length?'':' disabled'}>${ICON_GUARDAR}<span>Guardar</span></button>`}</div>
        <div class="dacts"><span class="cnt">${g.items.length} ${g.items.length===1?'cita':'citas'}</span>
          ${guardada && !esAct ? `<button class="pill" type="button" data-a="ver" aria-expanded="${!plegada}">${plegada?'Ver citas ▾':'Ocultar ▴'}</button>` : ''}
          ${plegada ? '' : `          ${esAct?'':`<button class="pill" type="button" data-a="usar">${Hist.guardada(g.day)?'Seguir esta clase':'Guardar aquí'}</button>`}
          <button class="pill primary" type="button" data-a="copyall"${g.items.length?'':' disabled'}>${ICON_COPY}Copiar todo</button>
          <button class="pill danger" type="button" data-a="delday">Borrar</button>`}</div>
      </header>`;
    const ver=sec.querySelector('[data-a=ver]'); if(ver) ver.onclick=()=>{ abiertas.has(g.day) ? abiertas.delete(g.day) : abiertas.add(g.day); renderHistory(); };
    if(plegada){ const nm0=sec.querySelector('.name'); nm0.addEventListener('change', ()=>{ Hist.setDayName(g.day, nm0.value); }); wrap.appendChild(sec); requestAnimationFrame(()=>{ nm0.style.height='auto'; nm0.style.height=nm0.scrollHeight+'px'; }); return; }
    if(!g.items.length){ const v=document.createElement('p'); v.className='vacio-grupo'; v.textContent= esAct ? 'Escribe arriba el tema de esta clase. Las citas que busques se guardarán aquí.' : 'Sin citas.'; sec.appendChild(v); }
    g.items.forEach(e=>{
      const vs=entryVerses(e), preview=vs.map(v=>v.t).join(' ');
      const row=document.createElement('div'); row.className='entry';
      row.innerHTML=`<time>${esc(fechaHora(e.at))}</time>
        <button class="eref" type="button">${esc(e.label)}</button>
        <button class="del" type="button" aria-label="Borrar ${esc(e.label)}">${ICON_X}</button>
        ${preview?`<p class="prev">${esc(preview)}</p>`:''}
        <textarea class="note" rows="1" placeholder="Agregar nota…" aria-label="Nota para ${esc(e.label)}" maxlength="2000">${esc(e.note||'')}</textarea>`;
      row.querySelector('.eref').onclick=()=>runQuery(e.label);
      armButton(row.querySelector('.del'), 'Borrar', ()=>{ Hist.removeEntry(e.id); toast('Cita borrada'); });
      const ta=row.querySelector('.note'); let tmr;
      const save=()=>{ clearTimeout(tmr); Hist.setNote(e.id, ta.value.trim()); };
      ta.addEventListener('input', ()=>{ clearTimeout(tmr); tmr=setTimeout(save, 700); ta.style.height='auto'; ta.style.height=ta.scrollHeight+'px'; });
      ta.addEventListener('blur', save);
      sec.appendChild(row);
    });
    const nm=sec.querySelector('.name');
    nm.addEventListener('change', ()=>{ Hist.setDayName(g.day, nm.value); });
    const alto=()=>{ nm.style.height='auto'; nm.style.height=nm.scrollHeight+'px'; }; nm.addEventListener('input', alto); requestAnimationFrame(alto);
    nm.addEventListener('keydown', ev=>{ if(ev.key==='Enter'){ ev.preventDefault(); nm.blur(); } });
    const gb=sec.querySelector('[data-a=guardar]'); if(gb) gb.onclick=()=>{
      Hist.setDayName(g.day, nm.value); Hist.guardar(g.day); abiertas.delete(g.day);
      const nueva=Hist.crear();   // clase nueva lista para escribir su tema
      renderHistory(nueva); toast('Clase guardada. Escribe el tema de la nueva clase.'); };
    const us=sec.querySelector('[data-a=usar]'); if(us) us.onclick=()=>{ Hist.usar(g.day); toast('Ahora se guarda en «'+Hist.nombre(g.day)+'»'); };
    sec.querySelector('[data-a=copyall]').onclick=()=>{ const cur=Hist.byDay().find(x=>x.day===g.day); if(cur && cur.items.length) copyText(dayText(cur), {show:true, title:cur.name, label:`Copiadas ${cur.items.length} citas`}); };
    armButton(sec.querySelector('[data-a=delday]'), 'Toca otra vez para borrar el grupo', ()=>{ Hist.removeDay(g.day); toast('Grupo borrado'); });
    wrap.appendChild(sec);
    if(enfocar===g.day){ nm.focus({preventScroll:true}); nm.select(); requestAnimationFrame(()=>sec.scrollIntoView({block:'center'})); }   // sin espera: así el iPhone abre el teclado
  });
  wrap.querySelectorAll('.note').forEach(ta=>{ if(ta.value){ ta.style.height=ta.scrollHeight+'px'; } });
}
// re-pintar cuando cambia algo (sin interrumpir si se está escribiendo una nota o un nombre)
Hist.on(()=>{ const a=document.activeElement; const typing=a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest('.col'); if(view==='history' && !typing) renderHistory(); });


/* ---------- Buscador: sugerencias, borrar, enviar ---------- */
const qEl=$('#q'), sugg=$('#suggest');
function syncClear(){ $('#clearQ').hidden = !qEl.value; }
function runQuery(q, opts){ qEl.value=q; syncClear(); hideSuggest(); if(!BIBLE){ toast('Cargando…'); return; } qEl.blur(); renderSearch(q, opts); }
let suggIdx=-1;
function hideSuggest(){ sugg.hidden=true; suggIdx=-1; }
function showSuggest(){
  const v=qEl.value; const m=v.match(/^\s*((?:[1-3]\s*)?[^\d;]*)$/);
  if(!BIBLE || !m || m[1].trim().length<2){ hideSuggest(); return; }
  const ids=bookCandidates(m[1]);
  if(!ids.length || (ids.length===1 && norm(m[1]).trim()===norm(SHORT[ids[0]]||bookName(ids[0])))){ hideSuggest(); return; }
  sugg.innerHTML=ids.map((id,i)=>`<button type="button" role="option" data-id="${id}"><b>${esc(SHORT[id]||bookName(id))}</b><small>${esc(ABBR[id])}</small></button>`).join('');
  sugg.hidden=false; suggIdx=-1;
  sugg.querySelectorAll('button').forEach(b=>{ b.onmousedown=e=>e.preventDefault(); b.onclick=()=>pickBook(b.dataset.id); });
}
function pickBook(id){ qEl.value=(SHORT[id]||bookName(id))+' '; hideSuggest(); syncClear(); qEl.focus(); }
qEl.addEventListener('input', ()=>{ syncClear(); showSuggest(); });
qEl.addEventListener('blur', ()=>setTimeout(hideSuggest, 120));
qEl.addEventListener('keydown', e=>{
  if(sugg.hidden) return;
  const bs=[...sugg.querySelectorAll('button')];
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); suggIdx=(suggIdx+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length; bs.forEach((b,i)=>b.classList.toggle('act', i===suggIdx)); }
  else if(e.key==='Tab' || (e.key==='Enter' && suggIdx>=0)){ e.preventDefault(); pickBook(bs[Math.max(0,suggIdx)].dataset.id); }
  else if(e.key==='Escape') hideSuggest();
});
$('#clearQ').onclick=()=>{ qEl.value=''; syncClear(); hideSuggest(); qEl.focus(); };
$('#searchForm').addEventListener('submit', e=>{ e.preventDefault(); runQuery(qEl.value, {tidy:true}); });
$('#chips').querySelectorAll('.chip').forEach(c=>c.onclick=()=>runQuery(c.textContent, {tidy:true}));
$('#tabSearch').onclick=()=>{ if(!BIBLE) return renderLoader(); renderSearch(lastQuery); };
$('#tabBooks').onclick=()=>{ if(!BIBLE){ toast('Cargando…'); return; } renderBooks(); };
$('#tabHist').onclick=()=>{ if(!BIBLE){ toast('Cargando…'); return; } renderHistory(); };
$('#tabRead').onclick=()=>{ if(lastRead) openChapter(lastRead.id, lastRead.c); };
$('#xfile').addEventListener('change', e=>{ const f=e.target.files[0]; if(f) loadXrefFile(f); e.target.value=''; });
function showXrefHelp(){
  document.getElementById('sheet')?.remove();
  const s=document.createElement('div'); s.id='sheet'; s.className='sheet';
  s.innerHTML=`<div class="sheet-in" role="dialog" aria-modal="true" aria-label="Referencias marginales"><div class="sheet-h"><b>Referencias marginales</b><span>Una sola vez: carga el archivo de referencias cruzadas.</span></div>${xrefCard()}<div class="sheet-a"><button class="btn ghost" type="button" id="sheetClose">Cerrar</button><span></span></div></div>`;
  document.body.appendChild(s); s.querySelector('#sheetClose').onclick=()=>s.remove(); s.addEventListener('click', e=>{ if(e.target===s) s.remove(); });
  s.querySelector('#xPick').onclick=()=>{ s.remove(); $('#xfile').click(); };
}

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

/* ---------- Guardado local ---------- */
const DB='biblia-latam', STORE='indice', KEY='v1';
function idb(){ return new Promise((res,rej)=>{ try{ const r=indexedDB.open(DB,1); r.onupgradeneeded=()=>r.result.createObjectStore(STORE); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }catch(e){ rej(e); } }); }
async function saveIndex(data){ try{ const db=await idb(); await new Promise((res,rej)=>{ const tx=db.transaction(STORE,'readwrite'); tx.objectStore(STORE).put(data,KEY); tx.oncomplete=res; tx.onerror=()=>rej(tx.error); }); }catch(e){} }
async function loadIndex(){ try{ const db=await idb(); return await new Promise(res=>{ const r=db.transaction(STORE,'readonly').objectStore(STORE).get(KEY); r.onsuccess=()=>res(r.result||null); r.onerror=()=>res(null); }); }catch(e){ return null; } }
async function forget(){ try{ const db=await idb(); await new Promise(res=>{ const tx=db.transaction(STORE,'readwrite'); tx.objectStore(STORE).delete(KEY); tx.oncomplete=res; tx.onerror=res; }); }catch(e){} BIBLE=null; FLAT=[]; BYID={}; $('#statusText').textContent=''; renderLoader(); toast('Listo, se quitó de este navegador'); }
function useBible(data){
  BIBLE=data; BYID={}; FLAT=[];
  data.books.forEach(b=>{ BYID[b.id]=b; const bi=ORDER[b.id]; b.chapters.forEach(ch=>ch.v.forEach(v=>FLAT.push({b:b.id, bi, c:ch.n, v:v[0], l:v[3], t:v[1], p:v[2], n:norm(v[1])}))); });
  $('#statusText').innerHTML=`${data.books.length} libros<br>${fmt(FLAT.length)} versículos`;
}

/* ---------- Arranque ---------- */
const saved=store.get('blat-q','');
useBible(desdeDatos(window.BIBLIA));
(function(){ const sx=document.createElement('script'); sx.src='js/referencias.js'; sx.async=true;
  sx.onload=()=>{ if(window.XREF_DATA){ XREF=window.XREF_DATA; const a=document.activeElement; if(!(a && /^(INPUT|TEXTAREA)$/.test(a.tagName))) rerender(); } };
  document.head.appendChild(sx); })();
if(saved){ qEl.value=saved; syncClear(); renderSearch(saved); } else renderHome();
/* ---------- [app] Evangelio del día: abre la página del día en Misal.mx (calendario de México) ---------- */
function hoyMX(){ return new Intl.DateTimeFormat('en-CA', {timeZone:'America/Mexico_City', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date()); }
function enlaceMisal(){ return 'https://misal.mx/' + hoyMX(); }
function tarjetaEvangelio(){
  return `<button class="evg-card" id="evgCard" type="button"><span class="ico">✝</span><div><b>Evangelio del día</b><span>${esc(dateLong(hoyMX()))}</span><small>Lecturas de la misa según el calendario de México</small></div></button>`;
}
function renderEvangelio(){
  setView('gospel');
  main.innerHTML=`<div class="col">
    <div class="evg-head"><span class="fecha">${esc(dateLong(hoyMX()))} · hoy</span><h2>Evangelio del día</h2>
      <div class="santos">Las lecturas de la misa de hoy según el calendario litúrgico de México.</div></div>
    <a class="evg-card" id="evgAbrir" href="${enlaceMisal()}" target="_blank" rel="noopener" style="text-decoration:none;margin-top:16px"><span class="ico">✝</span><div><b>Misal diario de México</b><span>Abrir el Evangelio de hoy</span><small>Se abre la página de hoy en Misal.mx (necesita internet)</small></div></a>
    <div class="evg-otras"><b style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-soft)">Leerlo en tu Biblia Latinoamericana</b>
      <p class="hint" style="margin:0">Escribe aquí la cita del Evangelio (por ejemplo <i>Lc 21,12-19</i>) para leerla, copiarla y guardarla en tu historial.</p>
      <form class="search" id="evgForm" autocomplete="off" style="box-shadow:none;border:1px solid var(--line)"><input id="evgCita" type="search" enterkeyhint="search" placeholder="Cita del Evangelio de hoy" aria-label="Cita del Evangelio de hoy"><button class="go" type="submit">Leer</button></form>
    </div>
    <p class="evg-fuente">El enlace abre <a href="${enlaceMisal()}" target="_blank" rel="noopener">misal.mx/${hoyMX()}</a>, un misal diario mexicano. La app no copia su contenido.</p>
  </div>`;
  $('#evgForm').onsubmit=e=>{ e.preventDefault(); const q=$('#evgCita').value.trim(); if(q) runQuery(q, {tidy:true}); };
  window.scrollTo({top:0});
}
$('#tabEvg').onclick=renderEvangelio;

/* ---------- [app] Modo claro / oscuro ---------- */
const temaBtn=$('#tema');
const temaActual=()=>document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
const colorBarra=()=>document.querySelector('meta[name="theme-color"]').setAttribute('content', temaActual()==='dark' ? '#0a2a1f' : '#0f3a2c');
temaBtn.onclick=()=>{ const t=temaActual()==='dark'?'light':'dark'; document.documentElement.dataset.theme=t; store.set('blat-tema', t); colorBarra(); toast(t==='dark'?'Modo oscuro':'Modo claro'); };
colorBarra();

})();
