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
h2 small.otro{font-family:var(--f-ui); font-size:.4em; font-weight:500; color:var(--ink-soft); letter-spacing:.02em; white-space:nowrap}
@keyframes subir{from{transform:translateY(16px); opacity:0} to{transform:none; opacity:1}}
'''
extra += """
/* ---------- Evangelio del día ---------- */
.evg-card{display:flex; gap:14px; align-items:center; width:100%; text-align:left; background:var(--forest); color:var(--on-forest); border:0; border-radius:18px; padding:16px 18px; margin:4px 0 18px; box-shadow:var(--shadow)}
.evg-card .ico{flex:none; width:44px; height:44px; border-radius:50%; border:1.5px solid var(--gold-bright); display:grid; place-items:center; color:var(--gold-bright); font-family:var(--f-display); font-size:24px}
.evg-card b{display:block; font-family:var(--f-ui); font-size:11.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--gold-bright)}
.evg-card span{display:block; font-family:var(--f-display); font-size:23px; font-weight:600; line-height:1.15}
.evg-card small{display:block; font-family:var(--f-read); font-size:14px; opacity:.85; margin-top:2px}
.evg-head .fecha{font-size:12px; letter-spacing:.12em; text-transform:uppercase; color:var(--gold); font-weight:700}
.evg-head h2{margin:4px 0 2px; font-family:var(--f-display); font-size:clamp(30px,6vw,40px); font-weight:600; line-height:1.1}
.evg-head .santos{font-size:14px; color:var(--ink-soft)}
.evg-titulo{font-family:var(--f-read); font-style:italic; color:var(--ink-soft); margin:0 0 10px}
.evg-otras{display:flex; flex-direction:column; gap:8px; margin-top:16px}
.evg-otra{display:flex; justify-content:space-between; align-items:center; gap:10px; width:100%; text-align:left; background:var(--leaf); border:1px solid var(--line); border-radius:12px; padding:12px 14px}
.evg-otra:hover{border-color:var(--gold)}
.evg-otra b{font-size:11.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--gold); display:block}
.evg-otra span{font-weight:600}
.evg-fuente{font-size:13px; color:var(--ink-soft); margin-top:16px}
.evg-fuente a{color:var(--gold); font-weight:600}
"""
css = fuentes + lineas(css_ini, css_fin) + extra
css = css.replace("grid-template-columns:repeat(4,1fr)", "grid-template-columns:repeat(5,1fr)")
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
marcado = unico(marcado, '<button role="tab" id="tabSearch"',
  '<button role="tab" id="tabEvg" aria-selected="false" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M7 8h10"/><path d="M5 21h14"/></svg>Evangelio</button>\n  <button role="tab" id="tabSearch"')

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
libros = libros.replace("else if(/^(versiculos?|versos?|vers|v|vv|coma|,|:)$/.test(x)) nums.push(',');",
  "else if(/^(versiculos?|versos?|vers|v|vv|coma|,|:)$/.test(x)){ if(nums[nums.length-1]!==',') nums.push(','); }   // [app] «cap. 3, v. 16»")
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
  "Funciona sin internet; tu historial y tus notas se guardan solo en este teléfono. Versión del 25 de noviembre de 2026. Referencias marginales: <a href=\"https://www.openbible.info/labs/cross-references/\" target=\"_blank\" rel=\"noopener\">OpenBible.info</a> (CC BY).</div>`;")

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

# 17) Escribir solo el nombre de un libro abre el libro (no una búsqueda de palabra);
#     y Eclesiastés / Eclesiástico muestran su otro nombre para no confundirlos
js = unico(js, "\n  doTextSearch(q, '');\n}", """
  // [app] solo el nombre de un libro («Eclesiastés», «Ecl», «Qohelet») → abrir ese libro
  if(!/\\d/.test(q) && !/["“”]/.test(q)){ const id=findBook(q); if(id && BYID[id]){ addRecent(bookName(id)); renderChapters(id); return; } }
  doTextSearch(q, '');
}""")
js = unico(js, "const SHORT = {};", "const SHORT = {};\nconst OTRO_NOMBRE = {qo:'Qohelet', si:'Sirácides'};   // [app] para no confundir Eclesiastés con Eclesiástico\nconst otroNombre = id => OTRO_NOMBRE[id] ? ` <small class=\\\"otro\\\">(${OTRO_NOMBRE[id]})</small>` : '';")
js = unico(js, '<header><h2>${esc(nm)} <span class="cn">${c}</span></h2>', '<header><h2>${esc(nm)} <span class="cn">${c}</span>${otroNombre(id)}</h2>')
js = unico(js, '<div class="meta" style="margin-top:4px"><h2>${esc(b.name)}</h2>', '<div class="meta" style="margin-top:4px"><h2>${esc(b.name)}${otroNombre(id)}</h2>')

# 18) Formas de citar en clase: paréntesis, «cap. 3, v. 16» y libros de un solo capítulo
js = unico(js, "function understand(q){\n  let refs = parseRefs(q);",
"""function understand(q){
  q = q.replace(/[()\\[\\]{}]/g,' ').replace(/^[\\s.,;:]+|[\\s.,;:]+$/g,'').replace(/\\s+/g,' ').trim();   // [app] «(Jn 3,16)», «Jn 3,16.»
  let refs = parseRefs(q);""")
js = unico(js, "    const b=BYID[r.id]; if(!b || r.v1!=null || r.c1!==r.c2 || getChapter(r.id, r.c1)) return r;",
"""    const b=BYID[r.id];
    // [app] libros de un solo capítulo (Abdías, Filemón, Judas, 2 y 3 Juan): «Flm 6» es el versículo 6
    if(b && b.chapters.length===1 && r.v1==null && Math.max(r.c1, r.c2)>1 && existeVers(r.id, 1, r.c1)){
      cambio=true; return {id:r.id, c1:1, v1:r.c1, c2:1, v2:Math.max(r.c1, r.c2)};   // también «Jds 3-5»
    }
    if(!b || r.v1!=null || r.c1!==r.c2 || getChapter(r.id, r.c1)) return r;""")

# 19) Más formas de citar: «Jn 3,16 y Rom 5,8», «Hch 2,1-4; 2,42-47», «Sal 23 (22)», capítulo inexistente
js = unico(js, "  q = q.replace(/[()\\[\\]{}]/g,' ')",
"  q = q.replace(/(\\d+)\\s*\\(\\s*\\d+\\s*\\)/g,'$1')   // [app] «Sal 23 (22)»: doble numeración de los Salmos\n       .replace(/[()\\[\\]{}]/g,' ')")
js = unico(js, "  let refs = parseRefs(q);\n  if(refs){ const f=separarPegados(refs);",
"""  // [app] «Jn 3,16 y Rom 5,8»: una «y» seguida de otro libro separa dos citas
  q = q.replace(/\\s+y\\s+(?=((?:[1-3]\\s*)?[a-záéíóúñ]+)\\s*\\d)/gi, (m, lib)=> findBook(lib) ? '; ' : m);
  let refs = parseRefs(q);
  if(refs){ const f=separarPegados(refs);""")
js = unico(js, "  for(const part of parts){\n    const m = part.match(",
"""  for(const part of parts){
    // [app] «Hch 2,1-4; 2,42-47»: la parte sin libro usa el libro anterior
    if(lastBook && /^\\d+\\s*([,:.\\-–]|$)/.test(part)){
      const mm=part.match(/^(\\d+)\\s*(.*)$/), sub=parseRefs(bookName(lastBook)+' '+mm[1]+' '+mm[2]);
      if(!sub) return null; out.push(...sub); continue;
    }
    const m = part.match(""")
# separar números pegados solo con 3 cifras o más («503»); con 2 cifras se ofrece como sugerencia
js = unico(js, "    const s=String(r.c1), opciones=[];", "    const s=String(r.c1), opciones=[]; if(s.length<3) return r;")
js = unico(js, ": `<div class=\"empty\"><b>No encontré esa cita</b>Revisa el libro, el capítulo y el versículo.</div>`; })();",
""": (()=>{ const r1=u.refs.find(r=>BYID[r.id] && !getChapter(r.id, r.c1));
              if(!r1) return `<div class=\"empty\"><b>No encontré esa cita</b>Revisa el libro, el capítulo y el versículo.</div>`;
              const nC=BYID[r1.id].chapters.length, s2=String(r1.c1); let sug='';
              if(s2.length===2 && r1.v1==null){ const c=+s2[0], v=+s2[1]; if(v>0 && existeVers(r1.id,c,v)) sug=`<div class=\"recent\"><button class=\"btn\" type=\"button\" id=\"sugCita\" data-q=\"${esc(bookName(r1.id))} ${c},${v}\">¿Quisiste decir ${esc(bookName(r1.id))} ${c},${v}?</button></div>`; }
              return `<div class=\"empty\"><b>${esc(bookName(r1.id))} tiene ${nC} capítulo${nC>1?'s':''}</b>No existe el capítulo ${r1.c1}. Revisa el número.${sug}</div>`; })(); })();
      const sg=$('#sugCita'); if(sg) sg.onclick=()=>runQuery(sg.dataset.q, {tidy:true});""")

# 20) Abreviaturas oficiales del índice de La Biblia Latinoamérica (Verbo Divino / San Pablo)
import re as _re
js = _re.sub(r"const ABBR = \{.*?\};", "const ABBR = {gn:'Gén',ex:'Ex',lv:'Lev',nm:'Núm',dt:'Dt',jos:'Jos',jue:'Jue','1s':'1 Sam','2s':'2 Sam','1r':'1 Re','2r':'2 Re','1cr':'1 Cró','2cr':'2 Cró',esd:'Es',ne:'Ne','1m':'1 Mac','2m':'2 Mac',is:'Is',jer:'Jer',ez:'Ez',os:'Os',jl:'Jl',am:'Am',abd:'Abd',jon:'Jon',mi:'Mi',na:'Na',ha:'Hab',so:'Sof',ag:'Ag',za:'Za',mal:'Mal',dn:'Dn',jb:'Job',pr:'Pro',qo:'Ec',ct:'Cant',rt:'Rt',lam:'Lam',est:'Est',tob:'Tob',jdt:'Jdt',bar:'Ba',sab:'Sab',si:'Sir',sal:'Sal',mt:'Mt',mc:'Mc',lc:'Lc',jn:'Jn',hch:'He',rom:'Rom','1co':'1 Co','2co':'2 Co',gal:'Gál',ef:'Ef',flp:'Fil',col:'Col',flm:'Filem','1ts':'1 Tes','2ts':'2 Tes','1tm':'1 Tim','2tm':'2 Tim',tit:'Ti',heb:'Heb',stg:'Stgo','1p':'1 Pe','2p':'2 Pe',jds:'Jud','1jn':'1 Jn','2jn':'2 Jn','3jn':'3 Jn',ap:'Ap'};   // [app] índice oficial", js, count=1)
js = unico(js, "const OTRO_NOMBRE = {qo:'Qohelet', si:'Sirácides'};", "const OTRO_NOMBRE = {qo:'Qohelet', si:'Eclesiástico'};")

# 21) Evangelio del día: enlace a la página del día en Misal.mx (calendario de México)
js = unico(js, "  $('#tabHist').setAttribute('aria-selected', v==='history');",
  "  $('#tabHist').setAttribute('aria-selected', v==='history');\n  $('#tabEvg').setAttribute('aria-selected', v==='gospel');")
js = unico(js, "  main.innerHTML=`<div class=\"col\">\n    <div class=\"empty\"><b>Escribe o dicta una cita</b>",
  "  main.innerHTML=`<div class=\"col\">${tarjetaEvangelio()}\n    <div class=\"empty\"><b>Escribe o dicta una cita</b>")
js = unico(js, "  bindXrefCard();\n  main.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>runQuery(b.dataset.q));\n  $('#resume')",
  "  bindXrefCard();\n  const ec=$('#evgCard'); if(ec) ec.onclick=renderEvangelio;\n  main.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>runQuery(b.dataset.q));\n  $('#resume')")
js = js + """
/* ---------- [app] Evangelio del día: abre la página del día en Misal.mx (calendario de México) ---------- */
function hoyMX(){ return new Intl.DateTimeFormat('en-CA', {timeZone:'America/Mexico_City', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date()); }
// [app] la portada de Misal.mx siempre muestra la misa del día; la dirección con fecha («misal.mx/2026-11-26») da «Página no encontrada» mientras no la publican
function enlaceMisal(){ return 'https://misal.mx/'; }
// [app] Evangelio católico oficial: Vatican News (Santa Sede), con el Leccionario de la Conferencia del Episcopado Mexicano
function enlaceVaticano(){ return 'https://www.vaticannews.va/es/evangelio-de-hoy/' + hoyMX().replace(/-/g,'/') + '.html'; }
/* [app] Las citas de las lecturas del día vienen de misal.mx (las revisa GitHub varias veces al día y las guarda
   en evangelio.json). El TEXTO del Evangelio es el de la Biblia Latinoamericana que trae la app. */
var evgDatos=null;   // var (no let): la portada lo lee antes de llegar a esta línea
function evgCargar(){
  return fetch('evangelio.json', {cache:'no-cache'}).then(r=>r.ok?r.json():null).catch(()=>null).then(d=>{ if(d) evgDatos=d; return evgDatos; });
}
function evgHoy(){ return evgDatos && evgDatos.dias ? evgDatos.dias[hoyMX()] || null : null; }
function tarjetaEvangelio(){
  const d=evgHoy();
  return `<button class="evg-card" id="evgCard" type="button"><span class="ico">✝</span><div><b>Evangelio del día</b><span>${d?esc(d.evangelio.cita):esc(dateLong(hoyMX()))}</span><small>${d?esc(dateLong(hoyMX())):'Lecturas de la misa de hoy · calendario de México'}</small></div></button>`;
}
function renderEvangelio(){
  setView('gospel');
  const pintar=()=>{
    const d=evgHoy();
    let cuerpo='';
    if(d){
      const u=understand(d.evangelio.app), blocks=u?u.refs.map(resolveRef):[], vs=blocks.flatMap(b=>b.verses);
      const multi=vs.length>1;
      const texto = vs.length ? `<p class="txt">${vs.map(x=>`${multi?`<sup>${x.l||x.v}</sup>`:''}${esc(x.t)}`).join(' ')}</p>` : `<p class="hint">No encontré estos versículos en esta Biblia; ábrelos en Misal.mx.</p>`;
      const otra=(k,t)=> d[k] ? `<button class="evg-otra" type="button" data-q="${esc(d[k].app)}"><div><b>${t}</b><span>${esc(d[k].ver||d[k].cita)}</span></div><span aria-hidden="true">›</span></button>` : '';
      cuerpo=`<article class="hit" style="margin-top:14px"><div class="top"><button class="ref" type="button" id="evgRef">${esc(d.evangelio.cita)}</button></div>${texto}
          <div class="acts"><button class="pill" type="button" id="evgCopiar">${ICON_COPY}Copiar</button><button class="pill" type="button" id="evgGuardar">Guardar en mi clase</button><button class="pill" type="button" id="evgLeer">${ICON_READ}Leer capítulo</button></div></article>
        <div class="evg-otras">${otra('primera','Primera lectura')}${otra('salmo','Salmo')}${otra('segunda','Segunda lectura')}</div>`;
      setTimeout(()=>{
        const lab=u?u.refs.map(r=>refLabel(r,true)).join('; '):d.evangelio.cita;
        $('#evgCopiar').onclick=()=>copyText(`${d.evangelio.cita}\n${citeText(vs)}`);
        $('#evgGuardar').onclick=()=>{ if(!u) return; const g=Hist.record(lab, u.refs); toast(g?'Guardado en «'+Hist.nombre(g)+'»':'El historial está en pausa'); };
        $('#evgLeer').onclick=$('#evgRef').onclick=()=>{ if(u) openChapter(u.refs[0].id, u.refs[0].c1, u.refs[0].v1); };
        main.querySelectorAll('.evg-otra[data-q]').forEach(bt=>bt.onclick=()=>runQuery(bt.dataset.q, {tidy:true}));
      });
    } else {
      cuerpo=`<div class="empty" style="margin-top:14px"><b>${navigator.onLine===false?'Sin internet':'Todavía no está el Evangelio de hoy'}</b>${navigator.onLine===false?'Conéctate una vez hoy para que la app reciba la cita del Evangelio del día.':'La cita se actualiza sola en la mañana, cuando Misal.mx publica las lecturas. Mientras, puedes abrir Misal.mx.'}</div>`;
    }
    main.innerHTML=`<div class="col">
      <div class="evg-head"><span class="fecha">${esc(dateLong(hoyMX()))} · hoy</span><h2>Evangelio del día</h2>
        ${d&&d.santos?`<div class="santos">${esc(d.santos)}</div>`:''}</div>
      ${cuerpo}
      <a class="evg-otra" href="${enlaceMisal()}" target="_blank" rel="noopener" style="text-decoration:none;margin-top:16px;color:inherit"><div><b>Misal diario de México</b><span>Ver todas las oraciones y lecturas en Misal.mx</span></div><span aria-hidden="true">›</span></a>
      <p class="evg-fuente">${d&&d.fuente==='vaticannews.va' ? `Misal.mx aún no publica las lecturas de hoy; la cita se tomó de <a href="${enlaceVaticano()}" target="_blank" rel="noopener">Vatican News</a> (Santa Sede, Leccionario de la Conferencia del Episcopado Mexicano).` : `Las citas del día se toman de <a href="${enlaceMisal()}" target="_blank" rel="noopener">misal.mx</a> (calendario litúrgico de México).`} El texto es el de tu Biblia Latinoamericana; la numeración de algunos versículos puede variar un poco respecto al leccionario.</p>
    </div>`;
  };
  pintar(); window.scrollTo({top:0});
  evgCargar().then(()=>{ if(view==='gospel') pintar(); });
}
evgCargar().then(()=>{ const c=$('#evgCard'); if(c && evgHoy()){ c.outerHTML=tarjetaEvangelio(); const n=$('#evgCard'); if(n) n.onclick=renderEvangelio; } });
$('#tabEvg').onclick=renderEvangelio;
"""

# 22) Historial por grupos: las citas se guardan en el grupo activo hasta que se elige otro
h_ini = js.index('/* ---------- Historial por día ---------- */')
h_fin = js.index('Hist.connect();', h_ini) + len('Hist.connect();')
js = js[:h_ini] + (pathlib.Path(__file__).parent / 'partes' / 'historial.js').read_text(encoding='utf8') + js[h_fin:]
js = unico(js, "    if(total) Hist.record(label, u.refs);", "    const gGuardado = total ? Hist.record(label, u.refs) : null;   // [app] grupo donde se guardó")
js = unico(js, "      ${u.spoken ? `<p class=\"heard\">Entendí <i>«${esc(q)}»</i></p>` : ''}\n      <div class=\"results\" id=\"res\"></div></div>`;",
  "      ${u.spoken ? `<p class=\"heard\">Entendí <i>«${esc(q)}»</i></p>` : ''}\n      ${gGuardado ? `<p class=\"guardado\">Se guardó en <button class=\"linkbtn\" type=\"button\" id=\"irGrupo\">${esc(Hist.nombre(gGuardado))}</button></p>` : ''}\n      <div class=\"results\" id=\"res\"></div></div>`;\n    const ig=$('#irGrupo'); if(ig) ig.onclick=()=>renderHistory();")
css_extra_hist = """
/* ---------- Historial por grupos ---------- */
.grupo-activo{background:var(--leaf); border:1.5px solid var(--gold-bright); border-radius:14px; padding:12px 14px; margin-top:14px}
.grupo-activo .lbl{display:block; font-size:11.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--gold); font-weight:700; margin-bottom:6px}
.ga-fila{display:flex; gap:8px; flex-wrap:wrap; align-items:center}
.ga-fila select{flex:1 1 200px; min-height:44px; font-size:16px; font-weight:600}
.day.activo{border-color:var(--gold-bright); box-shadow:0 0 0 1.5px var(--gold-bright)}
.badge-activo{color:var(--ink); background:var(--gold-wash); border-radius:999px; padding:2px 8px; letter-spacing:.04em}
.vacio-grupo{padding:12px 18px; margin:0; color:var(--ink-soft); font-size:14px}
.guardado{font-size:13px; color:var(--ink-soft); margin:-2px 0 8px}
.pill:disabled{opacity:.45}
.tit-fila{display:flex; align-items:flex-start; gap:10px}
.tit-fila .name{flex:1; min-width:0; resize:none; overflow:hidden; line-height:1.15; display:block}
.btn-guardar{flex:none; display:inline-flex; align-items:center; gap:5px; min-height:36px; margin-top:4px; padding:0 11px; border-radius:999px; border:1.5px solid var(--gold-bright); background:var(--gold-wash); color:var(--ink); font:600 12.5px/1 var(--f-ui); cursor:pointer; white-space:nowrap}
.btn-guardar:disabled{opacity:.45}
.day.plegada{padding-bottom:4px}
.day.plegada header{border-bottom:0}
.guardada-ok{flex:none; margin-top:12px; font-size:13px; font-weight:700; color:var(--gold); white-space:nowrap}
"""

# 23) Micrófono que funciona también en iPhone: graba y entiende la voz dentro del teléfono (voz/)
v_ini = js.index('/* ---------- Dictado (reconocimiento de voz del teléfono) ---------- */')
v_fin = js.index('/* ---------- Guardado local ---------- */')
js = js[:v_ini] + (pathlib.Path(__file__).parent / 'partes' / 'dictado.js').read_text(encoding='utf8') + js[v_fin:]
js = unico(js, "Versión del 25 de noviembre de 2026.", "Versión del 26 de noviembre de 2026 (7).")

# 11) Modo oscuro (botón)
js = js + '''
/* ---------- [app] Modo claro / oscuro ---------- */
const temaBtn=$('#tema');
const temaActual=()=>document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
const colorBarra=()=>document.querySelector('meta[name="theme-color"]').setAttribute('content', temaActual()==='dark' ? '#0a2a1f' : '#0f3a2c');
temaBtn.onclick=()=>{ const t=temaActual()==='dark'?'light':'dark'; document.documentElement.dataset.theme=t; store.set('blat-tema', t); colorBarra(); toast(t==='dark'?'Modo oscuro':'Modo claro'); };
colorBarra();
'''
(app / 'css' / 'estilos.css').write_text((app / 'css' / 'estilos.css').read_text(encoding='utf8') + css_extra_hist, encoding='utf8')
(app / 'js' / 'app.js').write_text('(function(){\n' + js + '\n})();\n', encoding='utf8')
print('listo:', app)
