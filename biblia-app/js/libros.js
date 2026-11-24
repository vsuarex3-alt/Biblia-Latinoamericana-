/* Lista de libros y abreviaturas, y lectura de citas habladas («Juan seis ocho al catorce»).
   Tomado del «Buscador Biblia Latinoamérica». */
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
 ['si','Eclesiástico',['si','sir','sirácides','siracides','sirácida','siracida','sirac','ben sira','bensira','ben sirac','eclo','ecli','eclesiástico','eclesiastico'],['siracides']],
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
 ['flp','Filipenses',['flp','fil','fp','flps','filip','filipenses'],['cartaalosfilipenses']],
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
root.BibliaParser = {BOOKS};
})(this);

(function(root){
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const UNITS = {cero:0, uno:1, un:1, una:1, primero:1, dos:2, tres:3, cuatro:4, cinco:5, seis:6, siete:7, ocho:8, nueve:9};
const TEENS = {diez:10, once:11, doce:12, trece:13, catorce:14, quince:15, dieciseis:16, diecisiete:17, dieciocho:18, diecinueve:19,
  veinte:20, veintiuno:21, veintiun:21, veintiuna:21, veintidos:22, veintitres:23, veinticuatro:24, veinticinco:25, veintiseis:26, veintisiete:27, veintiocho:28, veintinueve:29};
const TENS = {treinta:30, cuarenta:40, cincuenta:50, sesenta:60, setenta:70, ochenta:80, noventa:90};
// convierte palabras numéricas en dígitos: «ciento cuarenta y cuatro» → 144
function numberize(words){
  const out=[];
  for(let i=0;i<words.length;){
    let w=words[i], val=null, j=i;
    if(/^\d+$/.test(w)){ out.push(w); i++; continue; }
    if(w==='cien' || w==='ciento'){ val=100; j=i+1; w=words[j]; }
    if(w in TENS){ val=(val||0)+TENS[w]; j++; if(words[j]==='y' && words[j+1] in UNITS && UNITS[words[j+1]]>0){ val+=UNITS[words[j+1]]; j+=2; } }
    else if(w in TEENS){ val=(val||0)+TEENS[w]; j++; if(w==='diez' && words[j]==='y' && words[j+1] in UNITS){ val+=UNITS[words[j+1]]-0; j+=2; } }
    else if(w in UNITS && !(val===null && (w==='un'||w==='una') && !/^\d|^(cap|vers|al|a|y|hasta)/.test(words[i+1]||'') && i===0)){ val=(val||0)+UNITS[w]; j++; }
    if(val!==null && j>i){ out.push(String(val)); i=j; } else { out.push(words[i]); i++; }
  }
  return out;
}
function toCita(text){
  let s = norm(text).replace(/dos\s+puntos/g,' : ').replace(/[¿?¡!"“”«»]/g,' ')
    .replace(/(\d)\s*[:]\s*(\d)/g,'$1,$2').replace(/([,\-–:;])/g,' $1 ').replace(/\.(?!\d)/g,' ').replace(/(\d)\.(\d)/g,'$1 . $2');
  if(s.includes(';')) return s.split(';').map(p=>toCita(p)).every(Boolean) ? s.split(';').map(p=>toCita(p)).join('; ') : null;
  let w = s.split(/\s+/).filter(Boolean);
  w = numberize(w);
  // separar libro de números: el libro es todo lo que va antes del primer número que no sea prefijo 1-3 de libro
  let k=0;
  while(k<w.length){
    if(/^\d+$/.test(w[k])){
      const isPrefix = k===0 && /^[1-3]$/.test(w[k]) && w[k+1] && /^[a-z]/.test(w[k+1]) && !/^(cap|vers|al$|a$|y$|hasta|coma|guion)/.test(w[k+1]);
      if(!isPrefix) break;
    }
    k++;
  }
  const book = w.slice(0,k).filter(x=>!/^(capitulo|cap|el|la)$/.test(x)).join(' ').trim();
  if(!book || k>=w.length) return null;
  const nums=[]; // tokens: números y separadores
  for(const x of w.slice(k)){
    if(/^\d+$/.test(x)) nums.push(+x);
    else if(/^(versiculos?|versos?|vers|v|vv|coma|,|:)$/.test(x)){ if(nums[nums.length-1]!==',') nums.push(','); }   // [app] «cap. 3, v. 16»
    else if(/^(al|a|hasta|guion|-|–)$/.test(x)) nums.push('-');
    else if(/^(y|\.|e)$/.test(x)) nums.push('.');
    else if(/^(capitulo|capitulos|cap|del|desde|el|de|los)$/.test(x)) continue;
    else return null;   // palabra extraña: no es una cita
  }
  // armar: cap [, v [- v2] [. v3 ...]]  ó  cap - cap2
  if(typeof nums[0]!=='number') return null;
  const c=nums[0]; let i=1, out=`${book} ${c}`;
  if(i>=nums.length) return out;
  if(nums[i]==='-' && typeof nums[i+1]==='number' && i+2>=nums.length) return `${out}-${nums[i+1]}`;
  if(nums[i]===',' ) i++;
  if(typeof nums[i]!=='number') return null;
  const parts=[]; let cur=String(nums[i]); i++;
  while(i<nums.length){
    const sep=nums[i], n=nums[i+1];
    if(typeof n!=='number'){ if(sep===',' && i===nums.length-1) break; return null; }
    if(sep==='-') cur+=`-${n}`;
    else if(sep==='.' || sep===','){ parts.push(cur); cur=String(n); }
    else if(typeof sep==='number'){ parts.push(cur); cur=String(sep); i--; }
    i+=2;
  }
  parts.push(cur);
  return `${out},${parts.join('.')}`;
}
const api={toCita, numberize};
if(typeof module!=='undefined') module.exports=api; else root.Hablado=api;
})(this);
