# Revisión de integridad del texto bíblico

Revisión hecha sobre `La-Biblia-Latinoamericana.pdf` (1715 páginas). La app tiene **73 libros y 35.394 versículos**.

## 1. ¿Falta texto del PDF en la app? — No

Se comparó **cada línea de cada página** del PDF con el texto de la app (`cobertura.js`).
Todas las líneas del texto bíblico están en la app. Las únicas líneas que no están son
títulos de sección, introducciones y comentarios de la edición (por ejemplo, los
comentarios de los Salmos con «.—»), que no son versículos.

### Errores que se encontraron y se corrigieron en esta revisión

El analizador original (el mismo de tu buscador) perdía texto en estos casos; ya está corregido:

- **Líneas de pasajes en negrita** que se tomaban por títulos: se perdía la última línea de
  muchos párrafos (p. ej. 1 Reyes 2:20 «…pequeña cosa, óyeme…», Isaías 9:5 «…príncipe de la Paz»).
- **Última línea de cada libro** (p. ej. Juan 21:25, Hechos 28:31, Malaquías 3:24, 2 Macabeos 15:39).
- **Versículos impresos fuera de orden** (Job 24 y 26, Ester 15, Levítico 24:17-23, Jueces 4:11, Zacarías 4:11-14…).
- **Erratas de número al inicio de capítulo** en el PDF: Génesis 8 («24» = Génesis 7:24),
  Amós 2 («15» = 2:1), Rut 2, Ester 13, Salmo 25, Hechos 22, final de los Salmos 115 y 116.
- **Versículos combinados** como Levítico 4:11-12, que ahora se muestran juntos.
- **2 Timoteo** estaba anotado con 3 capítulos (tiene 4).

### Palabras partidas por el PDF — corregidas

El PDF trae un espacio dentro de algunas palabras («Is rael», «es pada», «to ma ron»). Se corrigieron
en dos pasos, sin cambiar ninguna letra (solo se quitó el espacio):

1. **Automático (393 casos, `palabras-unidas.txt`):** un pedazo solo se une si no aparece suelto en
   ninguna otra parte de la Biblia.
2. **Revisión manual (124 palabras, 166 apariciones, `correcciones-manuales.json`):** casos en dos
   o tres pedazos, revisados uno por uno en contexto con ayuda de un diccionario de español.
   Por ejemplo, «to ma ron» → «tomaron», «hijo de Ja zaías» → «Jazaías», «el evan gelista» → «evangelista»,
   «Us te des» → «Ustedes», «ex pulso» → «expulso».

No se tocaron frases que ya eran correctas: «porque usted es amigo suyo», «yo sucedí a mi padre»,
«la menta, el anís y el comino», «Labra dos tablas», «Mira de Licia».

## 2. ¿Faltan versículos frente a una Biblia católica estándar?

Se comparó con la versificación católica estándar (New American Bible, la que siguen las
Biblias católicas en español). Esto es lo que **no tiene número propio** en la app, y por qué:

### a) Capítulos que no estaban en el PDF — YA AGREGADOS

- Zacarías 6:1-15
- 2 Timoteo 4:1-22

El PDF salta de Zacarías 5:11 (p. 915) a Zacarías 7 (p. 916), y de 2 Timoteo 3:17 (p. 1637)
a la introducción de Tito (p. 1638). Estos 37 versículos se copiaron de la versión
**Latinoamericana 1995 de bibliatodo.com** y están en `versiculos-agregados.json`.
En la app se muestran igual que el resto del texto.
Notas sobre la copia: en 2 Timoteo 4:3 se quitó una comilla suelta que traía la página al final
(«atención;'»); en Zacarías 6 las comillas ' de la página se cambiaron por « » como en el resto
de la Biblia. En 4:13, «libros» venía como enlace de la página; se dejó solo la palabra.

### b) Títulos de los Salmos (64 versículos) — no es un faltante

En muchos Salmos la Biblia católica cuenta el título («Salmo de David…») como versículo 1.
Esta edición no imprime esos títulos: los cambia por un comentario, y el salmo empieza
en el versículo 2. Afecta a 64 salmos.

### c) Numeración distinta (18 versículos) — el texto está, con otro número

- 1 Reyes 5:19-32
- 1 Crónicas 25:31
- Sirácides (Eclesiástico) 25:12
- Salmos 1:6
- Salmos 3:1

Por ejemplo, lo que la referencia llama 1 Reyes 5:19-32, esta edición lo numera 1 Reyes 4:21-34.

### d) Número impreso a mitad de frase dentro de otro versículo (9 versículos) — el texto está

- 1 Reyes 11:3
- Jeremías 10:9
- Jeremías 27:19, 20
- Job 20:10
- Sirácides (Eclesiástico) 17:10
- Salmos 144:11
- Mateo 21:44
- 1 Timoteo 5:24

El PDF pone el número a mitad de frase (p. ej. «…de otro; 24 consérvate sin mancha…»), y así se muestra.

### e) Números que el PDF no imprime en ese capítulo (109 versículos) — hay que revisar con la Biblia impresa

- Génesis 9:29
- Levítico 24:13-16
- Números 25:19
- 1 Reyes 11:39
- 1 Crónicas 5:41
- 2 Crónicas 31:21
- 1 Macabeos 3:60
- 2 Macabeos 12:46
- Isaías 3:26
- Isaías 16:14
- Isaías 37:38
- Jeremías 12:6
- Jeremías 41:18
- Jeremías 51:53
- Ezequiel 10:14, 15
- Ezequiel 16:22
- Oseas 4:19
- Joel 4:21
- Zacarías 3:9
- Zacarías 7:8
- Job 13:28
- Job 14:13, 14
- Job 31:40
- Job 42:4
- Ester 5:1, 2
- Ester 8:13-17
- Ester 15:1, 2, 3
- Tobías 6:1
- Tobías 12:22
- Sirácides (Eclesiástico) 1:5, 7, 21
- Sirácides (Eclesiástico) 3:19, 25
- Sirácides (Eclesiástico) 11:15, 16
- Sirácides (Eclesiástico) 13:14
- Sirácides (Eclesiástico) 16:15, 16
- Sirácides (Eclesiástico) 17:5, 9, 16, 18, 21
- Sirácides (Eclesiástico) 18:3
- Sirácides (Eclesiástico) 19:18, 19, 21
- Sirácides (Eclesiástico) 22:7, 8
- Sirácides (Eclesiástico) 24:18, 24
- Sirácides (Eclesiástico) 26:19-27
- Sirácides (Eclesiástico) 34:27-31
- Sirácides (Eclesiástico) 35:25, 26
- Sirácides (Eclesiástico) 36:28-31
- Sirácides (Eclesiástico) 43:4
- Sirácides (Eclesiástico) 50:29
- Salmos 48:6
- Salmos 51:2
- Salmos 52:2
- Salmos 54:2
- Salmos 60:2
- Salmos 62:13
- Salmos 65:4
- Salmos 71:20
- Salmos 74:4
- Salmos 92:16
- Salmos 98:9
- Salmos 113:6
- Salmos 114:8
- Salmos 115:6
- Salmos 118:9
- Salmos 128:6
- Salmos 145:21
- Salmos 148:10
- Lucas 23:17
- Hechos 10:49
- Efesios 1:8, 9
- 1 Timoteo 2:11

En estos casos el PDF **no trae ningún versículo con ese número en ese capítulo**, y la prueba de
cobertura confirma que no hay texto del PDF sin incluir. Las causas posibles son:
- La edición omite el versículo, como muchas Biblias modernas en Mateo 21:44 y Lucas 23:17.
- La edición lo junta con otro o lo mueve a otro lugar, como hace a menudo en Sirácides, Job y Jeremías.
- El versículo falta en el PDF por un error al crearlo, como pasa con Zacarías 6 y 2 Timoteo 4.

Para saber cuál es cada caso hay que compararlo con la Biblia impresa.

## Cómo agregar a mano un versículo que falte

Si tienes la Biblia impresa, escribe el texto en `herramientas/versiculos-agregados.json`
(ya trae los espacios de Zacarías 6 y 2 Timoteo 4) y vuelve a ejecutar
`node convertir.js "ruta/al/PDF.pdf"`. Los versículos agregados a mano llevan una marca
discreta en la app.

## Herramientas

- `convertir.js`: genera el texto de la app desde el PDF.
- `analizar.js`: compara contra la referencia y busca cada número en el PDF.
- `cobertura.js`: comprueba línea por línea que todo el PDF está en la app.
- `clasificar.js`: genera la lista de esta revisión (`faltantes.json`).
