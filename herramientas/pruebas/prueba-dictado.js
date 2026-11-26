/* Prueba de la corrección de lo que oye el micrófono (lo que escribe Whisper → cita correcta).
   Los textos de entrada son salidas reales de Whisper al oír citas dichas por voces de prueba.
   Uso: (cd biblia-app && python3 -m http.server 8765) y luego node herramientas/pruebas/prueba-dictado.js */
const { chromium } = require('playwright');
const CASOS = [
  ['Juan 6, 8, Alcatorse', 'Juan 6,8-14'], ['Juan VI, 8 al 14', 'Juan 6,8-14'], ['Exodo 20, 1 al 17.', 'Éxodo 20,1-17'],
  ['Primera de Juan, 4, 8.', '1 Juan 4,8'], ['Proverbios 3, 5.', 'Proverbios 3,5'], ['Pobernios, 3, 5,', 'Proverbios 3,5'],
  ['Sabiduría, 7, 7,', 'Sabiduría 7,7'], ['Macos 10, 45.', 'Marcos 10,45'], ['Deuteronomio 6, 4.', 'Deuteronomio 6,4'],
  ['Calata 5-22', 'Gálatas 5,22'], ['Galatas 5, 22.', 'Gálatas 5,22'], ['Lamentaciones 3, 22.', 'Lamentaciones 3,22'],
  ['Esequiel, 36, 26.', 'Ezequiel 36,26'], ['Sofonías 3, 17.', 'Sofonías 3,17'], ['Romanos 12, 1', 'Romanos 12,1'],
  ['Cuantres, 16.', 'Juan 3,16'], ['Queremina 1-5,', 'Jeremías 1,5'], ['Jeremías, 1, 5,', 'Jeremías 1,5'], ['Isaías 9, 5.', 'Isaías 9,5'],
  ['Filipenses 2, 5 de 11.', 'Filipenses 2,5-11'], ['Hénesis uno, uno.', 'Génesis 1,1'], ['Pomanos 8, 28', 'Romanos 8,28'],
  ['y saí las 40, 31.', 'Isaías 40,31'], ['Felipe Nces 4-13', 'Filipenses 4,13'], ['Kereminas 29, 11', 'Jeremías 29,11'],
  ['Eclesiaste 3,1.', 'Eclesiastés 3,1'], ['Eclesiastés 3,1.', 'Eclesiastés 3,1'], ['Eclesiástico 2-1', 'Sirácides 2,1'],
  ['Sebunda de Timoteo 4-7.', '2 Timoteo 4,7'], ['2 de timoteo 4-7', '2 Timoteo 4,7'], ['Segunda de Timoteo 4,7.', '2 Timoteo 4,7'],
  ['Mateo 5, del 3 al 12.', 'Mateo 5,3-12'], ['Salmo 23.', 'Salmos 23'], ['Lucas 15', 'Lucas 15'], ['Apocalipsis 21-4', 'Apocalipsis 21,4'],
  ['Hechos 2, 1 al 4.', 'Hechos de los apóstoles 2,1-4'], ['Primera de corintios 13, 4 al 7.', '1 Corintios 13,4-7'],
  ['Habacuq, 2, 4', 'Habacuq 2,4'], ['Tobías 12, 8.', 'Tobías 12,8'], ['Hebreos 11, 1', 'Hebreos 11,1'], ['Santiago 2, 17', 'Santiago 2,17'], ['Habacuq, 24', 'Habacuq 2,4'], ['Filipenses 2, 5, Valonce', 'Filipenses 2,5-11'], ['Juan 3, 16', 'Juan 3,16'], ['Salmo 23', 'Salmos 23'], ['Juan 21', 'Juan 21'], ['Hava Cup2x4.', 'Habacuq 2,4'], ['Filipenses dos, 5/11.', 'Filipenses 2,5-11'], ['Que demina su no 5.', 'Jeremías 1,5'], ['Calata, 5/22', 'Gálatas 5,22'], ['Ebleo, sonse, uno.', 'Hebreos 11,1'], ['Job 38, 4', 'Job 38,4'], ['Joel 2, 28', 'Joel 2,28'], ['Rut 1, 16', 'Rut 1,16'], ['Tito 2, 11', 'Tito 2,11'], ['Amós 5, 24', 'Amós 5,24'], ['Jonás 2, 1', 'Jonás 2,1'], ['Judas 1, 3', 'Judas 1,3'], ['Judit 9, 11', 'Judit 9,11'], ['Marcos 16, 15', 'Marcos 16,15'], ['Lucas 1, 46 al 55', 'Lucas 1,46-55'], ['Ester 4, 14', 'Ester 4,14'], ['Oseas 11, 1', 'Oseas 11,1'], ['Miqueas 6, 8', 'Miqueas 6,8'], ['Nahúm 1, 7', 'Nahúm 1,7'], ['Daniel 3, 25', 'Daniel 3,25'], ['Baruc 3, 9', 'Baruc 3,9'], ['Efesios 2, 8', 'Efesios 2,8'], ['Colosenses 3, 12', 'Colosenses 3,12'], ['Primera de Tesalonicenses 5, 16', '1 Tesalonicenses 5,16'], ['Segunda de Pedro 3, 9', '2 Pedro 3,9'], ['Primera de Pedro 2, 9', '1 Pedro 2,9'], ['Tercera de Juan 1, 2', '3 Juan 1,2'], ['Filemón 1, 6', 'Filemón 1,6'], ['Segunda de Reyes 2, 11', '2 Reyes 2,11'], ['Primera de Samuel 3, 10', '1 Samuel 3,10'], ['Números 6, 24', 'Números 6,24'], ['Levítico 19, 18', 'Levítico 19,18'], ['Josué 1, 9', 'Josué 1,9'], ['Jueces 6, 12', 'Jueces 6,12'], ['Esdras 3, 11', 'Esdras 3,11'], ['Nehemías 8, 10', 'Nehemías 8,10'], ['Primera de Macabeos 2, 1', '1 Macabeos 2,1'], ['Ageo 2, 9', 'Ageo 2,9'], ['Zacarías 9, 9', 'Zacarías 9,9'], ['Malaquías 3, 10', 'Malaquías 3,10'], ['Abdías 1, 15', 'Abdías 1,15'], ['Cantar 2, 10', 'Cantar 2,10'], ['Cantar de los cantares 8, 6', 'Cantar 8,6'],
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://localhost:8765/'); await p.waitForFunction('window.__corregirDictado');
  let mal = 0;
  for (const [oido, esperado] of CASOS) {
    const r = await p.evaluate(async t => {
      const c = window.__corregirDictado(t);
      const q = document.querySelector('#q'); q.value = c;
      document.querySelector('form.search, #searchForm, form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      await new Promise(ok => setTimeout(ok, 120));
      const h = document.querySelector('#main .rhead h2, #main h2'); return { c, titulo: h ? h.textContent.trim() : '' };
    }, oido);
    const ok = r.titulo.replace(/\s/g, '') === esperado.replace(/\s/g, '');
    if (!ok) mal++;
    console.log((ok ? 'BIEN ' : 'MAL  ') + `«${oido}» → «${r.c}» → ${r.titulo}` + (ok ? '' : `   (esperaba ${esperado})`));
  }
  console.log(`\n${CASOS.length - mal} de ${CASOS.length} bien`);
  await b.close();
})();
