/* Trabajo pesado del dictado en un hilo aparte (Web Worker), para que la grabación no se corte. */
import { AutoProcessor, AutoTokenizer, WhisperForConditionalGeneration, env } from './transformers.min.js';

const BASE = new URL('./', self.location.href).href;
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = BASE;
env.useBrowserCache = false;          // el service worker ya guarda estos archivos
env.backends.onnx.wasm.wasmPaths = BASE;
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.proxy = false;

const MODELO = 'modelo';
const PISTA = 'Citas de la Biblia: Génesis, Éxodo, Levítico, Números, Deuteronomio, Josué, Jueces, Rut, Samuel, Reyes, Crónicas, Esdras, Nehemías, Tobías, Judit, Ester, Macabeos, Job, Salmo, Proverbios, Eclesiastés, Cantar, Sabiduría, Eclesiástico, Isaías, Jeremías, Lamentaciones, Baruc, Ezequiel, Daniel, Oseas, Joel, Amós, Abdías, Jonás, Miqueas, Nahúm, Habacuq, Sofonías, Ageo, Zacarías, Malaquías, Mateo, Marcos, Lucas, Juan, Hechos, Romanos, Primera de Corintios, Gálatas, Efesios, Filipenses, Colosenses, Tesalonicenses, Segunda de Timoteo, Tito, Filemón, Hebreos, Santiago, Pedro, Judas, Apocalipsis.';

let listo = null;
function preparar(alAvanzar) {
  if (listo) return listo;
  const vistos = {};
  const progreso = p => {
    if (!alAvanzar || p.status !== 'progress' || !p.total) return;
    vistos[p.file] = [p.loaded, p.total];
    let a = 0, t = 0; for (const k in vistos) { a += vistos[k][0]; t += vistos[k][1]; }
    alAvanzar(a, t);
  };
  listo = (async () => {
    const [proc, tok, model] = await Promise.all([
      AutoProcessor.from_pretrained(MODELO),
      AutoTokenizer.from_pretrained(MODELO),
      WhisperForConditionalGeneration.from_pretrained(MODELO, {
        dtype: { encoder_model: 'fp16', decoder_model_merged: 'q8' }, device: 'wasm', progress_callback: progreso })
    ]);
    const id = s => tok.model.tokens_to_ids.get(s);
    const inicio = [id('<|startofprev|>'), ...tok.encode(' ' + PISTA, { add_special_tokens: false }),
      id('<|startoftranscript|>'), id('<|es|>'), id('<|transcribe|>'), id('<|notimestamps|>')];
    return { proc, tok, model, inicio };
  })();
  listo.catch(() => { listo = null; });
  return listo;
}

/* audio: Float32Array mono a 16 000 Hz */
async function transcribir(audio) {
  const { proc, tok, model, inicio } = await preparar();
  const entrada = await proc(audio);
  const ids = await model.generate({ ...entrada, decoder_input_ids: [inicio.map(BigInt)], max_new_tokens: 40 });
  const todos = Array.from(ids.tolist()[0]).map(Number).slice(inicio.length);
  return tok.decode(todos, { skip_special_tokens: true }).trim();
}

self.onmessage = async e => {
  const { tipo, id, audio } = e.data;
  try {
    if (tipo === 'preparar') { await preparar((a, t) => self.postMessage({ tipo: 'avance', a, t })); self.postMessage({ tipo: 'listo', id }); }
    else if (tipo === 'transcribir') { const texto = await transcribir(audio); self.postMessage({ tipo: 'texto', id, texto }); }
  } catch (err) { self.postMessage({ tipo: 'error', id, msg: String(err && err.message || err) }); }
};
