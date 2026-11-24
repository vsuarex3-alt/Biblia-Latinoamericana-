/* ===== Service worker: guarda la app en el teléfono para usarla sin internet =====
   Cuando cambies cualquier archivo (por ejemplo el texto), sube el número de VERSION
   para que los teléfonos descarguen la versión nueva. */
var VERSION = 'biblia-v14';

var ARCHIVOS = [
  './',
  'index.html',
  'manifest.json',
  'css/estilos.css',
  'js/datos-biblia.js',
  'js/libros.js',
  'js/app.js',
  'js/pwa.js',
  'js/referencias.js',
  'js/vendor/jszip.min.js',
  'fuentes/cormorant-latin-500-normal.woff2',
  'fuentes/cormorant-latin-500-italic.woff2',
  'fuentes/cormorant-latin-600-normal.woff2',
  'fuentes/cormorant-latin-700-normal.woff2',
  'fuentes/literata-latin-400-normal.woff2',
  'fuentes/literata-latin-400-italic.woff2',
  'fuentes/literata-latin-500-normal.woff2',
  'fuentes/figtree-latin-400-normal.woff2',
  'fuentes/figtree-latin-500-normal.woff2',
  'fuentes/figtree-latin-600-normal.woff2',
  'fuentes/figtree-latin-700-normal.woff2',
  'iconos/icon-192.png',
  'iconos/icon-512.png',
  'iconos/apple-touch-icon.png',
  'iconos/favicon-32.png'
];

// 1) Al instalar: descarga y guarda todos los archivos
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION)
      .then(function (cache) { return cache.addAll(ARCHIVOS.map(function (u) { return new Request(u, { cache: 'reload' }); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

// 2) Al activar: borra las copias de versiones anteriores
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (claves) {
      return Promise.all(claves.filter(function (k) { return k !== VERSION; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// 3) Al pedir un archivo: con internet, primero la versión más nueva (así las correcciones
//    aparecen de inmediato); sin internet o si la red tarda, la copia guardada en el teléfono.
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.open(VERSION).then(function (cache) {
      var deRed = fetch(req, { cache: 'no-cache' }).then(function (resp) {
        if (resp && resp.ok) cache.put(req, resp.clone());
        return resp;
      });
      var guardado = function () {
        return cache.match(req, { ignoreSearch: true }).then(function (r) {
          return r || (req.mode === 'navigate' ? cache.match('index.html') : undefined) || deRed;
        });
      };
      // si la red no responde en 4 segundos, se usa la copia guardada
      var espera = new Promise(function (ok) { setTimeout(ok, 4000); }).then(guardado);
      return Promise.race([deRed.catch(guardado), espera]);
    })
  );
});
