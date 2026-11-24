/* ===== Service worker: guarda la app en el teléfono para usarla sin internet =====
   Cuando cambies cualquier archivo (por ejemplo el texto), sube el número de VERSION
   para que los teléfonos descarguen la versión nueva. */
var VERSION = 'biblia-v12';

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
      .then(function (cache) { return cache.addAll(ARCHIVOS); })
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

// 3) Al pedir un archivo: lo entrega desde el teléfono al instante y,
//    si hay internet, actualiza la copia en segundo plano.
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.open(VERSION).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (guardado) {
        var deRed = fetch(req).then(function (resp) {
          if (resp && resp.ok) cache.put(req, resp.clone());
          return resp;
        }).catch(function () {
          // Sin internet y sin copia: si es una página, muestra la app
          if (req.mode === 'navigate') return cache.match('index.html');
        });
        if (guardado) { e.waitUntil(deRed); return guardado; }
        return deRed;
      });
    })
  );
});
