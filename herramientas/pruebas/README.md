# Pruebas de la app

Se ejecutan con la app servida en `http://localhost:8765/` (desde `biblia-app/`: `python3 -m http.server 8765`)
y Playwright instalado.

- `node prueba-citas.js` — más de 260 formas de citar (abreviaturas, sin acentos, «3,16», «3:16», «3 16»,
  rangos, «Primera de Corintios», «San Juan», citas dictadas, libros de un capítulo, «Sal 23 (22)»…).
- `node prueba-libros.js` — cada libro por su nombre y por todas sus abreviaturas.
- `node prueba-historial.js` — historial por grupos: las citas van al grupo activo, sin mezclarse,
  aunque cambie el día o se cierre la app.
- `node prueba-capitulos.js` — los 1334 capítulos, las referencias marginales y la navegación.

Deben terminar con «fallos: 0» (en `prueba-capitulos.js`, la única excepción conocida es Sal 148,10,
que en esta edición no tiene ese número y la app lo explica).
