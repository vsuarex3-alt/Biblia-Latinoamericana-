#!/usr/bin/env python3
"""Lee en la portada de misal.mx SOLO las citas de las lecturas del día (por ejemplo «Lucas 21, 12-19»)
y las guarda en biblia-app/evangelio.json. No copia ningún texto de las lecturas: la app muestra el
Evangelio con el texto de la Biblia Latinoamericana que ya trae dentro.
Uso: python3 herramientas/evangelio/obtener.py [archivo.html]   (sin archivo, descarga https://misal.mx/)"""
import html, json, re, sys, pathlib, datetime, urllib.request

RAIZ = pathlib.Path(__file__).resolve().parents[2]
SALIDA = RAIZ / 'biblia-app' / 'evangelio.json'

def texto_de(pagina):
    t = re.sub(r'<script.*?</script>|<style.*?</style>', '', pagina, flags=re.S)
    t = html.unescape(re.sub(r'<[^>]+>', '\n', t))
    return [l.strip() for l in t.split('\n') if l.strip()]

LIBROS = ['Génesis','Éxodo','Levítico','Números','Deuteronomio','Josué','Jueces','Rut','Samuel','Reyes','Crónicas','Esdras',
  'Nehemías','Tobías','Judit','Ester','Macabeos','Job','Salmos','Proverbios','Eclesiastés','Cantar de los Cantares','Sabiduría',
  'Eclesiástico','Sirácide','Isaías','Jeremías','Lamentaciones','Baruc','Ezequiel','Daniel','Oseas','Joel','Amós','Abdías','Jonás',
  'Miqueas','Nahúm','Habacuc','Sofonías','Ageo','Zacarías','Malaquías','Mateo','Marcos','Lucas','Juan','Hechos de los Apóstoles',
  'Romanos','Corintios','Gálatas','Efesios','Filipenses','Colosenses','Tesalonicenses','Timoteo','Tito','Filemón','Hebreos',
  'Santiago','Pedro','Judas','Apocalipsis']
CON_NUMERO = {'Samuel','Reyes','Crónicas','Macabeos','Corintios','Tesalonicenses','Timoteo','Pedro','Juan'}
ORD = {'primera': '1', 'primer': '1', 'segunda': '2', 'segundo': '2', 'tercera': '3'}
sin = lambda x: re.sub(r'[\u0300-\u036f]', '', __import__('unicodedata').normalize('NFD', x)).lower()

def cita(linea):
    """«Del santo Evangelio según san Lucas: 21, 12-19» → «Lucas 21, 12-19»;
       «De la primera carta del apóstol san Pablo a los corintios: 13, 4-13» → «1 Corintios 13, 4-13»"""
    if ':' not in linea: return None
    antes, despues = linea.rsplit(':', 1)
    nums = despues.strip().rstrip('.')
    if not re.match(r'^\d', nums): return None
    a = sin(antes)
    hallados = [b for b in LIBROS if re.search(r'\b' + sin(b) + r'\b', a)]
    if not hallados: return None
    if len(hallados) > 1 and 'Juan' in hallados: hallados.remove('Juan')   # «Apocalipsis del apóstol san Juan»
    libro = max(hallados, key=len)
    if libro in CON_NUMERO and (libro != 'Juan' or 'carta' in a):
        m = re.search(r'\b(primera|primer|segunda|segundo|tercera)\b', a)
        if m: libro = ORD[m.group(1)] + ' ' + libro
    return f'{libro} {nums}'

def para_app(c):
    """«Mateo 9, 35–10, 1. 5-8» → «Mateo 9,35-10,1; Mateo 10,5-8»;
       «Apocalipsis 18,1-2. 21-23; 19,1-3. 9a» → «Apocalipsis 18,1-2; Apocalipsis 18,21-23; Apocalipsis 19,1-3; Apocalipsis 19,9»"""
    c = c.replace('\u03af', 'í').replace('\u03ad', 'é').replace('\u03cc', 'ó')   # letras griegas que a veces vienen en vez de acentos
    m = re.match(r'^(.*?\D)\s(\d.*)$', c)
    if not m: return c
    libro, nums = m.group(1).strip(), re.sub(r'(\d)[a-d]\b', r'\1', m.group(2)).replace('–', '-').replace('—', '-')
    partes, cap = [], None
    for seg in [x.strip() for x in re.split(r'\.\s*|;\s*', nums) if x.strip()]:
        seg = re.sub(r'\s+', '', seg)
        x = re.fullmatch(r'(\d+),(\d+)-(\d+),(\d+)', seg)          # 9,35-10,1
        if x: partes.append(f'{x[1]},{x[2]}-{x[3]},{x[4]}'); cap = x[3]; continue
        x = re.fullmatch(r'(\d+)-(\d+),(\d+)', seg)                 # 11-21,2 (del versículo 11 al capítulo 21, versículo 2)
        if x and cap: partes.append(f'{cap},{x[1]}-{x[2]},{x[3]}'); cap = x[2]; continue
        x = re.fullmatch(r'(\d+),(\d+(?:-\d+)?)', seg)               # 21,12-19
        if x: cap = x[1]; partes.append(f'{cap},{x[2]}'); continue
        x = re.fullmatch(r'\d+(?:-\d+)?', seg)                       # 17-18 (mismo capítulo)
        if x and cap: partes.append(f'{cap},{seg}'); continue
        if x: partes.append(seg); continue                               # «Salmo 97» o un capítulo entero
        return c
    return '; '.join(f'{libro} {p}' for p in partes)

def salmo_hebreo(n):
    """El leccionario numera los salmos como la Biblia griega; la Biblia Latinoamericana, como la hebrea."""
    if n <= 8 or n >= 148: return n
    if n == 9: return 9
    if n <= 112: return n + 1
    if n == 113: return 114
    if n in (114, 115): return 116
    if n <= 145: return n + 1
    return 147

def leer(pagina):
    L = texto_de(pagina)
    fecha = None
    for i, l in enumerate(L):
        if re.fullmatch(r'\d{2}/\d{2}/\d{4}', l):
            d, m, a = l.split('/'); fecha = f'{a}-{m}-{d}'; break
    out = {}
    secciones = {'PRIMERA LECTURA': 'primera', 'SALMO': 'salmo', 'SEGUNDA LECTURA': 'segunda', 'EVANGELIO': 'evangelio'}
    actual = None
    for l in L:
        u = l.upper().strip(' .:')
        if u in secciones: actual = secciones[u]; continue
        if actual and actual not in out:
            if actual == 'salmo':
                m = re.match(r'Del\s+salmo\s+(\d+)', l, flags=re.I)
                if m: out['salmo'] = f'Salmo {m.group(1)}'
                continue
            c = cita(l) if ':' in l else None
            if c: out[actual] = c; out[actual + '_linea'] = l
    santos = next((L[i + 1].lstrip(': ').strip() for i, l in enumerate(L) if l == 'Santos' and i + 1 < len(L)), '')
    return fecha, out, santos

UA = {'User-Agent': 'Mozilla/5.0 (Biblia Latinoamericana app; lectura diaria de la cita del Evangelio)'}
def bajar(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read().decode('utf8', 'ignore')

def hoy_mexico(mas=0):
    from zoneinfo import ZoneInfo
    return (datetime.datetime.now(ZoneInfo('America/Mexico_City')) + datetime.timedelta(days=mas)).strftime('%Y-%m-%d')

ES_CITA = re.compile(r'^((?:[1-3]\s)?[^\d,:]{3,40}?)\s(\d+\s*,\s*\d.*)$')
def leer_vaticano(pagina):
    """Respaldo cuando misal.mx no ha publicado el día: Vatican News (Santa Sede) usa el Leccionario de la
       Conferencia del Episcopado Mexicano. Solo se toman las citas."""
    L = texto_de(pagina); out = {}
    def siguiente_cita(i, hasta=6):
        for l in L[i + 1:i + 1 + hasta]:
            if len(l) < 90 and ES_CITA.match(l): return l.rstrip('.')
        return None
    for i, l in enumerate(L):
        if l == 'Lectura del Día' and 'primera' not in out:
            c = siguiente_cita(i); out['primera'] = c if c else None
        elif l == 'Segunda lectura' and 'segunda' not in out:
            c = siguiente_cita(i, 2); out['segunda'] = c
        elif l == 'Evangelio del Día' and 'evangelio' not in out:
            out['evangelio'] = siguiente_cita(i)
    return {k: v for k, v in out.items() if v}

def armar(lect, santos=''):
    dia = {}
    for k in ('evangelio', 'primera', 'segunda'):
        if k in lect: dia[k] = {'cita': lect[k].replace('\u03af', 'í'), 'app': para_app(lect[k])}
    if 'salmo' in lect:
        n = int(lect['salmo'].split()[-1]); h = salmo_hebreo(n)
        dia['salmo'] = {'cita': lect['salmo'], 'app': f'Salmos {h}', 'ver': f'Salmo {h}' + (f' ({n})' if h != n else '')}
    if santos: dia['santos'] = santos
    return dia

def main():
    datos = json.loads(SALIDA.read_text(encoding='utf8')) if SALIDA.exists() else {'fuente': 'misal.mx', 'dias': {}}
    antes = json.dumps(datos, sort_keys=True)
    # 1) misal.mx (fuente principal: calendario litúrgico de México)
    try:
        pagina = pathlib.Path(sys.argv[1]).read_text(encoding='utf8', errors='ignore') if len(sys.argv) > 1 else bajar('https://misal.mx/')
        fecha, lect, santos = leer(pagina)
        if fecha and 'evangelio' in lect:
            dia = armar(lect, santos); dia['fuente'] = 'misal.mx'
            datos['dias'][fecha] = dia
            print('misal.mx:', fecha, dia['evangelio']['cita'])
        else:
            print('misal.mx: no se encontró el Evangelio en la página')
    except Exception as e:
        print('misal.mx no respondió:', e)
    # 2) Si misal.mx todavía no publica hoy (o mañana), se usa Vatican News; misal.mx lo reemplaza cuando publique
    if len(sys.argv) == 1:
        for f in (hoy_mexico(), hoy_mexico(1)):
            if datos['dias'].get(f, {}).get('fuente') == 'misal.mx': continue
            try:
                lect = leer_vaticano(bajar('https://www.vaticannews.va/es/evangelio-de-hoy/' + f.replace('-', '/') + '.html'))
            except Exception as e:
                print('Vatican News no respondió para', f, e); continue
            if 'evangelio' not in lect: print('Vatican News: aún no está', f); continue
            dia = armar(lect); dia['fuente'] = 'vaticannews.va'
            datos['dias'][f] = dia
            print('Vatican News:', f, dia['evangelio']['cita'])
    datos['dias'] = dict(sorted(datos['dias'].items())[-40:])   # solo los últimos 40 días
    if json.dumps(datos, sort_keys=True) == antes:
        print('Sin cambios'); return 0
    SALIDA.write_text(json.dumps(datos, ensure_ascii=False, indent=1) + '\n', encoding='utf8')
    print('Guardado')
    return 0

if __name__ == '__main__':
    sys.exit(main())
