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
