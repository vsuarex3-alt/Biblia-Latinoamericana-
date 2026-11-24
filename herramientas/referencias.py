#!/usr/bin/env python3
"""Convierte cross_references.txt de OpenBible.info (CC-BY) en biblia-app/js/referencias.js,
con la misma lógica que el buscador usa al cargar el ZIP: hasta N referencias por versículo,
ordenadas por votos, y los ajustes de numeración de Joel y Malaquías.
Uso: python3 referencias.py ruta/cross_references.txt"""
import sys, json, pathlib
OSIS = {'Gen':'gn','Exod':'ex','Lev':'lv','Num':'nm','Deut':'dt','Josh':'jos','Judg':'jue','Ruth':'rt','1Sam':'1s','2Sam':'2s','1Kgs':'1r','2Kgs':'2r','1Chr':'1cr','2Chr':'2cr','Ezra':'esd','Neh':'ne','Esth':'est','Job':'jb','Ps':'sal','Prov':'pr','Eccl':'qo','Song':'ct','Isa':'is','Jer':'jer','Lam':'lam','Ezek':'ez','Dan':'dn','Hos':'os','Joel':'jl','Amos':'am','Obad':'abd','Jonah':'jon','Mic':'mi','Nah':'na','Hab':'ha','Zeph':'so','Hag':'ag','Zech':'za','Mal':'mal','Matt':'mt','Mark':'mc','Luke':'lc','John':'jn','Acts':'hch','Rom':'rom','1Cor':'1co','2Cor':'2co','Gal':'gal','Eph':'ef','Phil':'flp','Col':'col','1Thess':'1ts','2Thess':'2ts','1Tim':'1tm','2Tim':'2tm','Titus':'tit','Phlm':'flm','Heb':'heb','Jas':'stg','1Pet':'1p','2Pet':'2p','1John':'1jn','2John':'2jn','3John':'3jn','Jude':'jds','Rev':'ap'}
MAX = 8
def fix(i, c, v):
    if i == 'jl':
        if c == 2 and v >= 28: return 3, v - 27
        if c == 3: return 4, v
    if i == 'mal' and c == 4: return 3, v + 18
    return c, v
def ref(s):
    a, _, b = s.partition('-'); pa = a.split('.')
    i = OSIS.get(pa[0])
    if not i or len(pa) < 3: return None
    c, v = fix(i, int(pa[1]), int(pa[2])); c2, v2 = c, v
    if b:
        pb = b.split('.')
        if OSIS.get(pb[0]) == i and len(pb) >= 3: c2, v2 = fix(i, int(pb[1]), int(pb[2]))
    return i, c, v, c2, v2
tmp = {}
for line in pathlib.Path(sys.argv[1]).read_text(encoding='utf8').splitlines():
    if not line or line.startswith('From') or line.startswith('#'): continue
    p = line.split('\t')
    if len(p) < 3: continue
    try: votos = int(p[2])
    except ValueError: continue
    if votos <= 0: continue
    f, t = ref(p[0]), ref(p[1])
    if not f or not t: continue
    tmp.setdefault(f'{f[0]}.{f[1]}.{f[2]}', []).append((votos, '|'.join(map(str, t))))
mapa = {k: [x[1] for x in sorted(v, key=lambda x: -x[0])[:MAX]] for k, v in tmp.items()}
salida = pathlib.Path(__file__).resolve().parents[1] / 'biblia-app' / 'js' / 'referencias.js'
salida.write_text('/* Referencias marginales: OpenBible.info, licencia CC BY (https://www.openbible.info/labs/cross-references/) */\n'
                  'window.XREF_DATA=' + json.dumps(mapa, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf8')
print(len(mapa), 'versículos con referencias;', round(salida.stat().st_size / 1e6, 2), 'MB')
