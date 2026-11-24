#!/usr/bin/env python3
"""Construye biblia-app/ a partir del HTML original del «Buscador Biblia Latinoamérica».

Toma tal cual los estilos, la estructura y la lógica del buscador y aplica solo los cambios
necesarios para que sea una app instalable que funcione sin internet:
  - el texto bíblico viene incluido (js/datos-biblia.js) en lugar de leer el PDF;
  - letras guardadas dentro de la app (sin Google Fonts);
  - dictado con el reconocimiento de voz del teléfono;
  - historial guardado en el teléfono; sin la guía de estudio (solo funciona dentro de claude.ai);
  - botón de modo oscuro, aviso de instalación y service worker.
Uso: python3 construir.py ruta/al/buscador-original.html
"""
import re, sys, pathlib

orig = pathlib.Path(sys.argv[1]).read_text(encoding='utf8').split('\n')
app = pathlib.Path(__file__).resolve().parents[2] / 'biblia-app'

def lineas(a, b):            # 1-indexadas, inclusivas
    return '\n'.join(orig[a - 1:b])

def unico(texto, viejo, nuevo):
    assert texto.count(viejo) == 1, f'no encontrado o repetido: {viejo[:70]!r}'
    return texto.replace(viejo, nuevo)

def encontrar(patron, desde=0):
    for i in range(desde, len(orig)):
        if patron in orig[i]:
            return i + 1
    raise SystemExit(f'no encontrado: {patron}')

css_ini = encontrar('<style>', 2) + 1
css_fin = encontrar('</style>', css_ini) - 1
mk_ini = encontrar('<header class="band"')
mk_fin = encontrar('<input type="file" id="xfile"')
habl_ini = encontrar('const UNITS') - 2          # «(function(root){» del módulo Hablado
habl_fin = encontrar("root.Hablado=api") + 1
main_ini = encontrar('const P = window.BibliaParser')
main_fin = encontrar('</script>', main_ini) - 2      # sin el «})();» final

# ---------------------------------------------------------------- CSS
fuentes = '''/* Letras incluidas en la app (licencia OFL), para que se vean igual sin internet */
@font-face{font-family:"Cormorant";font-style:normal;font-weight:500;font-display:swap;src:url(../fuentes/cormorant-latin-500-normal.woff2) format("woff2")}
@font-face{font-family:"Cormorant";font-style:italic;font-weight:500;font-display:swap;src:url(../fuentes/cormorant-latin-500-italic.woff2) format("woff2")}
@font-face{font-family:"Cormorant";font-style:normal;font-weight:600;font-display:swap;src:url(../fuentes/cormorant-latin-600-normal.woff2) format("woff2")}
@font-face{font-family:"Cormorant";font-style:normal;font-weight:700;font-display:swap;src:url(../fuentes/cormorant-latin-700-normal.woff2) format("woff2")}
@font-face{font-family:"Literata";font-style:normal;font-weight:400;font-display:swap;src:url(../fuentes/literata-latin-400-normal.woff2) format("woff2")}
@font-face{font-family:"Literata";font-style:italic;font-weight:400;font-display:swap;src:url(../fuentes/literata-latin-400-italic.woff2) format("woff2")}
@font-face{font-family:"Literata";font-style:normal;font-weight:500;font-display:swap;src:url(../fuentes/literata-latin-500-normal.woff2) format("woff2")}
@font-face{font-family:"Figtree";font-style:normal;font-weight:400;font-display:swap;src:url(../fuentes/figtree-latin-400-normal.woff2) format("woff2")}
@font-face{font-family:"Figtree";font-style:normal;font-weight:500;font-display:swap;src:url(../fuentes/figtree-latin-500-normal.woff2) format("woff2")}
@font-face{font-family:"Figtree";font-style:normal;font-weight:600;font-display:swap;src:url(../fuentes/figtree-latin-600-normal.woff2) format("woff2")}
@font-face{font-family:"Figtree";font-style:normal;font-weight:700;font-display:swap;src:url(../fuentes/figtree-latin-700-normal.woff2) format("woff2")}

/* Base (antes la ponía claude.ai alrededor de la página) */
:root{box-sizing:border-box}
body{margin:0;padding:0;padding-top:env(safe-area-inset-top,0px)}
img{max-width:100%}
'''
extra = '''
/* ---------- Agregados para la app instalable ---------- */
.brand-r{display:flex; align-items:center; gap:12px}
.temabtn{flex:none; width:40px; height:40px; border-radius:50%; border:1px solid rgba(214,178,90,.55); background:transparent; color:var(--on-forest); display:grid; place-items:center}
.temabtn:hover{background:rgba(214,178,90,.15)}
.temabtn svg{width:19px; height:19px}
.temabtn .sol{display:none}
:root[data-theme="dark"] .temabtn .sol{display:block}
:root[data-theme="dark"] .temabtn .luna{display:none}
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]) .temabtn .sol{display:block} :root:not([data-theme="light"]) .temabtn .luna{display:none} }

.instalar{position:fixed; left:max(12px, env(safe-area-inset-left, 0px)); right:max(12px, env(safe-area-inset-right, 0px)); bottom:calc(var(--tabbar) + 12px + env(safe-area-inset-bottom, 0px)); z-index:32; max-width:560px; margin:0 auto; display:flex; align-items:center; gap:12px; background:var(--leaf); color:var(--ink); border:1px solid var(--line); border-top:3px solid var(--gold-bright); border-radius:16px; padding:12px 8px 12px 12px; box-shadow:var(--shadow); font-size:14px; line-height:1.4; animation:subir .35s ease-out}
.instalar img{flex:none; width:44px; height:44px; border-radius:11px}
.instalar .txt{flex:1; min-width:0}
.instalar .txt b{font-family:var(--f-display); font-size:19px; font-weight:600; display:block; line-height:1.1; margin-bottom:2px}
.instalar .txt strong{color:var(--gold)}
.instalar .txt svg{width:15px; height:15px; vertical-align:-2px; color:var(--gold)}
.instalar .go2{flex:none; border:0; border-radius:999px; background:var(--forest); color:var(--on-forest); font-weight:700; padding:0 16px; min-height:40px}
.instalar .cerrar{flex:none; width:36px; height:36px; border:0; border-radius:50%; background:transparent; color:var(--ink-soft); display:grid; place-items:center}
.instalar .cerrar:hover{background:var(--gold-wash)}
@media (min-width:1000px){ .instalar{bottom:calc(20px + env(safe-area-inset-bottom, 0px))} }
@keyframes subir{from{transform:translateY(16px); opacity:0} to{transform:none; opacity:1}}
'''
css = fuentes + lineas(css_ini, css_fin) + extra
(app / 'css').mkdir(exist_ok=True)
(app / 'css' / 'estilos.css').write_text(css + '\n', encoding='utf8')

# ---------------------------------------------------------------- HTML
marcado = lineas(mk_ini, mk_fin)
marcado = unico(marcado, '<div class="stat" id="statusText"></div>',
    '<div class="brand-r"><div class="stat" id="statusText"></div>'
    '<button class="temabtn" id="tema" type="button" aria-label="Cambiar entre modo claro y oscuro">'
    '<svg class="luna" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>'
    '<svg class="sol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>'
    '</button></div>')
marcado = re.sub(r'\n<input type="file" id="file"[^\n]*', '', marcado)    # ya no se carga el PDF

html = f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Biblia Latinoamericana</title>
<meta name="description" content="La Biblia Latinoamericana: buscador de citas y lectura, también sin internet.">
<meta name="robots" content="noindex, nofollow">
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#0f3a2c">
<link rel="icon" type="image/png" sizes="32x32" href="iconos/favicon-32.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Biblia">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" sizes="180x180" href="iconos/apple-touch-icon.png">
<link rel="preload" href="fuentes/literata-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fuentes/cormorant-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="css/estilos.css">
<script>try{{var t=localStorage.getItem('blat-tema');if(t)document.documentElement.dataset.theme=JSON.parse(t);}}catch(e){{}}</script>
</head>
<body>

{marcado}

<aside class="instalar" id="instalar" hidden>
  <img src="iconos/icon-192.png" alt="">
  <div class="txt" id="instalarTxt"></div>
  <button class="go2" id="instalarBtn" type="button" hidden>Instalar</button>
  <button class="cerrar" id="instalarCerrar" type="button" aria-label="Cerrar aviso"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
</aside>

<script src="js/vendor/jszip.min.js" defer></script>
<script src="js/datos-biblia.js"></script>
<script src="js/libros.js"></script>
<script src="js/app.js"></script>
<script src="js/pwa.js"></script>
</body>
</html>
'''
(app / 'index.html').write_text(html, encoding='utf8')

# ---------------------------------------------------------------- libros.js (lista de libros + citas habladas)
analizador = (app.parent / 'herramientas' / 'analizador-biblia.js').read_text(encoding='utf8')
books = re.search(r'const BOOKS = \[.*?\n\];', analizador, re.S).group(0)
libros = ('/* Lista de libros y abreviaturas, y lectura de citas habladas («Juan seis ocho al catorce»).\n'
          '   Tomado del «Buscador Biblia Latinoamérica». */\n'
          '(function(root){\n' + books + '\nroot.BibliaParser = {BOOKS};\n})(this);\n\n'
          + lineas(habl_ini, habl_fin) + '\n')
(app / 'js').mkdir(exist_ok=True)
(app / 'js' / 'libros.js').write_text(libros, encoding='utf8')

# ---------------------------------------------------------------- app.js (lógica del buscador, adaptada)
js = lineas(main_ini, main_fin)

# 1) La Biblia viene incluida: se convierte al formato del buscador
js = unico(js, "let BIBLE=null, BYID={}, FLAT=[];",
"""let BIBLE=null, BYID={}, FLAT=[];
/* [app] Texto incluido en la app (js/datos-biblia.js). Cada versículo: [número, texto, página, etiqueta, hasta, agregado]
   «etiqueta» es para versículos combinados como «11-12». */
function desdeDatos(D){
  return {fileName:'La Biblia Latinoamericana', books: D.libros.map(l=>({id:l.id, name:l.nombre, chapters:l.capitulos.map(c=>({n:c.numero,
    v:c.versiculos.map(v=>{ const a=String(v.n).split('-').map(Number); return [a[0], v.t, '', a.length>1?String(v.n):null, a[1]||a[0], v.a?1:0]; })}))}))};
}
const vEtiqueta = v => v[3] || v[0];""")

# 2) Versículos combinados (11-12): al buscar el 12 también aparece
js = unico(js, "if(c===r.c1 && v[0]<r.v1) continue;", "if(c===r.c1 && (v[4]||v[0])<r.v1) continue;")
js = unico(js, "verses.push({b:r.id, c, v:v[0], t:v[1], p:v[2]});", "verses.push({b:r.id, c, v:v[0], l:v[3], t:v[1], p:v[2]});")
js = unico(js, "${multi?`<sup>${x.v}</sup>`:''}", "${multi?`<sup>${x.l||x.v}</sup>`:''}")
js = unico(js, "FLAT.push({b:b.id, bi, c:ch.n, v:v[0], t:v[1], p:v[2], n:norm(v[1])})", "FLAT.push({b:b.id, bi, c:ch.n, v:v[0], l:v[3], t:v[1], p:v[2], n:norm(v[1])})")
js = unico(js, "${esc(SHORT[x.b]||BYID[x.b].name)} ${x.c},${x.v}</button>", "${esc(SHORT[x.b]||BYID[x.b].name)} ${x.c},${x.l||x.v}</button>")
js = js.replace('<span class="v" data-v="${v[0]}"><sup>${v[0]}</sup>', '<span class="v${v[5]?\' agregado\':\'\'}" data-v="${v[0]}"><sup>${vEtiqueta(v)}</sup>')
js = unico(js, "if(focusV){ const el=main.querySelector(`.v[data-v=\"${focusV}\"]`);",
               "if(focusV){ const fv=(ch.v.find(x=>focusV>=x[0] && focusV<=(x[4]||x[0]))||[focusV])[0]; const el=main.querySelector(`.v[data-v=\"${fv}\"]`);")

# 3) Sin número de página del PDF
js = unico(js, '<span class="pg">p. ${bl.verses[0].p} del PDF</span>', '')
js = unico(js, '<span class="pg">p. ${ch.v[0]?.[2]??\'\'}</span>', '')

# 4) Capítulos que no vienen en el PDF de origen
js = unico(js, "if(!total){ res.innerHTML=`<div class=\"empty\"><b>No encontré esa cita</b>Revisa el capítulo y el versículo. En esta Biblia los Salmos siguen la numeración hebrea.</div>`; return; }",
"if(!total){ const FALTAN={za:[6], '2tm':[4]}; const sinCap=u.refs.find(r=>BYID[r.id] && !getChapter(r.id, r.c1) && (r.c1<=Math.max(...BYID[r.id].chapters.map(x=>x.n)) || (FALTAN[r.id]||[]).includes(r.c1)));\n"
"      res.innerHTML = sinCap ? `<div class=\"empty\"><b>Este capítulo no está disponible</b>${esc(bookName(sinCap.id))} ${sinCap.c1} no viene en el PDF del que se tomó el texto de esta app.</div>`\n"
"        : (()=>{ const r0=u.refs.find(r=>getChapter(r.id, r.c1)); return r0 ? `<div class=\"empty\"><b>Ese versículo no aparece con ese número</b>En esta edición, ${esc(bookName(r0.id))} ${r0.c1} no tiene un versículo con ese número (la numeración cambia un poco entre Biblias).<div class=\"recent\"><button class=\"btn\" type=\"button\" id=\"verCap\" data-id=\"${r0.id}\" data-c=\"${r0.c1}\">Leer ${esc(bookName(r0.id))} ${r0.c1}</button></div></div>` : `<div class=\"empty\"><b>No encontré esa cita</b>Revisa el libro, el capítulo y el versículo.</div>`; })();\n"
"      const vc=$('#verCap'); if(vc) vc.onclick=()=>openChapter(vc.dataset.id, +vc.dataset.c); return; }")

# 5) Pie de página: sin «quitar la Biblia de este navegador»
js = unico(js, "return `<div class=\"foot\">Índice creado a partir de <b>${esc(BIBLE.fileName||'tu PDF')}</b>: ${BIBLE.books.length} libros y ${fmt(FLAT.length)} versículos. El texto se extrae automáticamente del PDF; si algún versículo se ve incompleto, revisa la página que aparece junto a cada cita. Todo se guarda solo en este navegador. <button class=\"linkbtn\" id=\"forget\" type=\"button\">Quitar la Biblia de este navegador</button></div>`;",
"return `<div class=\"foot\"><b>La Biblia Latinoamericana</b>: ${BIBLE.books.length} libros y ${fmt(FLAT.length)} versículos. Funciona sin internet; tu historial y tus notas se guardan solo en este teléfono.</div>`;")

# 6) Historial: se guarda en el teléfono
js = unico(js, "'<span class=\"sync\"><i style=\"background:var(--ink-soft)\"></i>Guardado solo en este navegador</span>'",
               "'<span class=\"sync\"><i style=\"background:var(--ink-soft)\"></i>Guardado en este teléfono</span>'")
js = unico(js, "const txt = vs.length ? vs.map(v=> vs.length>1 ? `${v.v} ${v.t}` : v.t).join(' ') : '(texto no disponible: carga tu PDF)';",
               "const txt = vs.length ? vs.map(v=> vs.length>1 ? `${v.l||v.v} ${v.t}` : v.t).join(' ') : '(texto no disponible)';")

# 7) Mensajes que pedían cargar el PDF
js = js.replace("toast('Primero carga tu PDF')", "toast('Cargando…')")
js = unico(js, "if(!BIBLE){ side.innerHTML=sideNav()+'<p class=\"placeholder\">Carga tu PDF para ver el índice.</p>'; bindSideNav(); return; }",
               "if(!BIBLE){ side.innerHTML=sideNav(); bindSideNav(); return; }")

js = unico(js, "$('#file').addEventListener('change', e=>{ const f=e.target.files[0]; if(f) loadPdf(f); e.target.value=''; });\n", '')

# 8) Dictado con el reconocimiento de voz del teléfono
d_ini = js.index('/* ---------- Dictado ---------- */')
d_fin = js.index('/* ---------- Guardado local ---------- */')
js = js[:d_ini] + '''/* ---------- Dictado (reconocimiento de voz del teléfono) ---------- */
const micBtn=$('#mic'), live=$('#live');
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec=null, dictText='', escuchando=false;
if(SR) micBtn.hidden=false;
micBtn.addEventListener('click', ()=>{
  if(!SR) return;
  if(escuchando && rec){ rec.stop(); return; }
  rec=new SR(); rec.lang='es-MX'; rec.interimResults=true; rec.continuous=false; rec.maxAlternatives=1;
  dictText=''; qEl.value=''; syncClear();
  rec.onstart=()=>{ escuchando=true; micBtn.classList.add('on'); micBtn.setAttribute('aria-label','Detener dictado'); live.textContent='Te escucho… di la cita, por ejemplo «Juan seis ocho al catorce»'; };
  rec.onresult=e=>{ let fin='', tmp=''; for(let i=0;i<e.results.length;i++){ const r=e.results[i]; if(r.isFinal) fin+=r[0].transcript; else tmp+=r[0].transcript; }
    if(fin){ dictText=fin.trim(); qEl.value=dictText; syncClear(); } live.textContent=((dictText+' '+tmp).trim()+(tmp?' …':'')) || live.textContent; };
  rec.onerror=e=>{ if(e.error==='not-allowed' || e.error==='service-not-allowed'){ micBtn.hidden=true; toast('Sin permiso para el micrófono; puedes escribir la cita'); } };
  rec.onend=()=>{ escuchando=false; micBtn.classList.remove('on'); micBtn.setAttribute('aria-label','Dictar cita'); live.textContent=''; if(dictText) runQuery(dictText, {tidy:true}); };
  try{ rec.start(); }catch(err){}
});

''' + js[d_fin:]

# 9) Sin lectura del PDF
p_ini = js.index('/* ---------- Lectura del PDF ---------- */')
p_fin = js.index('/* ---------- Arranque ---------- */')
js = js[:p_ini] + js[p_fin:]

# 10) Arranque: usar el texto incluido
js = unico(js, "renderLoader();\nxrefLoadStored()", "useBible(desdeDatos(window.BIBLIA));\nxrefLoadStored()")
js = unico(js, "loadIndex().then(data=>{ if(data && data.books && data.books.length){ useBible(data); if(saved){ qEl.value=saved; syncClear(); renderSearch(saved); } else renderHome(); } });",
               "if(saved){ qEl.value=saved; syncClear(); renderSearch(saved); } else renderHome();")

# 12) Referencias marginales incluidas en la app (OpenBible.info, CC BY)
js = unico(js, "xrefLoadStored().then(m=>{ if(m && Object.keys(m).length){ XREF=m; if(BIBLE) rerender(); } });",
"""(function(){ const sx=document.createElement('script'); sx.src='js/referencias.js'; sx.async=true;
  sx.onload=()=>{ if(window.XREF_DATA){ XREF=window.XREF_DATA; const a=document.activeElement; if(!(a && /^(INPUT|TEXTAREA)$/.test(a.tagName))) rerender(); } };
  document.head.appendChild(sx); })();""")
js = unico(js, "function xrefCard(){", "function xrefCard(){ if(XREF_INCLUIDAS) return '';")
js = unico(js, "let XREF=null;", "let XREF=null; const XREF_INCLUIDAS=true;   // [app] vienen dentro de la app")
js = unico(js, "if(!XREF){ showXrefHelp(); return; }", "if(!XREF){ toast('Cargando referencias…'); return; }")
js = js.replace("Funciona sin internet; tu historial y tus notas se guardan solo en este teléfono.</div>`;",
  "Funciona sin internet; tu historial y tus notas se guardan solo en este teléfono. Referencias marginales: <a href=\"https://www.openbible.info/labs/cross-references/\" target=\"_blank\" rel=\"noopener\">OpenBible.info</a> (CC BY).</div>`;")

# 13) Números pegados por el dictado: «Juan 503» / «Jn 316» → capítulo y versículo
js = unico(js, """function understand(q){
  let refs = parseRefs(q);
  if(refs) return {refs, spoken:false};
  const conv = S.toCita(q, findBook);
  if(conv){ refs = parseRefs(conv); if(refs) return {refs, spoken:true}; }
  return null;
}""", """function understand(q){
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
    const m=s.match(/^(\\d+?)0(\\d+)$/); if(m) opciones.push([+m[1], +m[2]]);      // 503 → 5,3
    for(let i=1;i<s.length;i++){ if(s[i]!=='0') opciones.push([+s.slice(0,i), +s.slice(i)]); }   // 316 → 3,16
    for(const [c,v] of opciones){ if(c>0 && v>0 && existeVers(r.id, c, v)){ cambio=true; return {id:r.id, c1:c, v1:v, c2:c, v2:v}; } }
    return r;
  });
  return {refs:out, cambio};
}""")

# 14) Micrófono: de las posibilidades que oye el teléfono, usar la primera que sea una cita que existe
js = unico(js, "rec.maxAlternatives=1;", "rec.maxAlternatives=5;")
js = unico(js, "if(r.isFinal) fin+=r[0].transcript; else tmp+=r[0].transcript; }",
  "if(r.isFinal) fin+=mejorOpcion(r); else tmp+=r[0].transcript; }")
js = unico(js, "/* ---------- Dictado (reconocimiento de voz del teléfono) ---------- */",
"""/* ---------- Dictado (reconocimiento de voz del teléfono) ---------- */
function mejorOpcion(r){
  // prefiere una cita que exista y que traiga versículo («Juan 5,3») sobre un rango de capítulos («Juan 5-8»)
  let mejor=r[0].transcript, punt=0;
  for(let k=0;k<r.length;k++){ const t=r[k].transcript, u=understand(t.trim()); let p=0;
    if(u && u.refs.some(x=>resolveRef(x).verses.length)) p = u.refs.some(x=>x.v1!=null) ? 2 : 1;
    if(p>punt){ punt=p; mejor=t; } }
  return mejor;
}""")

# 15) Dictado en iPhone: el reconocimiento de voz web no entrega resultados en apps instaladas,
#     así que el botón abre el teclado para usar su dictado. En los demás, respaldo si no llega nada.
js = unico(js, "if(SR) micBtn.hidden=false;",
"""const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
if(SR || esIOS) micBtn.hidden=false;
function dictarConTeclado(){
  qEl.value=''; syncClear(); qEl.focus();
  live.textContent='Toca el micrófono 🎙 del teclado, di la cita (por ejemplo «Juan cinco coma tres») y luego toca Buscar.';
  qEl.addEventListener('blur', ()=>setTimeout(()=>{ live.textContent=''; }, 300), {once:true});
}""")
js = unico(js, "  if(!SR) return;\n  if(escuchando && rec){ rec.stop(); return; }",
"""  if(esIOS || !SR){ dictarConTeclado(); return; }
  if(escuchando && rec){ rec.stop(); return; }""")
js = unico(js, "rec.onstart=()=>{ escuchando=true;",
  "let vigia=null, recibio=false, aTeclado=false;\n  rec.onstart=()=>{ vigia=setTimeout(()=>{ if(!recibio){ aTeclado=true; try{ rec.abort(); }catch(e){} dictarConTeclado(); } }, 8000); escuchando=true;")
js = unico(js, "rec.onresult=e=>{ let fin=''", "rec.onresult=e=>{ recibio=true; let fin=''")
js = unico(js, "rec.onend=()=>{ escuchando=false; micBtn.classList.remove('on'); micBtn.setAttribute('aria-label','Dictar cita'); live.textContent='';", "rec.onend=()=>{ clearTimeout(vigia); escuchando=false; micBtn.classList.remove('on'); micBtn.setAttribute('aria-label','Dictar cita'); if(!aTeclado) live.textContent='';")

# 16) Nombres de libros como en las Biblias católicas en español (Eclesiastés, Eclesiástico, Habacuc)
js = unico(js, "const SHORT = {qo:'Qohelet', si:'Sirácides'};", "const SHORT = {};")
js = unico(js, "ha:'Ha',", "ha:'Hab',")
js = unico(js, "qo:'Qo',", "qo:'Ecl',")
js = unico(js, "si:'Si',", "si:'Eclo',")

# 11) Modo oscuro (botón)
js = js + '''
/* ---------- [app] Modo claro / oscuro ---------- */
const temaBtn=$('#tema');
const temaActual=()=>document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
const colorBarra=()=>document.querySelector('meta[name="theme-color"]').setAttribute('content', temaActual()==='dark' ? '#0a2a1f' : '#0f3a2c');
temaBtn.onclick=()=>{ const t=temaActual()==='dark'?'light':'dark'; document.documentElement.dataset.theme=t; store.set('blat-tema', t); colorBarra(); toast(t==='dark'?'Modo oscuro':'Modo claro'); };
colorBarra();
'''
(app / 'js' / 'app.js').write_text('(function(){\n' + js + '\n})();\n', encoding='utf8')
print('listo:', app)
