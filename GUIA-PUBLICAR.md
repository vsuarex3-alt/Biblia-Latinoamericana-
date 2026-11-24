# Cómo publicar la Biblia Latinoamericana y compartir el enlace

## Forma actual: GitHub Pages (automática, gratis y sin anuncios)

- **Enlace de la app:** https://vsuarex3-alt.github.io/Biblia-Latinoamericana-/
- Cada cambio que se guarda en la rama `main` de este repositorio se publica **solo**, en
  1 o 2 minutos (pestaña **Actions** → «Publicar en GitHub Pages»).
- Los teléfonos con la app instalada reciben la versión nueva la próxima vez que la abren
  con internet (a veces hay que abrirla dos veces).
- Instalar en iPhone: abrir el enlace en **Safari** → Compartir → «Agregar a inicio».
  En Android: **Chrome** → «Instalar» o menú ⋮ → «Agregar a pantalla de inicio».

Lo que sigue explica otras formas de publicar (Netlify, Cloudflare), que ya no hacen falta.

---


Todo lo que se publica está en la carpeta **`biblia-app`**:

```
biblia-app/
├── index.html          ← la página principal
├── manifest.json       ← nombre, ícono y colores de la app instalada
├── sw.js               ← hace que funcione sin internet
├── css/estilos.css     ← diseño verde de tu buscador, modo oscuro
├── fuentes/            ← letras Cormorant, Literata y Figtree (para usar sin internet)
├── js/app.js           ← buscador, lectura, historial (de tu buscador)
├── js/libros.js        ← libros, abreviaturas y citas habladas
├── js/pwa.js           ← aviso de instalación y modo sin internet
├── js/datos-biblia.js  ← EL TEXTO BÍBLICO
├── iconos/             ← íconos de la app (192, 512 y 180 para iPhone)
├── _headers            ← ajuste para Netlify
└── robots.txt          ← pide a Google que no la muestre en búsquedas
```

> **Importante:** para que la app se pueda instalar y funcione sin internet tiene que
> abrirse desde un enlace **https://** (Netlify y GitHub Pages lo dan gratis).
> Si abres `index.html` con doble clic en tu computadora se ve, pero no se instala.

---

## Opción A — Netlify (la más fácil, unos 5 minutos)

1. **Descarga la carpeta `biblia-app`** a tu computadora.
   (En GitHub: botón verde **Code → Download ZIP**, y descomprime el archivo.)
2. Entra a **https://app.netlify.com/signup** y crea una cuenta gratis
   (puedes entrar con tu correo o con tu cuenta de GitHub).
3. Ya dentro, ve a **https://app.netlify.com/drop**.
4. **Arrastra la carpeta `biblia-app`** completa al recuadro que dice
   “Drag and drop your site output folder here”.
5. Espera unos segundos. Netlify te mostrará un enlace parecido a
   `https://nombre-raro-123.netlify.app`. ¡Ya está publicada!
6. **Ponle un nombre bonito:** entra a **Site configuration → Change site name**
   y escribe, por ejemplo, `biblia-familia`. Tu enlace quedará así:
   `https://biblia-familia.netlify.app`
7. **Comparte ese enlace** por WhatsApp con tu familia.

**Para actualizarla después** (por ejemplo si corriges algo): en tu sitio de Netlify
ve a **Deploys** y vuelve a arrastrar la carpeta `biblia-app`. Antes, abre `sw.js` y
cambia `biblia-v1` por `biblia-v2` (y así sucesivamente) para que los teléfonos
descarguen la versión nueva.

*Alternativa automática:* en Netlify elige **Add new site → Import an existing project →
GitHub**, selecciona este repositorio y listo: el archivo `netlify.toml` ya le dice que
publique la carpeta `biblia-app`, y cada cambio que subas a GitHub se publica solo.

---

## Opción B — GitHub Pages

El repositorio ya trae lo necesario (`.github/workflows/pages.yml`).

1. Une los cambios a la rama **main** (te puedo ayudar a crear el *pull request*).
2. En GitHub, abre el repositorio → **Settings** → **Pages**.
3. En **Build and deployment → Source** elige **GitHub Actions**.
4. Ve a la pestaña **Actions** y espera a que “Publicar en GitHub Pages” termine (✓ verde).
5. Tu enlace será: `https://TU-USUARIO.github.io/NOVIEMBRE/`

> GitHub Pages solo es gratis si el repositorio es **público**. Si tu repositorio es
> privado, usa Netlify (Opción A).

---

## Cómo la instala tu familia

**En Android (Chrome):**
1. Abrir el enlace.
2. Tocar **Instalar** en el aviso de abajo, o el menú **⋮** → **“Agregar a pantalla de inicio”** / **“Instalar app”**.

**En iPhone (tiene que ser Safari):**
1. Abrir el enlace en **Safari**.
2. Tocar el botón **Compartir** (el cuadrito con flecha hacia arriba).
3. Bajar y tocar **“Agregar a inicio”** → **Agregar**.

Después de abrirla **una vez con internet**, funciona completamente **sin conexión**.

---

## Una nota sobre el enlace

Cualquier persona que tenga el enlace podrá abrir la app. Le pedimos a los buscadores
que no la muestren (`robots.txt` y la etiqueta `noindex`), pero no es una contraseña.
La Biblia Latinoamericana tiene derechos de autor de su editorial, así que lo prudente
es compartir el enlace solo con tu familia.

---

## Sobre el texto

- El texto se sacó de `La-Biblia-Latinoamericana.pdf` sin editarlo a mano. Una revisión
  línea por línea confirma que **todo el texto bíblico del PDF está en la app**.
- Hay **73 libros y 35 394 versículos**.
- **Zacarías 6 y 2 Timoteo 4** no venían en el PDF. Se agregaron de la versión
  Latinoamericana 1995 de bibliatodo.com.
- La lista completa de versículos con numeración distinta o no impresos en el PDF está
  en **`herramientas/REVISION.md`**.
- Para volver a generar el texto desde el PDF:
  `cd herramientas && npm install && node convertir.js "ruta/al/PDF.pdf"`.
  Después sube el número de versión en `biblia-app/sw.js`.
- El diseño sale de tu «Buscador Biblia Latinoamérica»
  (`herramientas/diseno/construir.py`).
