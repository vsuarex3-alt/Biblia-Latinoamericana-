/* Analizador del PDF tomado de tu «Buscador Biblia Latinoamérica», con correcciones para no perder texto:
   (1) una línea en negrita solo se toma como título si la línea anterior terminó una oración y no
       contiene el número del siguiente versículo (antes se perdían líneas de pasajes en negrita);
   (2) 2 Timoteo tiene 4 capítulos (antes se cortaba en el 3);
   (3) acepta versículos impresos fuera de orden (p. ej. Job 24 y 26, Ester 15) y erratas de número
       al inicio de capítulo (Génesis 8, Amós 2, Ester 13);
   (4) ya no corta la última línea de un libro junto con la introducción del siguiente.
   Las correcciones van marcadas con [corrección]. Ver REVISION.md. */
(function(root){
const BOOKS = [
 // [id, nombre, abreviaturas..., claves de encabezado]
 ['gn','Génesis',['gn','gen','génesis','genesis'],['genesis']],
 ['ex','Éxodo',['ex','éx','exo','éxodo','exodo'],['exodo']],
 ['lv','Levítico',['lv','lev','levítico','levitico'],['levitico']],
 ['nm','Números',['nm','num','núm','números','numeros'],['numeros']],
 ['dt','Deuteronomio',['dt','deut','deuteronomio'],['deuteronomio','deutoronomio']],
 ['jos','Josué',['jos','josué','josue'],['josue']],
 ['jue','Jueces',['jue','jc','jueces'],['jueces']],
 ['1s','1 Samuel',['1s','1sam','1 samuel','1samuel','i samuel'],['primerlibrodesamuel']],
 ['2s','2 Samuel',['2s','2sam','2 samuel','2samuel','ii samuel'],['segundolibrodesamuel']],
 ['1r','1 Reyes',['1r','1re','1rey','1 reyes','1reyes'],['primerlibrodelosreyes']],
 ['2r','2 Reyes',['2r','2re','2rey','2 reyes','2reyes'],['segundolibrodelosreyes']],
 ['1cr','1 Crónicas',['1cr','1cro','1crón','1 crónicas','1cronicas'],['primerlibrodelascronicas']],
 ['2cr','2 Crónicas',['2cr','2cro','2crón','2 crónicas','2cronicas'],['segundolibrodelascronicas']],
 ['esd','Esdras',['esd','esdr','esdras'],['esdras']],
 ['ne','Nehemías',['ne','neh','nehemías','nehemias'],['nehemias']],
 ['1m','1 Macabeos',['1m','1mac','1 macabeos','1macabeos'],['primerlibrodelosmacabeos']],
 ['2m','2 Macabeos',['2m','2mac','2 macabeos','2macabeos'],['segundolibrodelosmacabeos']],
 ['is','Isaías',['is','isa','isaías','isaias'],['isaias']],
 ['jer','Jeremías',['jer','jr','jeremías','jeremias'],['jeremias']],
 ['ez','Ezequiel',['ez','eze','ezeq','ezequiel'],['ezequiel']],
 ['os','Oseas',['os','ose','oseas'],['oseas']],
 ['jl','Joel',['jl','joel'],['joel']],
 ['am','Amós',['am','amós','amos'],['amos']],
 ['abd','Abdías',['abd','ab','abdías','abdias'],['abdias']],
 ['jon','Jonás',['jon','jonás','jonas'],['jonas']],
 ['mi','Miqueas',['mi','miq','miqueas'],['miqueas']],
 ['na','Nahúm',['na','nah','nahúm','nahum'],['nahum']],
 ['ha','Habacuc',['ha','hab','habacuq','habacuc'],['habacuq']],
 ['so','Sofonías',['so','sof','sofonías','sofonias'],['sofonias']],
 ['ag','Ageo',['ag','ageo'],['ageo']],
 ['za','Zacarías',['za','zac','zacarías','zacarias'],['zacarias']],
 ['mal','Malaquías',['mal','ml','malaquías','malaquias'],['malaquias']],
 ['dn','Daniel',['dn','dan','daniel'],['daniel']],
 ['jb','Job',['jb','job'],['job']],
 ['pr','Proverbios',['pr','prov','proverbios'],['proverbios']],
 ['qo','Eclesiastés',['qo','qoh','qohelet','ecl','eclesiastés','eclesiastes'],['qohelet/eclesiastes','qohelet','eclesiastes']],
 ['ct','Cantar de los Cantares',['ct','cant','cnt','cantar','cantares','cantar de los cantares'],['cantardeloscantares']],
 ['rt','Rut',['rt','rut'],['rut']],
 ['lam','Lamentaciones',['lam','lm','lamentaciones'],['lamentaciones']],
 ['est','Ester',['est','ester'],['ester']],
 ['tob','Tobías',['tob','tb','tobías','tobias'],['tobias']],
 ['jdt','Judit',['jdt','judit'],['judit']],
 ['bar','Baruc',['bar','ba','baruc'],['baruc']],
 ['sab','Sabiduría',['sab','sb','sabiduría','sabiduria'],['sabiduria']],
 ['si','Eclesiástico',['si','sir','sirácides','siracides','eclo','eclesiástico','eclesiastico'],['siracides']],
 ['sal','Salmos',['sal','sl','salmo','salmos','ps'],['salmos']],
 ['mt','Mateo',['mt','mat','mateo'],['evangeliosegunsanmateo','evangeliosegunmateo']],
 ['mc','Marcos',['mc','mr','mar','marcos'],['evangeliosegunsanmarcos','evangeliosegunmarcos']],
 ['lc','Lucas',['lc','luc','lucas'],['evangeliosegunsanlucas','evangeliosegunlucas']],
 ['jn','Juan',['jn','juan'],['evangeliosegunsanjuan','evangeliosegunjuan']],
 ['hch','Hechos',['hch','he','hech','hechos'],['hechosdelosapostoles']],
 ['rom','Romanos',['rom','ro','rm','romanos'],['cartaalosromanos']],
 ['1co','1 Corintios',['1co','1cor','1 corintios','1corintios'],['primeracartaaloscorintios']],
 ['2co','2 Corintios',['2co','2cor','2 corintios','2corintios'],['segundacartaaloscorintios']],
 ['gal','Gálatas',['gal','gál','ga','gálatas','galatas'],['cartaalosgalatas']],
 ['ef','Efesios',['ef','efe','efesios'],['cartaalosefesios']],
 ['flp','Filipenses',['flp','fil','filipenses'],['cartaalosfilipenses']],
 ['col','Colosenses',['col','colosenses'],['cartaaloscolosenses']],
 ['flm','Filemón',['flm','filem','filemón','filemon'],['cartaafilemon']],
 ['1ts','1 Tesalonicenses',['1ts','1tes','1 tesalonicenses','1tesalonicenses'],['primeracartaalostesalonicenses']],
 ['2ts','2 Tesalonicenses',['2ts','2tes','2 tesalonicenses','2tesalonicenses'],['segundacartaalostesalonicenses']],
 ['1tm','1 Timoteo',['1tm','1tim','1ti','1 timoteo','1timoteo'],['primeracartaatimoteo']],
 ['2tm','2 Timoteo',['2tm','2tim','2ti','2 timoteo','2timoteo'],['segundacartaatimoteo']],
 ['tit','Tito',['tit','tt','tito'],['cartaatito']],
 ['heb','Hebreos',['heb','hb','hebreos'],['cartaaloshebreos']],
 ['stg','Santiago',['stg','stgo','sant','sgo','st','santiago'],['cartadesantiago']],
 ['1p','1 Pedro',['1p','1pe','1pd','1ped','1 pedro','1pedro'],['primeracartadepedro']],
 ['2p','2 Pedro',['2p','2pe','2pd','2ped','2 pedro','2pedro'],['segundacartadepedro']],
 ['jds','Judas',['jds','jud','judas'],['cartadejudas']],
 ['1jn','1 Juan',['1jn','1jo','1 juan','1juan'],['primeracartadejuan']],
 ['2jn','2 Juan',['2jn','2jo','2 juan','2juan'],['segundacartadejuan']],
 ['3jn','3 Juan',['3jn','3jo','3 juan','3juan'],['terceracartadejuan']],
 ['ap','Apocalipsis',['ap','apoc','apocalipsis'],['apocalipsis']],
];
const LASTCH = {"gn": 50, "ex": 40, "lv": 27, "nm": 36, "dt": 34, "jos": 24, "jue": 21, "1s": 31, "2s": 24, "1r": 22, "2r": 25, "1cr": 29, "2cr": 36, "esd": 10, "ne": 13, "1m": 16, "2m": 15, "is": 66, "jer": 52, "ez": 48, "os": 14, "jl": 4, "am": 9, "abd": 1, "jon": 4, "mi": 7, "na": 3, "ha": 3, "so": 3, "ag": 2, "za": 14, "mal": 3, "dn": 14, "jb": 42, "pr": 31, "qo": 12, "ct": 8, "rt": 4, "lam": 5, "est": 16, "tob": 14, "jdt": 16, "bar": 6, "sab": 19, "si": 51, "sal": 150, "mt": 28, "mc": 16, "lc": 24, "jn": 21, "hch": 28, "rom": 16, "1co": 16, "2co": 13, "gal": 6, "ef": 6, "flp": 4, "col": 4, "flm": 1, "1ts": 5, "2ts": 3, "1tm": 6, "2tm": 4, "tit": 3, "heb": 13, "stg": 5, "1p": 5, "2p": 3, "jds": 1, "1jn": 5, "2jn": 1, "3jn": 1, "ap": 22};
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const HEADER = {}; BOOKS.forEach(b=>b[3].forEach(k=>HEADER[k]=b[0]));
const headerKey = s => norm(s).replace(/\s+/g,'');

function buildLines(items){
  const its = items.filter(i=>i.str && i.str.trim()).map(i=>({s:i.str, f:i.fontName, x:i.transform[4], y:i.transform[5], w:i.width||0}));
  its.sort((a,b)=> (b.y-a.y) || (a.x-b.x));
  const lines=[];
  for(const it of its){
    let L = lines.length ? lines[lines.length-1] : null;
    if(!L || Math.abs(L.y-it.y)>3){ L={y:it.y, items:[]}; lines.push(L); }
    L.items.push(it);
  }
  for(const L of lines){
    L.items.sort((a,b)=>a.x-b.x);
    // fusionar fragmentos pegados (palabras partidas) en tokens
    const toks=[]; let prevEnd=null;
    for(const it of L.items){
      const last = L.items[L.items.indexOf(it)-1];
      const digitEdge = last && last.f!==it.f && (/^\d+$/.test(last.s.trim()) || /^\d+$/.test(it.s.trim()));
      const glue = prevEnd!==null && (it.x - prevEnd) < 1.2 && !/^\s/.test(it.s) && !digitEdge;
      if(glue && toks.length){ const t=toks[toks.length-1]; t.s+=it.s; t.fonts.add(it.f); }
      else toks.push({s:it.s, fonts:new Set([it.f])});
      prevEnd = it.x + it.w;
    }
    // dividir tokens por espacios internos
    L.toks=[]; for(const t of toks){ for(const p of t.s.split(/\s+/)) if(p) L.toks.push({s:p, fonts:t.fonts}); }
    L.text = L.toks.map(t=>t.s).join(' ');
    L.fonts = new Set(L.items.map(i=>i.f));
  }
  return lines;
}

function newState(){ return {books:[], book:null, pending:null, chap:0, verse:0, cur:null, inText:false, anomalies:[], headerFont:null, prevEnd:true}; }

function startBook(st, id, page){
  const meta = BOOKS.find(b=>b[0]===id);
  st.book = {id, name:meta[1], page, chapters:{}}; st.books.push(st.book);
  st.chap=0; st.verse=0; st.cur=null; st.inText=false; st.pending=null; st.dup=false; st.paused=false; st.run=0;
}
function startChapter(st, n){ st.chap=n; st.verse=0; st.cur=null; st.inText=false; st.dup=false; st.paused=false; st.run=0; st.book.chapters[n]=st.book.chapters[n]||{}; }
function pause(st){ // fin del texto bíblico del libro: quitar lo que se haya agregado de la introducción siguiente
  if(st.cur && st.runStart!=null) st.cur.t = st.cur.t.slice(0, st.runStart);
  st.paused=true; st.inText=false; st.cur=null; st.run=0;
}
function startVerse(st, n, page){
  st.verse=n; st.inText=true;
  const ch = st.book.chapters[st.chap];
  if(ch[n]){ st.cur = ch[n]; return; }
  st.cur = ch[n] = {t:'', p:page};
}
function addText(st, s){ if(st.cur) st.cur.t += (st.cur.t ? ' ' : '') + s; }

function parsePage(items, pageNum, st){
  const lines = buildLines(items);
  for(let li=0; li<lines.length; li++){ const L=lines[li];
    if(L.y < 65 && /^\d+$/.test(L.text)) continue;           // número de página
    if(L.y > 735 && HEADER[headerKey(L.text)]){              // encabezado corrido
      st.headerFont = L.items[0].f;
      const id = HEADER[headerKey(L.text)];
      {
        if(!st.book || id!==st.book.id){ if(st.pending!==id) st.pending=id; }
        else st.pending=null;
      }
      continue;
    }
    const headerFont = st.headerFont;
    const isLast = st.book && st.chap===LASTCH[st.book.id];
    if(L.y > 735 && st.book && isLast && !/^[\d\p{Ll}]/u.test(L.text)){ pause(st); continue; }
    let lone = /^\d{1,3}$/.test(L.text) ? +L.text : null;
    // capítulo y versículo en la misma línea: «1 1 Algunas…» (el primero en la fuente de títulos)
    let chapInline = false;
    if(lone===null && L.toks.length>2 && /^\d{1,3}$/.test(L.toks[0].s) && /^\d{1,3}$/.test(L.toks[1].s)
       && L.toks[0].fonts.size===1 && L.toks[0].fonts.has(headerFont)){ lone=+L.toks[0].s; chapInline=true; }
    // ¿Inicio de libro?
    if(st.pending && lone===1){ startBook(st, st.pending, pageNum); startChapter(st,1); if(chapInline){ L.toks.shift(); } else continue; }
    if(st.pending) continue;                                 // introducción del nuevo libro
    if(!st.book) continue;
    // ¿Nuevo capítulo?
    else if(lone!==null && st.book && lone===st.chap && st.verse>1){ st.dup=true; continue; }   // capítulo repetido en el PDF
    else if(lone!==null && lone>st.chap && lone<=st.chap+3){
      if(lone!==st.chap+1) st.anomalies.push(`${st.book.id} salto de capítulo ${st.chap}→${lone} (p.${pageNum})`);
      startChapter(st, lone); if(chapInline){ L.toks.shift(); } else continue;
    }
    if(st.chap===0 || st.dup || st.paused) continue;
    // Títulos de sección (todo en la fuente del encabezado, sin número de versículo al inicio)
    const jm0 = L.toks[0].s.match(/^[^\p{L}\d]{0,3}\p{Lu}?[^\p{L}\d]{1,3}(\d{1,3})$/u);
    if(jm0) L.toks[0] = {s:jm0[1], fonts:L.toks[0].fonts};
    const firstNum = /^\d+$/.test(L.toks[0].s) ? +L.toks[0].s : null;
    let hChars=0, allChars=0; for(const it of L.items){ const n=it.s.replace(/\s/g,'').length; allChars+=n; if(it.f===headerFont) hChars+=n; }
    const traeSiguiente = L.toks.some(t=>t.s===String(st.verse+1));
    const isHeading = headerFont && firstNum===null && allChars>0 && hChars/allChars>=0.8 && L.text.length<=80 && !/[,;]$/.test(L.text)
                      && st.prevEnd && !traeSiguiente;
    if(isHeading){ st.afterHeading=true; continue; }
    // Tras un título, las líneas sin número de versículo son comentario, salvo que traigan el siguiente versículo
    if(firstNum===null && st.afterHeading){
      const exp=String(st.verse+1);
      if(!L.toks.some(t=>t.s===exp || t.s.endsWith('.'+exp) || t.s.endsWith(','+exp))) continue;
    }
    st.afterHeading=false;
    // Título de sección en la misma fuente: línea corta, empieza con mayúscula, sin puntuación final,
    // la línea anterior terminó una oración y la siguiente empieza con número de versículo.
    const next = lines[li+1];
    const nextStartsVerse = next && /^\d{1,3}(\D|$)/.test(next.toks[0].s) && !(next.y > 735);
    if(firstNum===null && st.prevEnd && nextStartsVerse && L.text.length < 90
       && /^[«¿¡"“A-ZÁÉÍÓÚÑ]/.test(L.text) && !/[.,;:!?»”"’)\]]$/.test(L.text)){
      continue;
    }
    // Recorrer tokens buscando números de versículo
    let buf=[];
    const flush=()=>{ if(buf.length){ if(st.inText) addText(st, buf.join(' ')); buf=[]; } };
    const verseBefore = st.verse, curBefore = st.cur, lenBefore = st.cur ? st.cur.t.length : 0, prevEndBefore = st.prevEnd;
    // separar números pegados a la puntuación anterior: «niño.20» → «niño.» «20»
    const toks=[]; for(const t of L.toks){ const m=t.s.match(/^(.*[.,;:!?»”")\]])(\d{1,3})$/); if(m){ toks.push({s:m[1],fonts:t.fonts}); toks.push({s:m[2],fonts:t.fonts}); } else toks.push(t); }
    toks.forEach((t0,i)=>{ let t=t0;
      const g = t.s.match(/^(\d{1,3})([«¿¡"“A-Za-zÁÉÍÓÚÑáéíóúñ].*)$/);
      if(g && +g[1]===st.verse+1 && st.inText){ flush(); startVerse(st, +g[1], pageNum); buf.push(g[2]); return; }
      if(/^\d{1,3}$/.test(t.s) && +t.s===st.verse && st.inText && i>0 || (/^\d{1,3}$/.test(t.s) && +t.s===st.verse && st.inText && i===0 && st.verse>0)){ st.sawRepeat=true; return; } // número repetido en líneas poéticas
      if(i===0){ const jm=t.s.match(/^[^\p{L}\d]{0,3}\p{Lu}?[^\p{L}\d]{1,3}(\d{1,3})$/u); if(jm && +jm[1]===st.verse+1) t={s:jm[1],fonts:t.fonts}; } // basura pegada «:B:51»
      if(/^\d{1,3}$/.test(t.s)){
        const n=+t.s, exp=st.verse+1;
        const atStart = i===0;
        const ok = n===exp || (n>exp && n<=exp+2 && (atStart || /^[«¿¡"“A-ZÁÉÍÓÚÑ(]/.test((toks[i+1]||{}).s||'')))
                  || (!st.inText && n<=3 && atStart);
        if(ok){
          flush();
          if(n!==exp && st.inText) st.anomalies.push(`${st.book.id} ${st.chap}: versículo ${st.verse}→${n} (p.${pageNum})`);
          startVerse(st, n, pageNum); return;
        }
        // [corrección] versículos fuera de orden y erratas al inicio de capítulo
        if(atStart){
          const ch = st.book.chapters[st.chap];
          const max = (st.ref && st.ref[st.book.id] && st.ref[st.book.id][st.chap-1]) || 200;
          const mayus = /^[«¿¡"“A-ZÁÉÍÓÚÑ(]/.test((toks[i+1]||{}).s||'');
          const tag = `${st.book.id} ${st.chap}`;
          if(st.verse===0 && !st.inText){
            if(L.text.includes('.—')) return;                    // comentario de la edición, no es texto bíblico
            const prevCh = st.book.chapters[st.chap-1];
            const prevMax = prevCh ? Math.max(0, ...Object.keys(prevCh).map(Number)) : -1;
            const resto = toks.slice(i+1).map(x=>x.s).concat(lines[li+1] ? lines[li+1].toks.slice(0,30).map(x=>x.s) : []);
            const trae12 = resto.includes('1') || resto.includes('2');
            const sigEmpieza1 = !!(lines[li+1] && lines[li+1].toks[0] && lines[li+1].toks[0].s==='1');
            if(prevCh && n===prevMax+1){ flush(); prevCh[n]={t:'', p:pageNum}; st.cur=prevCh[n]; st.inText=true;
              st.anomalies.push(`${tag}: «${n}» al inicio del capítulo pertenece al capítulo anterior (${st.chap-1}:${n}) (p.${pageNum})`); return; }
            if(prevCh && n===prevMax && (sigEmpieza1 || !trae12)){ flush(); st.cur=prevCh[n]; st.inText=true;
              st.anomalies.push(`${tag}: «${n}» al inicio del capítulo es la continuación de ${st.chap-1}:${n} (p.${pageNum})`); return; }
            if(trae12){ flush(); startVerse(st, 1, pageNum);
              if(toks[i+1] && toks[i+1].s==='.') toks[i+1] = {s:'', fonts:toks[i+1].fonts};   // «40 .» basura del número erróneo
              st.anomalies.push(`${tag}: número «${n}» erróneo al inicio del capítulo, se toma como versículo 1 (p.${pageNum})`); return; }
            if(n<=max){ flush(); startVerse(st, n, pageNum);
              st.anomalies.push(`${tag}: el capítulo empieza en el versículo ${n} (p.${pageNum})`); return; }
          } else if(st.inText && !ch[n] && n<=max && mayus && (n<exp || n>exp+2)){
            flush(); st.anomalies.push(`${tag}: versículo ${n} fuera de orden, después del ${st.verse} (p.${pageNum})`);
            startVerse(st, n, pageNum); return;
          }
        }
      }
      if(t.s) buf.push(t.s);
    });
    flush();
    st.prevEnd = /[.!?»”":;)]$/.test(L.text);
    if(st.sawRepeat){ st.sawRepeat=false; st.run=0; st.runStart=null; }
    else if(st.verse===verseBefore && st.cur===curBefore){ if(st.run===0 && !prevEndBefore){ /* [corrección] continuación de la oración: no es introducción */ } else { if(st.run===0) st.runStart=lenBefore; st.run++; } } else { st.run=0; st.runStart=null; }
    if(isLast && st.run>=12) pause(st);
  }
}
function finish(st){
  const books = st.books.map(b=>{
    const chapters = Object.keys(b.chapters).map(Number).sort((a,c)=>a-c).map(c=>{
      const vs=b.chapters[c]; return {n:c, v:Object.keys(vs).map(Number).sort((a,d)=>a-d).map(v=>[v, vs[v].t.replace(/\s+/g,' ').trim(), vs[v].p])};
    });
    return {id:b.id, name:b.name, page:b.page, chapters};
  });
  return {books, anomalies:st.anomalies};
}
const api={BOOKS, norm, newState, parsePage, finish};
// [corrección] número máximo de versículos por capítulo (opcional) para validar números fuera de orden
api.newStateRef = ref => { const st=newState(); st.ref=ref; return st; };
if(typeof module!=='undefined') module.exports=api; else root.BibliaParser=api;
})(this);
