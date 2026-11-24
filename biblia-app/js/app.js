(function(){
const P = window.BibliaParser, S = window.Hablado;
const $ = s => document.querySelector(s);
const main = $('#main'), side = $('#side');
const ABBR = {gn:'Gn',ex:'Ex',lv:'Lv',nm:'Nm',dt:'Dt',jos:'Jos',jue:'Jue','1s':'1 S','2s':'2 S','1r':'1 R','2r':'2 R','1cr':'1 Cr','2cr':'2 Cr',esd:'Esd',ne:'Ne','1m':'1 M','2m':'2 M',is:'Is',jer:'Jer',ez:'Ez',os:'Os',jl:'Jl',am:'Am',abd:'Abd',jon:'Jon',mi:'Mi',na:'Na',ha:'Hab',so:'So',ag:'Ag',za:'Za',mal:'Mal',dn:'Dn',jb:'Jb',pr:'Pr',qo:'Ecl',ct:'Ct',rt:'Rt',lam:'Lam',est:'Est',tob:'Tob',jdt:'Jdt',bar:'Bar',sab:'Sab',si:'Eclo',sal:'Sal',mt:'Mt',mc:'Mc',lc:'Lc',jn:'Jn',hch:'Hch',rom:'Rom','1co':'1 Co','2co':'2 Co',gal:'Gál',ef:'Ef',flp:'Flp',col:'Col',flm:'Flm','1ts':'1 Ts','2ts':'2 Ts','1tm':'1 Tm','2tm':'2 Tm',tit:'Tit',heb:'Heb',stg:'Stgo','1p':'1 P','2p':'2 P',jds:'Jds','1jn':'1 Jn','2jn':'2 Jn','3jn':'3 Jn',ap:'Ap'};
const SHORT = {};
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
    const b=BYID[r.id]; if(!b || r.v1!=null || r.c1!==r.c2 || getChapter(r.id, r.c1)) return r;
    const s=String(r.c1), opciones=[];
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
    if(total) Hist.record(label, u.refs);
    main.innerHTML = `<div class="col">
      <div class="meta"><h2>${esc(label)}</h2><span class="count">${total?fmt(total)+(total===1?' versículo':' versículos'):''}</span></div>
      ${u.spoken ? `<p class="heard">Entendí <i>«${esc(q)}»</i></p>` : ''}
      <div class="results" id="res"></div></div>`;
    const res=$('#res');
    if(!total){ const FALTAN={za:[6], '2tm':[4]}; const sinCap=u.refs.find(r=>BYID[r.id] && !getChapter(r.id, r.c1) && (r.c1<=Math.max(...BYID[r.id].chapters.map(x=>x.n)) || (FALTAN[r.id]||[]).includes(r.c1)));
      res.innerHTML = sinCap ? `<div class="empty"><b>Este capítulo no está disponible</b>${esc(bookName(sinCap.id))} ${sinCap.c1} no viene en el PDF del que se tomó el texto de esta app.</div>`
        : (()=>{ const r0=u.refs.find(r=>getChapter(r.id, r.c1)); return r0 ? `<div class="empty"><b>Ese versículo no aparece con ese número</b>En esta edición, ${esc(bookName(r0.id))} ${r0.c1} no tiene un versículo con ese número (la numeración cambia un poco entre Biblias).<div class="recent"><button class="btn" type="button" id="verCap" data-id="${r0.id}" data-c="${r0.c1}">Leer ${esc(bookName(r0.id))} ${r0.c1}</button></div></div>` : `<div class="empty"><b>No encontré esa cita</b>Revisa el libro, el capítulo y el versículo.</div>`; })();
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
  main.innerHTML=`<div class="col">
    <div class="empty"><b>Escribe o dicta una cita</b>Por ejemplo <button class="linkbtn" data-q="Jn 14,6">Jn 14,6</button>, <button class="linkbtn" data-q="Isaías cuarenta y tres uno al cinco">«Isaías cuarenta y tres uno al cinco»</button> o una palabra como <button class="linkbtn" data-q="paz">paz</button>.
      ${recent.length?`<div class="recent">${recent.map(r=>`<button class="pill" type="button" data-q="${esc(r)}">${esc(r)}</button>`).join('')}</div>`:''}
    </div>
    ${lastRead && getChapter(lastRead.id, lastRead.c) ? `<div style="text-align:center"><button class="btn ghost" id="resume" type="button">Seguir leyendo: ${esc(SHORT[lastRead.id]||bookName(lastRead.id))} ${lastRead.c}</button></div>`:''}
    ${xrefCard()}
    ${statsHTML()}</div>`;
  bindXrefCard();
  main.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>runQuery(b.dataset.q));
  $('#resume') && ($('#resume').onclick=()=>openChapter(lastRead.id, lastRead.c));
  bindForget();
}
function statsHTML(){
  return `<div class="foot"><b>La Biblia Latinoamericana</b>: ${BIBLE.books.length} libros y ${fmt(FLAT.length)} versículos. Funciona sin internet; tu historial y tus notas se guardan solo en este teléfono. Versión del 24 de noviembre de 2026. Referencias marginales: <a href="https://www.openbible.info/labs/cross-references/" target="_blank" rel="noopener">OpenBible.info</a> (CC BY).</div>`;
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
    <div class="meta" style="margin-top:4px"><h2>${esc(b.name)}</h2><span class="count">${b.chapters.length} capítulos</span></div>
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
      <header><h2>${esc(nm)} <span class="cn">${c}</span></h2>
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

/* ---------- Historial por día ---------- */
const Hist = (function(){
  const LKEY='blat-hist';
  let st = store.get(LKEY, {entries:{}, days:{}});   // copia local (y respaldo si no hay nube)
  let recording = store.get('blat-rec', true);
  let cloud=null;      // {citas, clases} cuando la nube está disponible
  const listeners=[];
  const emit=()=>listeners.forEach(f=>f());
  const saveLocal=()=>store.set(LKEY, st);
  const dayKey = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const slug = s => norm(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80) || 'cita';

  async function connect(){
    try{
      if(!window.claude?.use) return;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if(!db || !user) return;
      const uid = await user.id(); if(!uid) return;
      const root = db.collection('data/users/'+uid).doc('historial');
      cloud = {citas: root.collection('citas'), clases: root.collection('clases')};
      let firstC=true, firstD=true;
      cloud.citas.onSnapshot(snap=>{
        if(firstC && snap.empty && !snap.metadata.fromCache && Object.keys(st.entries).length){
          // primera vez con nube: subir lo que había en este navegador
          Object.entries(st.entries).forEach(([id,e])=>cloud.citas.doc(id).set(e).catch(()=>{}));
        } else {
          const ent={}; snap.docs.forEach(d=>{ ent[d.id]=d.data(); }); st.entries=ent; saveLocal(); emit();
        }
        firstC=false;
      }, ()=>{ cloud=null; });
      cloud.clases.onSnapshot(snap=>{
        if(firstD && snap.empty && !snap.metadata.fromCache && Object.keys(st.days).length){
          Object.entries(st.days).forEach(([id,d])=>cloud.clases.doc(id).set(d).catch(()=>{}));
        } else {
          const days={}; snap.docs.forEach(d=>{ days[d.id]=d.data(); }); st.days=days; saveLocal(); emit();
        }
        firstD=false;
      }, ()=>{});
      emit();
    }catch(e){ cloud=null; }
  }
  function putEntry(id, e){ st.entries[id]=e; saveLocal(); emit(); if(cloud) cloud.citas.doc(id).set(e).catch(()=>{}); }
  return {
    connect, on:f=>listeners.push(f), dayKey,
    get synced(){ return !!cloud; },
    get recording(){ return recording; },
    setRecording(v){ recording=v; store.set('blat-rec', v); },
    record(label, refs){
      if(!recording) return;
      const day=dayKey(), id=`${day}_${slug(label)}`, prev=st.entries[id];
      const e={label, refs:JSON.stringify(refs), day, at:Date.now(), note: prev?.note || ''}; if(prev?.guide) e.guide=prev.guide;
      putEntry(id, e);
    },
    setNote(id, note){ const e=st.entries[id]; if(!e || e.note===note) return; st.entries[id]={...e, note}; saveLocal(); if(cloud) cloud.citas.doc(id).update({note}).catch(()=>{}); },
    setDayName(day, name){ const cur=st.days[day]?.name||''; if(cur===name) return; st.days[day]={...(st.days[day]||{}), name}; saveLocal(); if(cloud) cloud.clases.doc(day).set(st.days[day]).catch(()=>{}); },
    setDayGuide(day, guide){ st.days[day]={...(st.days[day]||{}), guide}; saveLocal(); emit(); if(cloud) cloud.clases.doc(day).set(st.days[day]).catch(()=>{}); },
    entryFor(label){ return st.entries[`${dayKey()}_${slug(label)}`] || null; },
    setEntryGuide(label, guide){ const id=`${dayKey()}_${slug(label)}`; const e=st.entries[id]; if(!e) return; st.entries[id]={...e, guide}; saveLocal(); emit(); if(cloud) cloud.citas.doc(id).update({guide}).catch(()=>{}); },
    setEntryGuideById(id, guide){ const e=st.entries[id]; if(!e) return; st.entries[id]={...e, guide}; saveLocal(); emit(); if(cloud) cloud.citas.doc(id).update({guide}).catch(()=>{}); },
    removeEntry(id){ delete st.entries[id]; saveLocal(); emit(); if(cloud) cloud.citas.doc(id).delete().catch(()=>{}); },
    removeDay(day){
      Object.keys(st.entries).filter(id=>st.entries[id].day===day).forEach(id=>{ delete st.entries[id]; if(cloud) cloud.citas.doc(id).delete().catch(()=>{}); });
      delete st.days[day]; if(cloud) cloud.clases.doc(day).delete().catch(()=>{});
      saveLocal(); emit();
    },
    byDay(){
      const groups={};
      Object.entries(st.entries).forEach(([id,e])=>{ (groups[e.day] ||= []).push({id, ...e}); });
      return Object.keys(groups).sort().reverse().map(day=>({day, name:st.days[day]?.name||'', guide:st.days[day]?.guide||null, items:groups[day].sort((a,b)=>a.at-b.at)}));
    }
  };
})();

const dateLong = day => { const [y,m,d]=day.split('-').map(Number); const s=new Date(y,m-1,d).toLocaleDateString('es-MX',{weekday:'long', day:'numeric', month:'long', year:'numeric'}); return s.charAt(0).toUpperCase()+s.slice(1); };
const timeShort = ms => new Date(ms).toLocaleTimeString('es-MX',{hour:'numeric', minute:'2-digit'});
function entryVerses(e){ try{ return JSON.parse(e.refs).flatMap(r=>resolveRef(r).verses); }catch(err){ return []; } }
function dayText(g){
  const head = (g.name ? `${g.name} — ` : '') + dateLong(g.day);
  const body = g.items.map(e=>{
    const vs=entryVerses(e);
    const txt = vs.length ? vs.map(v=> vs.length>1 ? `${v.l||v.v} ${v.t}` : v.t).join(' ') : '(texto no disponible)';
    return `${e.label}\n${txt}${e.note ? `\nNota: ${e.note}` : ''}${e.guide ? `\n\n${guideToText(e.guide)}` : ''}`;
  }).join('\n\n');
  return `${head}\n\n${body}\n${g.guide ? `\n\n${guideToText(g.guide)}\n` : ''}`;
}
function armButton(btn, label, action){
  btn.onclick=()=>{
    if(btn.dataset.armed){ action(); return; }
    btn.dataset.armed='1'; const old=btn.innerHTML; btn.classList.add('armed'); btn.textContent=label;
    setTimeout(()=>{ if(btn.isConnected){ delete btn.dataset.armed; btn.classList.remove('armed'); btn.innerHTML=old; } }, 3500);
  };
}
const ICON_X='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
function renderHistory(){
  setView('history');
  const groups=Hist.byDay();
  main.innerHTML=`<div class="col">
    <div class="histhead"><div class="meta"><h2>Historial</h2><span class="count">${groups.length} ${groups.length===1?'día':'días'}</span></div>
      <p>Cada cita que buscas se guarda aquí, agrupada por día. Ponle nombre a la clase, agrega notas y copia todo para tus apuntes.</p>
      ${Hist.synced?'<span class="sync"><i></i>Se guarda en tu cuenta: lo ves igual en el celular y en la computadora</span>':'<span class="sync"><i style="background:var(--ink-soft)"></i>Guardado en este teléfono</span>'}
    </div>
    <div class="recbar"><span>Guardar mis búsquedas de citas</span><button class="switch" id="recSw" role="switch" aria-checked="${Hist.recording}" aria-label="Guardar búsquedas en el historial" type="button"></button></div>
    <div class="days" id="days"></div></div>`;
  $('#recSw').onclick=e=>{ const v=!Hist.recording; Hist.setRecording(v); e.currentTarget.setAttribute('aria-checked', v); toast(v?'El historial está activo':'Pausado: las búsquedas no se guardarán'); };
  const wrap=$('#days');
  if(!groups.length){ wrap.innerHTML=`<div class="empty"><b>Aún no hay citas</b>Busca una cita (por ejemplo <button class="linkbtn" data-q="Hch 2,1-4">Hch 2,1-4</button>) y aparecerá aquí con la hora.</div>`; wrap.querySelector('[data-q]').onclick=e=>runQuery(e.target.dataset.q); return; }
  groups.forEach(g=>{
    const sec=document.createElement('section'); sec.className='day';
    sec.innerHTML=`<header>
        <span class="date">${esc(dateLong(g.day))}${g.day===Hist.dayKey()?' · hoy':''}</span>
        <input class="name" id="name-${g.day}" value="${esc(g.name)}" placeholder="Ponle nombre a la clase…" aria-label="Nombre de la clase" maxlength="80">
        <div class="dacts"><span class="cnt">${g.items.length} ${g.items.length===1?'cita':'citas'}</span>
          <button class="pill primary" type="button" data-a="copyall">${ICON_COPY}Copiar todo</button>
          ${guideOK()||g.guide?`<button class="pill" type="button" data-a="dguide">${ICON_GUIDE}${g.guide?'Ver guía':'Guía de la clase'}</button>`:''}
          <button class="pill danger" type="button" data-a="delday">Borrar día</button></div>
      </header>`;
    g.items.forEach(e=>{
      const vs=entryVerses(e), preview=vs.map(v=>v.t).join(' ');
      const row=document.createElement('div'); row.className='entry';
      row.innerHTML=`<time>${esc(timeShort(e.at))}</time>
        <button class="eref" type="button">${esc(e.label)}</button>
        <button class="del" type="button" aria-label="Borrar ${esc(e.label)}">${ICON_X}</button>
        ${preview?`<p class="prev">${esc(preview)}</p>`:''}
        <textarea class="note" rows="1" id="note-${esc(e.id)}" placeholder="Agregar nota…" aria-label="Nota para ${esc(e.label)}" maxlength="2000">${esc(e.note||'')}</textarea>
        ${e.guide?`<details class="saved-guide eguide"><summary>${ICON_GUIDE}Guía de estudio</summary>${guideHTML(e.guide)}</details>`:''}`;
      row.querySelector('.eref').onclick=()=>runQuery(e.label);
      bindXref(row);
      armButton(row.querySelector('.del'), 'Borrar', ()=>{ Hist.removeEntry(e.id); toast('Cita borrada'); });
      const ta=row.querySelector('.note'); let tmr;
      const save=()=>{ clearTimeout(tmr); Hist.setNote(e.id, ta.value.trim()); };
      ta.addEventListener('input', ()=>{ clearTimeout(tmr); tmr=setTimeout(save, 700); ta.style.height='auto'; ta.style.height=ta.scrollHeight+'px'; });
      ta.addEventListener('blur', save);
      sec.appendChild(row);
    });
    const nm=sec.querySelector('.name');
    nm.addEventListener('change', ()=>Hist.setDayName(g.day, nm.value.trim()));
    nm.addEventListener('keydown', ev=>{ if(ev.key==='Enter'){ ev.preventDefault(); nm.blur(); } });
    sec.querySelector('[data-a=copyall]').onclick=()=>{ const cur=Hist.byDay().find(x=>x.day===g.day); if(cur) copyText(dayText(cur), {show:true, title:(cur.name||dateLong(cur.day)), label:`Copiadas ${cur.items.length} citas`}); };
    armButton(sec.querySelector('[data-a=delday]'), 'Toca otra vez para borrar el día', ()=>{ Hist.removeDay(g.day); toast('Día borrado'); });
    const dg=sec.querySelector('[data-a=dguide]');
    if(dg) dg.onclick=()=>{
      const cur=Hist.byDay().find(x=>x.day===g.day); if(!cur) return;
      const title=cur.name || `Clase del ${dateLong(cur.day)}`;
      openGuide({title, passages:cur.items.map(e=>passagesFromVerses(e.label, entryVerses(e), e.note)), saved:cur.guide, onSave:gd=>Hist.setDayGuide(cur.day, gd)});
    };
    wrap.appendChild(sec);
  });
  wrap.querySelectorAll('.note').forEach(ta=>{ if(ta.value){ ta.style.height=ta.scrollHeight+'px'; } });
}
// re-pintar cuando llegan cambios (sin interrumpir si se está escribiendo una nota o un nombre)
Hist.on(()=>{ const a=document.activeElement; const typing=a && /^(INPUT|TEXTAREA)$/.test(a.tagName) && a.closest('.day'); if(view==='history' && !typing) renderHistory(); });
Hist.connect();

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

/* ---------- Dictado (reconocimiento de voz del teléfono) ---------- */
function mejorOpcion(r){
  // prefiere una cita que exista y que traiga versículo («Juan 5,3») sobre un rango de capítulos («Juan 5-8»)
  let mejor=r[0].transcript, punt=0;
  for(let k=0;k<r.length;k++){ const t=r[k].transcript, u=understand(t.trim()); let p=0;
    if(u && u.refs.some(x=>resolveRef(x).verses.length)) p = u.refs.some(x=>x.v1!=null) ? 2 : 1;
    if(p>punt){ punt=p; mejor=t; } }
  return mejor;
}
const micBtn=$('#mic'), live=$('#live');
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec=null, dictText='', escuchando=false;
const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
if(SR || esIOS) micBtn.hidden=false;
function dictarConTeclado(){
  qEl.value=''; syncClear(); qEl.focus();
  live.textContent='Toca el micrófono 🎙 del teclado, di la cita (por ejemplo «Juan cinco coma tres») y luego toca Buscar.';
  qEl.addEventListener('blur', ()=>setTimeout(()=>{ live.textContent=''; }, 300), {once:true});
}
micBtn.addEventListener('click', ()=>{
  if(esIOS || !SR){ dictarConTeclado(); return; }
  if(escuchando && rec){ rec.stop(); return; }
  rec=new SR(); rec.lang='es-MX'; rec.interimResults=true; rec.continuous=false; rec.maxAlternatives=5;
  dictText=''; qEl.value=''; syncClear();
  let vigia=null, recibio=false, aTeclado=false;
  rec.onstart=()=>{ vigia=setTimeout(()=>{ if(!recibio){ aTeclado=true; try{ rec.abort(); }catch(e){} dictarConTeclado(); } }, 8000); escuchando=true; micBtn.classList.add('on'); micBtn.setAttribute('aria-label','Detener dictado'); live.textContent='Te escucho… di la cita, por ejemplo «Juan seis ocho al catorce»'; };
  rec.onresult=e=>{ recibio=true; let fin='', tmp=''; for(let i=0;i<e.results.length;i++){ const r=e.results[i]; if(r.isFinal) fin+=mejorOpcion(r); else tmp+=r[0].transcript; }
    if(fin){ dictText=fin.trim(); qEl.value=dictText; syncClear(); } live.textContent=((dictText+' '+tmp).trim()+(tmp?' …':'')) || live.textContent; };
  rec.onerror=e=>{ if(e.error==='not-allowed' || e.error==='service-not-allowed'){ micBtn.hidden=true; toast('Sin permiso para el micrófono; puedes escribir la cita'); } };
  rec.onend=()=>{ clearTimeout(vigia); escuchando=false; micBtn.classList.remove('on'); micBtn.setAttribute('aria-label','Dictar cita'); if(!aTeclado) live.textContent=''; if(dictText) runQuery(dictText, {tidy:true}); };
  try{ rec.start(); }catch(err){}
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
/* ---------- [app] Modo claro / oscuro ---------- */
const temaBtn=$('#tema');
const temaActual=()=>document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
const colorBarra=()=>document.querySelector('meta[name="theme-color"]').setAttribute('content', temaActual()==='dark' ? '#0a2a1f' : '#0f3a2c');
temaBtn.onclick=()=>{ const t=temaActual()==='dark'?'light':'dark'; document.documentElement.dataset.theme=t; store.set('blat-tema', t); colorBarra(); toast(t==='dark'?'Modo oscuro':'Modo claro'); };
colorBarra();

})();
