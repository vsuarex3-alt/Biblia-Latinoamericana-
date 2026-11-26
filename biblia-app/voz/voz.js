/* ===== Dictado dentro del teléfono (sin enviar la voz a ningún servidor) =====
   Usa Whisper (modelo «base» de OpenAI, versión ONNX de onnx-community) con Transformers.js.
   Los archivos están en esta carpeta; se descargan una sola vez y quedan guardados para usarse sin internet.
   Se le da como pista la lista de libros de la Biblia para que los escriba bien. */
/* Este archivo solo habla con voz-worker.js, que hace el trabajo pesado en un hilo aparte. */
const hilo = new Worker(new URL('./voz-worker.js', import.meta.url), { type: 'module' });
let n = 0, alAvanzar = null, preparado = null;
const pendientes = {};
hilo.onmessage = e => {
  const m = e.data;
  if (m.tipo === 'avance') { if (alAvanzar) alAvanzar(m.a, m.t); return; }
  const p = pendientes[m.id]; if (!p) return; delete pendientes[m.id];
  if (m.tipo === 'error') p.no(new Error(m.msg)); else p.si(m.texto);
};
hilo.onerror = e => { for (const k in pendientes) { pendientes[k].no(new Error(e.message || 'error del reconocedor')); delete pendientes[k]; } preparado = null; };
function pedir(datos, transferir) { const id = ++n; return new Promise((si, no) => { pendientes[id] = { si, no }; hilo.postMessage({ ...datos, id }, transferir || []); }); }

export function preparar(avance) {
  if (avance) alAvanzar = avance;
  if (!preparado) { preparado = pedir({ tipo: 'preparar' }); preparado.catch(() => { preparado = null; }); }
  return preparado;
}
/* audio: Float32Array mono a 16 000 Hz */
export async function transcribir(audio) {
  await preparar();
  return pedir({ tipo: 'transcribir', audio }, [audio.buffer]);
}
