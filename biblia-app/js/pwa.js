/* Aviso de instalación y funcionamiento sin internet */
(function () {
  'use strict';
  var aviso = document.getElementById('instalar'), txt = document.getElementById('instalarTxt'), btn = document.getElementById('instalarBtn');
  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var ua = navigator.userAgent || '';
  var esIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var esAndroid = /android/i.test(ua);
  var instalada = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var evento = null;
  var COMPARTIR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Compartir"><path d="M12 15V3M7.5 7.5 12 3l4.5 4.5"/><path d="M6 11H5v10h14V11h-1"/></svg>';

  function mostrar(html, conBoton) {
    if (instalada || Date.now() < (+leer('blat-aviso') || 0)) return;
    txt.innerHTML = '<b>Instala la Biblia</b>' + html;
    btn.hidden = !conBoton;
    aviso.hidden = false;
  }
  document.getElementById('instalarCerrar').onclick = function () {
    aviso.hidden = true;
    guardar('blat-aviso', String(Date.now() + 14 * 864e5));   // no volver a mostrar en 14 días
  };
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); evento = e;
    mostrar('Ábrela como una app desde tu pantalla de inicio, también sin internet.', true);
  });
  btn.onclick = function () {
    if (!evento) return;
    evento.prompt();
    evento.userChoice.then(function () { aviso.hidden = true; evento = null; });
  };
  window.addEventListener('appinstalled', function () { aviso.hidden = true; });

  setTimeout(function () {
    if (!aviso.hidden || evento) return;
    if (esIOS) {
      var safari = /safari/i.test(ua) && !/crios|fxios|edgios|gsa/i.test(ua);
      mostrar(safari
        ? 'Toca ' + COMPARTIR + ' <strong>Compartir</strong> y luego <strong>«Agregar a inicio»</strong>.'
        : 'Abre este enlace en <strong>Safari</strong>, toca ' + COMPARTIR + ' <strong>Compartir</strong> y luego <strong>«Agregar a inicio»</strong>.', false);
    } else if (esAndroid) {
      mostrar('Abre el menú <strong>⋮</strong> del navegador y elige <strong>«Agregar a pantalla de inicio»</strong>.', false);
    }
  }, 3000);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (reg) { reg.update(); }).catch(function () {});
    });
    // Cuando llega una versión nueva de la app, recargar una sola vez para mostrarla
    var habiaControl = !!navigator.serviceWorker.controller, recargada = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!habiaControl || recargada) return;
      recargada = true; location.reload();
    });
  }
})();
