#!/usr/bin/env node
/**
 * Prueba de punta a punta contra un backend real (pensada para el de dev), sobre un bot
 * de pruebas propio: lo crea si no existe y nunca toca otros bots.
 *
 * Uso (después de npm run build):  node scripts/e2e-dev.mjs
 * Conexión: TREEFLOW_URL, TREEFLOW_API_KEY y TREEFLOW_WORKSPACE_ID (o .env).
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import './sin-fugas.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);
const dist = (p) => import(pathToFileURL(path.join(ROOT, 'dist', p)).href);
const { TreeflowClient } = await dist('client/treeflowClient.js');
const { buildTools } = await dist('catalog.js');
const { shortenText, lookupShort } = await dist('ids.js');
// Lo leído directo del cliente lleva UUID completos; lo que devuelven las herramientas, cortos.
const comoHerramienta = (v) => JSON.parse(shortenText(JSON.stringify(v)));

const BOT = 'MCP pruebas (Claude)';
const client = new TreeflowClient();
const tools = Object.fromEntries(buildTools(client).map((t) => [t.name.replace('treeflow_', ''), t]));
const call = async (name, args) => (await tools[name].handler(args)).content.map((c) => c.text).join('');
const json = async (name, args) => JSON.parse(await call(name, args));
const step = (msg) => console.log(`✔ ${msg}`);

// ── El bot de pruebas ──
let tree = (await client.listTrees()).find((t) => t.name === BOT);
if (!tree) {
  await client.createTree({ name: BOT, description: 'Bot desechable para probar el MCP', purpose: 'restaurante' });
  tree = (await client.listTrees()).find((t) => t.name === BOT);
}
const T = tree.tree_id;
console.log(`Bot de pruebas: ${T}`);

// Restos de una corrida anterior que falló a medias. El backend cambia los espacios de los
// nombres por "_": "Rama e2e 1" se guarda como "Rama_e2e_1".
const E2E_BRANCH = /^Rama[ _]e2e[ _]/;
for (const b of await client.listBranches(T)) if (E2E_BRANCH.test(b.name)) await client.deleteBranch(b.id);
for (const s of await client.listTestSuites(T)) if (/^Suite[ _]e2e[ _]/.test(s.name)) await client.deleteTestSuite(s.id);
for (const i of await client.listIntents(T)) if (i.name.startsWith('e2e_')) await client.deleteIntent(T, i.id);
for (const e of await client.listEntities(T)) if (e.name.startsWith('e2e_')) await client.deleteEntity(T, e.id);
for (const m of await client.listMessageTemplates(T)) if (m.name.startsWith('e2e_')) await client.deleteMessageTemplate(m.id);
for (const c of await client.listConditions(T)) if (c.name.startsWith('e2e_')) await client.deleteCondition(c.condicion_id);

// La hoja donde empieza cada conversación nueva. Para que el motor vea una intención de
// prueba, se enlaza ahí la rama de prueba y al final se deja como estaba.
const startOf = async () => {
  const main = (await client.listBranches(T)).find((b) => b.is_default);
  return { branchId: main.id, leaf: main.leaves.find((l) => l.id === main.start_leaf_id) };
};
{
  // Un enlace que dejó una corrida fallida apunta a una rama que ya no existe.
  const { branchId, leaf } = await startOf();
  const ids = new Set((await client.listBranches(T)).map((b) => b.id));
  const links = leaf.config?.linkedBranches ?? [];
  const alive = links.filter((l) => ids.has(String(l).split(/[:#]/)[0]));
  if (alive.length !== links.length) await client.updateLeaf(leaf.id, { config: { linkedBranches: alive } }, { branchId });
}

const branches = await client.listBranches(T);
const leaves = branches.flatMap((b) => (b.leaves ?? []).map((l) => ({ ...l, branchId: b.id })));
assert.ok(leaves.length, 'el bot de pruebas no tiene hojas');

// ── Fase 2: update_leaf combina el config ──
const target = leaves.find((l) => Object.keys(l.config ?? {}).length >= 3) ?? leaves[0];
const before = await json('get_detail', { tree_id: T, tipo: 'leaf', ref: target.id });
const marca = `Texto de prueba ${Date.now()}`;
await call('update_leaf', { leaf_id: target.id, branch_id: target.branchId, config: { messageText: marca } });
const after = await json('get_detail', { tree_id: T, tipo: 'leaf', ref: target.id });
assert.equal(after.config.messageText, marca);
for (const [k, v] of Object.entries(before.config)) {
  if (k !== 'messageText') assert.deepEqual(after.config[k], v, `update_leaf borró o cambió config.${k}`);
}
step(`update_leaf cambió sólo messageText de "${target.name}" y conservó ${Object.keys(before.config).length - 1} claves más`);

// Y con tree_id en vez de branch_id, devolviéndolo como estaba
await call('update_leaf', {
  leaf_id: target.id, tree_id: T,
  config: { messageText: before.config.messageText ?? null },
});
assert.deepEqual((await json('get_detail', { tree_id: T, tipo: 'leaf', ref: target.id })).config, before.config);
step('update_leaf con tree_id restauró el config original');

// ── update_intent: add/remove sin leer ──
const intents = await client.listIntents(T);
const intent = intents.find((i) => (i.patterns ?? []).length >= 2) ?? intents[0];
const frase = `frase de prueba ${Date.now()}`;
await call('update_intent', { tree_id: T, intent_id: intent.id, add_patterns: [frase] });
let now = await json('get_detail', { tree_id: T, tipo: 'intent', ref: intent.id });
assert.ok(now.patterns.includes(frase));
assert.equal(now.patterns.length, intent.patterns.length + 1);
await call('update_intent', { tree_id: T, intent_id: intent.id, remove_patterns: [frase] });
now = await json('get_detail', { tree_id: T, tipo: 'intent', ref: intent.id });
assert.deepEqual(now.patterns, intent.patterns);
assert.deepEqual(now.entities ?? [], comoHerramienta(intent.entities ?? []));
step(`update_intent añadió y quitó una frase de "${intent.name}" sin tocar las otras ${intent.patterns.length}`);

// ── update_entity: add/remove ──
const entity = (await client.listEntities(T)).find((e) => e.type !== 'regex' && (e.values ?? []).length);
if (entity) {
  const valor = `valor_prueba_${Date.now()}`;
  await call('update_entity', { tree_id: T, entity_id: entity.id, add_values: [{ key: valor, synonyms: ['sinónimo de prueba'] }] });
  let e = await json('get_detail', { tree_id: T, tipo: 'entity', ref: entity.id });
  assert.equal(e.values.length, entity.values.length + 1);
  await call('update_entity', { tree_id: T, entity_id: entity.id, remove_values: [valor] });
  e = await json('get_detail', { tree_id: T, tipo: 'entity', ref: entity.id });
  assert.deepEqual(e.values.map((v) => v.key), entity.values.map((v) => v.key));
  step(`update_entity añadió y quitó un valor de "${entity.name}"`);
}

// ── configure_integration: plano y sin borrar lo demás ──
const injBefore = (await client.listIntegrations(T)).injertos;
const web = injBefore.web && typeof injBefore.web === 'object' ? injBefore.web : {};
await call('configure_integration', { tree_id: T, integration_key: 'web', enabled: web.enabled ?? false, config: { widgetSubtitle: 'Subtítulo de prueba' } });
const webAfter = (await client.listIntegrations(T)).injertos.web;
assert.equal(webAfter.widgetSubtitle, 'Subtítulo de prueba');
assert.equal(webAfter.config, undefined, 'no debe anidar config');
for (const [k, v] of Object.entries(web)) if (k !== 'widgetSubtitle') assert.deepEqual(webAfter[k], v, `configure_integration cambió web.${k}`);
await call('configure_integration', { tree_id: T, integration_key: 'web', enabled: web.enabled ?? false, config: { widgetSubtitle: web.widgetSubtitle ?? null } });
step('configure_integration cambió una clave de web sin anidar ni borrar las demás');

// ── Fase 3: respuestas cortas que sirven para el paso siguiente ──
const sizes = {};
const measured = async (name, args) => {
  const text = await call(name, args);
  sizes[name] = Math.max(sizes[name] ?? 0, text.length);
  return text;
};
const sim1 = await measured('simulate_message', { tree_id: T, message: 'hola' });
const sid = sim1.match(/session_id: (\S+)/)?.[1];
assert.ok(sim1.startsWith('Bot: ') && sid, 'la simulación debe decir qué contestó y dar el session_id');
const sim2 = await measured('simulate_message', { tree_id: T, message: 'quiero hacer un pedido', session_id: sid });
assert.ok(sim2.includes(`session_id: ${sid}`), 'el segundo turno sigue en la misma sesión');
step(`simulate_message: dos turnos en la sesión ${sid}`);

const conv = await measured('get_conversation', { tree_id: T, session_id: sid });
assert.match(conv, /2 turnos/);
assert.match(await measured('list_conversations', { tree_id: T }), /^Conversaciones \(/);
step('get_conversation resume la sesión turno a turno');

const rama = await measured('create_branch', { tree_id: T, name: `Rama e2e ${Date.now()}` });
const branchId = rama.match(/Rama "[^"]+" \[([^\]]+)\]/)?.[1];
const startId = rama.match(/- Start \([^)]*\) \[([^\]]+)\]/)?.[1];
assert.ok(branchId && startId, 'create_branch debe devolver el ID de la rama y el de su hoja Start');
const hoja = await measured('create_leaf', { branch_id: branchId, leaves: [{ leaf_type: 'message', name: 'Hoja e2e', config: { messageText: 'hola' } }] });
const leafId = hoja.match(/\[([^\]]+)\]/)?.[1];
assert.ok((await measured('update_leaf', { leaf_id: leafId, branch_id: branchId, config: { nextLeafId: startId } })).endsWith(`→ ${startId}`));
await call('delete', { tree_id: T, tipo: 'leaf', ref: leafId });
await call('delete', { tree_id: T, tipo: 'branch', ref: branchId });
step('create_branch, create_leaf y update_leaf devuelven una línea con lo necesario (y se limpiaron)');

const suite = await measured('save_test_suite', {
  tree_id: T, name: `Suite e2e ${Date.now()}`,
  cases: [
    { nombre: 'Saludo', turnos: [{ mensaje: 'hola', asserts: [{ tipo: 'intencion', valor: 'saludo' }] }] },
    { nombre: 'Falla a propósito', turnos: [{ mensaje: 'hola', asserts: [{ tipo: 'intencion', valor: 'no_existe' }] }] },
  ],
});
const suiteId = suite.match(/\[([^\]]+)\]/)?.[1];
const run = await measured('run_test_suite', { suite_id: suiteId });
assert.match(run, /1\/2 casos bien/);
assert.match(run, /Falla a propósito/);
assert.ok(!run.includes('- Saludo'), 'lo que pasó no se repite');
await call('delete', { tree_id: T, tipo: 'test_suite', ref: suiteId });
step('run_test_suite devuelve los totales y sólo el caso que falló (la suite se borró)');

// ── Plantillas: la forma que guarda el editor ──
const stamp = Date.now();
const idOf = (line) => line.match(/\[([^\]]+)\]/)?.[1];
const soloTexto = idOf(await measured('save_message_template', { tree_id: T, name: `e2e_texto_${stamp}`, text: 'Hola e2e' }));
let tpl = await json('get_detail', { tree_id: T, tipo: 'template', ref: soloTexto });
assert.deepEqual(tpl.responses, [{ type: 'text', value: 'Hola e2e' }], 'el bloque de texto lleva value, no text');
await call('save_message_template', { tree_id: T, template_id: soloTexto, text: 'Adiós e2e' });
tpl = await json('get_detail', { tree_id: T, tipo: 'template', ref: soloTexto });
assert.equal(tpl.text, 'Adiós e2e');
assert.deepEqual(tpl.responses, [{ type: 'text', value: 'Adiós e2e' }], 'cambiar el texto cambia también el bloque que dice el bot');
step('save_message_template guarda { type: "text", value } y al cambiar el texto cambia también el bloque');

// Un párrafo con variables y un botón, mandados como bloques sueltos: van en un payload.
const conBloques = await measured('save_message_template', {
  tree_id: T, name: `e2e_apartado_${stamp}`,
  responses: [
    { type: 'paragraph', text: 'Apartadas {$cantidad} piezas de {$gema}' },
    { type: 'buttons', items: ['Ver más joyas'] },
  ],
});
assert.match(conBloques, /bloques: paragraph, buttons$/);
const apartadoTpl = idOf(conBloques);
tpl = await json('get_detail', { tree_id: T, tipo: 'template', ref: apartadoTpl });
assert.equal(tpl.responses.length, 1);
assert.equal(tpl.responses[0].type, 'payload');
assert.deepEqual(tpl.responses[0].value.map((b) => [b.type, b.items.length]), [['paragraph', 1], ['buttons', 1]]);
step('save_message_template guardó los bloques sueltos dentro de un payload');

// ── Fase 4: menos vueltas ──
assert.match(await measured('create_entity', { tree_id: T, entities: [{ name: `e2e_gema_${stamp}`, values: [{ key: 'zafiro', synonyms: ['zafiros'] }] }] }), /^Entidades creadas: 1 de 1/);
const flujo = await measured('create_branch', { tree_id: T, name: `Rama e2e lote ${stamp}` });
const flowBranch = flujo.match(/Rama "[^"]+" \[([^\]]+)\]/)[1];
const lote = await measured('create_leaf', {
  branch_id: flowBranch,
  leaves: [
    {
      ref: 'menu', leaf_type: 'trigger_context', name: 'Menu e2e',
      config: { intents: [{ name: `e2e_precio_${stamp}`, targetLeafId: 'ref:precio' }, { name: `e2e_apartar_${stamp}`, targetLeafId: 'ref:apartar' }], events: [] },
    },
    { ref: 'precio', leaf_type: 'intent', name: 'Precio e2e', config: { intentName: `e2e_precio_${stamp}`, isCustomResponse: true, messageText: 'Cuesta 30 pesos', nextLeafId: 'ref:menu' } },
    { ref: 'nomatch', leaf_type: 'event', name: 'No entiendo e2e', config: { eventName: 'sys.no-match', messageText: 'No te entendí', nextLeafId: 'ref:menu' } },
    { ref: 'apartar', leaf_type: 'intent', name: 'Apartar e2e', config: { intentName: `e2e_apartar_${stamp}`, isCustomResponse: false, messageTemplateId: apartadoTpl, nextLeafId: 'ref:menu' } },
  ],
});
const created = [...lote.matchAll(/- (.+?) \([^)]*\) \[([^\]]+)\]/g)].map((m) => ({ name: m[1], id: m[2] }));
assert.equal(created.length, 4, 'deben crearse las cuatro hojas');
const [menuLeaf, precioLeaf] = created;
const menuSaved = await json('get_detail', { tree_id: T, tipo: 'leaf', ref: menuLeaf.id });
const precioSaved = await json('get_detail', { tree_id: T, tipo: 'leaf', ref: precioLeaf.id });
assert.equal(menuSaved.config.intents[0].targetLeafId, precioLeaf.id);
assert.equal(precioSaved.config.nextLeafId, menuLeaf.id);
step('create_leaf creó 4 hojas enlazadas entre sí en una llamada (enlaces verificados releyéndolas)');

const nuevas = await measured('create_intent', {
  tree_id: T,
  intents: [
    { name: `e2e_precio_${stamp}`, patterns: ['cuánto cuesta el zafiro azul', 'precio del zafiro azul', 'qué vale el zafiro azul'] },
    { name: `e2e_horario_${stamp}`, patterns: ['a qué hora abre la joyería', 'horario de la joyería'] },
    {
      name: `e2e_apartar_${stamp}`,
      patterns: ['apartar piezas de joyeria', 'me apartas piezas de joyeria', 'aparta piezas de joyeria'],
      // La entidad propia va por nombre: el MCP la resuelve a su ID.
      entities: [
        { parameterName: 'cantidad', entity: 'sys.number', required: true, prompt: '¿Cuántas piezas quieres apartar?' },
        { parameterName: 'gema', entity: `e2e_gema_${stamp}`, required: true, prompt: '¿Qué gema quieres apartar?' },
      ],
    },
  ],
});
assert.match(nuevas, /^Intenciones creadas: 3 de 3/);
assert.match(nuevas, /parámetros: cantidad\*, gema\*/);
step('create_entity y create_intent crearon en lote');

// Los parámetros quedaron como los guarda el editor: name es la entidad y key su ID.
// get_detail devuelve los IDs cortos: se compara con la misma forma.
const gemaId = shortenText((await client.listEntities(T)).find((e) => e.name === `e2e_gema_${stamp}`).id);
const apartar = await json('get_detail', { tree_id: T, tipo: 'intent', ref: `e2e_apartar_${stamp}` });
const pick = (p) => ({ name: p.name, key: p.key, entityId: p.entityId, parameterName: p.parameterName, required: p.required });
assert.deepEqual(apartar.entities.map(pick), [
  { name: 'sys.number', key: 'sys.number', entityId: 'sys.number', parameterName: 'cantidad', required: true },
  { name: `e2e_gema_${stamp}`, key: gemaId, entityId: gemaId, parameterName: 'gema', required: true },
]);
step('los parámetros se guardaron con la entidad (name, key y entityId) y la variable en parameterName');

// Una conversación nueva empieza en la hoja de inicio de la rama por defecto: se le
// enlaza el menú de prueba para que el motor vea las intenciones nuevas.
const start = await startOf();
const linksBefore = start.leaf.config?.linkedBranches;
// Va directo al cliente y dentro de un texto "rama:hoja": ahí nadie expande los IDs cortos.
const completo = (id) => lookupShort(id) ?? id;
await client.updateLeaf(start.leaf.id, { config: { linkedBranches: [...(linksBefore ?? []), `${completo(flowBranch)}:${completo(menuLeaf.id)}`] } }, { branchId: start.branchId });

// Si el entrenamiento incluyó las nuevas, cuenta las mismas intenciones que hay ahora.
const intentsNow = (await client.listIntents(T)).length;
const entrenado = await measured('trigger_training', { tree_id: T });
assert.match(entrenado, /^Entrenamiento terminado .* can_use true/);
assert.match(entrenado, new RegExp(` ${intentsNow} intenciones`), 'el entrenamiento debe incluir las intenciones recién creadas');
step(`trigger_training esperó hasta el final (${entrenado.match(/en (\d+) s/)[1]} s) e incluyó las ${intentsNow} intenciones`);

// ── Slot filling: el bot pide cada parámetro obligatorio que falta ──
const turno1 = await measured('simulate_message', { tree_id: T, message: 'apartar piezas de joyeria' });
const sesion = turno1.match(/session_id: (\S+)/)[1];
assert.match(turno1, new RegExp(`intención e2e_apartar_${stamp}`), turno1);
assert.match(turno1, /^Bot: "¿Cuántas piezas quieres apartar\?"/, turno1);
assert.match(turno1, /slot filling: pidiendo/, turno1);
const turno2 = await call('simulate_message', { tree_id: T, message: '3', session_id: sesion });
assert.match(turno2, /^Bot: "¿Qué gema quieres apartar\?"/, turno2);
assert.match(turno2, /slot filling: pidiendo/, turno2);
const turno3 = await call('simulate_message', { tree_id: T, message: 'zafiros', session_id: sesion });
assert.match(turno3, /^Bot: \[payload\] .*Apartadas 3 piezas de zafiro.*Ver más joyas/, turno3);
assert.ok(!turno3.includes('slot filling'), turno3);
step('simulate_message: el bot pidió cantidad (sys.number) y gema (entidad propia), y contestó con la plantilla de bloques');

// Limpieza: el bot de pruebas queda como estaba
await client.updateLeaf(start.leaf.id, { config: { linkedBranches: linksBefore ?? null } }, { branchId: start.branchId });
for (const i of await client.listIntents(T)) if (i.name.startsWith('e2e_')) await client.deleteIntent(T, i.id);
for (const e of await client.listEntities(T)) if (e.name.startsWith('e2e_')) await client.deleteEntity(T, e.id);
for (const m of await client.listMessageTemplates(T)) if (m.name.startsWith('e2e_')) await client.deleteMessageTemplate(m.id);
await call('delete', { tree_id: T, tipo: 'branch', ref: flowBranch }); // ID corto: por la herramienta
assert.deepEqual((await startOf()).leaf.config?.linkedBranches, linksBefore, 'la hoja de inicio debe quedar como estaba');
await client.trainAndWait(T, { force: true });
step('limpieza: intenciones, entidad, plantillas y rama de prueba borradas, la hoja de inicio restaurada y el bot reentrenado');


// ── Fase 7: el bot por nombre, IDs cortos, conectar al crear, entrenar y probar ──
const esquema = await measured('get_tree_data', { tree_id: BOT });
assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}-/.test(esquema), 'el esquema no debe llevar UUID completos');
const inicio = esquema.match(/- (.+?) \(trigger_context, inicio\) \[([0-9a-f]{8,12})\]/);
assert.ok(inicio, 'el esquema debe mostrar la hoja de inicio con su ID corto');
// La rama de la hoja de inicio: la última "Rama" que aparece antes de su línea.
const branchOfStart = esquema.split('\n').reduce((acc, line) => {
  const b = line.match(/^Rama "[^"]+" \[([0-9a-f]{8,12})\]/);
  if (b) acc.current = b[1];
  if (line.includes(`[${inicio[2]}]`) && !acc.found) acc.found = acc.current;
  return acc;
}, { current: null, found: null }).found;
const conectada = await measured('create_leaf', {
  branch_id: branchOfStart,
  leaves: [{ ref: 'h', leaf_type: 'intent', name: 'Horario e2e', config: { intentName: `e2e_horario_${stamp}`, isCustomResponse: true, messageText: 'De 9 a 18 h' } }],
  connect: [{ from: inicio[2], name: `e2e_horario_${stamp}`, to: 'ref:h' }],
});
assert.match(conectada, /Conectadas desde:\n- .+: e2e_horario_\d+→Horario_e2e/);
const nuevaHoja = conectada.match(/- Horario_e2e \(intent\) \[([0-9a-f]{8,12})\]/)[1];
let inicioAhora = await json('get_detail', { tree_id: BOT, tipo: 'leaf', ref: inicio[2] });
assert.ok(inicioAhora.config.intents.some((r) => r.name === `e2e_horario_${stamp}` && r.targetLeafId === nuevaHoja), 'la ruta nueva apunta a la hoja nueva');
step('el bot por nombre, IDs cortos de ida y vuelta, y create_leaf creó y conectó la hoja desde el inicio en una llamada');

await call('update_leaf', { leaf_id: inicio[2], branch_id: branchOfStart, remove_routes: [`e2e_horario_${stamp}`] });
inicioAhora = await json('get_detail', { tree_id: BOT, tipo: 'leaf', ref: inicio[2] });
assert.ok(!inicioAhora.config.intents.some((r) => r.name === `e2e_horario_${stamp}`));
step('update_leaf con remove_routes quitó sólo esa ruta');
await call('delete', { tree_id: BOT, tipo: 'leaf', ref: nuevaHoja });

const probado = await measured('trigger_training', { tree_id: BOT, force: true, probar: ['hola', 'a qué hora abren'] });
assert.match(probado, /^Entrenamiento terminado .*\nPruebas \(cada una en una conversación nueva\):\n- "hola" → intención \S+/);
step('trigger_training entrenó y probó dos mensajes en una llamada');

// ── Condiciones: interruptor, condición guardada, reglas de Respuesta y de Transición ──
{
  // Como el servidor MCP: el modelo recibe el detail del backend, no el AxiosError.
  const rechazo = (promesa, patron) => assert.rejects(promesa, (e) => patron.test(String(e?.response?.data?.detail ?? e?.message)));
  const wasOn = (await client.getTree(T)).condicionales;
  await call('update_tree', { tree_id: T, condicionales: true });
  assert.equal((await client.getTree(T)).condicionales, true);
  assert.match(await call('get_tree_data', { tree_id: T, secciones: ['ramas'] }), /· condicionales/);

  const mayor = await call('save_condition', { tree_id: T, name: `e2e_mayor_${stamp}`, expression: '$edad >= 18', description: 'adulto' });
  assert.match(mayor, /^Condición creada:\n- e2e_mayor_\d+ \[\S+\] · \$edad >= 18 · 0 nodo\(s\)/);
  await rechazo(call('save_condition', { tree_id: T, name: `e2e_mala_${stamp}`, expression: '$edad >>> 18' }), /no es una expresión válida/);
  await rechazo(call('save_condition', { tree_id: T, name: `e2e_mayor_${stamp}`, expression: '$x == 1' }), /Ya hay una condición/);
  step('save_condition creó una condición, rechazó una expresión inválida y un nombre repetido (el 422/409 llega con su explicación)');

  const tplMayor = idOf(await call('save_message_template', { tree_id: T, name: `e2e_mayor_${stamp}`, text: 'Eres mayor de edad' }));
  await call('create_intent', {
    tree_id: T,
    intents: ['e2e_edad_r', 'e2e_edad_t'].map((n, i) => ({
      name: `${n}_${stamp}`, patterns: [i ? 'quiero ir por edad' : 'quiero consultar mi edad'],
      entities: [{ parameterName: 'edad', entity: 'sys.number', required: true, prompt: '¿Cuántos años tienes?' }],
    })),
  });
  const ramaC = await call('create_branch', { tree_id: T, name: `Rama e2e cond ${stamp}` });
  const condBranch = ramaC.match(/Rama "[^"]+" \[([^\]]+)\]/)[1];
  const condStart = ramaC.match(/- Start \([^)]*\) \[([^\]]+)\]/)[1];
  const hojas = await call('create_leaf', {
    branch_id: condBranch,
    leaves: [
      { ref: 'adulto', leaf_type: 'intent', name: 'Adulto e2e', config: { isCustomResponse: true, messageText: 'Camino adulto' } },
      { ref: 'menor', leaf_type: 'intent', name: 'Menor e2e', config: { isCustomResponse: true, messageText: 'Camino menor' } },
      {
        ref: 'resp', leaf_type: 'intent', name: 'Respuesta e2e',
        config: {
          intentName: `e2e_edad_r_${stamp}`, isCustomResponse: true, messageText: 'Eres menor',
          respuestasCondicionales: [
            { condicion: `e2e_mayor_${stamp}`, messageTemplateId: tplMayor },
            { name: 'Justo diez', expression: '$edad == 10', messageText: 'Justo diez, { $edad }' },
          ],
        },
      },
      {
        ref: 'trans', leaf_type: 'intent', name: 'Transicion e2e',
        config: {
          intentName: `e2e_edad_t_${stamp}`, isCustomResponse: true, messageText: 'x',
          rules: [{ condicion: `e2e_mayor_${stamp}`, targetLeafId: 'ref:adulto' }], nextLeafId: 'ref:menor',
        },
      },
    ],
  });
  const respLeaf = hojas.match(/- Respuesta_e2e \(intent\) \[([^\]]+)\]/)[1];
  const transLeaf = hojas.match(/- Transicion_e2e \(intent\) \[([^\]]+)\]/)[1];
  assert.match(hojas, /respuestas si: e2e_mayor_\d+, Justo diez/);
  assert.match(hojas, /reglas: e2e_mayor_\d+→Adulto_e2e/);

  const saved = await json('get_detail', { tree_id: T, tipo: 'leaf', ref: transLeaf });
  const regla = saved.config.rules[0];
  assert.ok(regla.condicionId && regla.expression === '$edad >= 18' && regla.id, 'la regla enlazada toma la expresión y lleva id');
  assert.equal(regla.condicion, undefined);
  step('create_leaf guardó reglas de Respuesta y de Transición enlazadas a la condición guardada, por nombre');

  // Una regla a medias no se guarda y el 422 dice qué falta
  await rechazo(
    call('create_leaf', { branch_id: condBranch, leaves: [{ leaf_type: 'intent', name: 'Mala e2e', config: { rules: [{ expression: '$a == 1' }] } }] }),
    /No se guardó: en el nodo «Mala e2e» la regla 1 de la Transición no dice adónde ir/
  );
  step('una regla a medias se rechaza con el nodo y lo que falta');

  // Que el motor las use: se enlazan desde el inicio por defecto
  const main = (await client.listBranches(T)).find((b) => b.is_default);
  const full = (id) => lookupShort(id) ?? id;
  await call('update_leaf', {
    leaf_id: main.start_leaf_id, branch_id: main.id,
    add_routes: [{ name: `e2e_edad_r_${stamp}`, targetLeafId: respLeaf }, { name: `e2e_edad_t_${stamp}`, targetLeafId: transLeaf }],
  });
  await call('trigger_training', { tree_id: T });
  const dice = async (frase, edad) => {
    const a = await call('simulate_message', { tree_id: T, message: frase });
    const b = await call('simulate_message', { tree_id: T, message: edad, session_id: a.match(/session_id: (\S+)/)[1] });
    return b.match(/^Bot: "([^"]*)"/)?.[1];
  };
  const caso = async (esperado) => {
    assert.deepEqual(
      [await dice('quiero consultar mi edad', '20'), await dice('quiero consultar mi edad', '10'), await dice('quiero consultar mi edad', '5'),
       await dice('quiero ir por edad', '20'), await dice('quiero ir por edad', '5')],
      esperado
    );
  };
  await caso(['Eres mayor de edad', 'Justo diez, 10', 'Eres menor', 'Camino adulto', 'Camino menor']);
  step('el motor elige: la primera regla que se cumple en Respuesta y Transición, y el «si no» si ninguna');

  const listada = await call('list_conditions', { tree_id: T });
  assert.match(listada, /· 2 nodo\(s\)/);
  const cambio = await call('save_condition', { tree_id: T, condition_ref: `e2e_mayor_${stamp}`, expression: '$edad >= 21', name: `e2e_mayor21_${stamp}` });
  assert.match(cambio, /^Condición actualizada, 2 nodo\(s\) al día/);
  await caso(['Eres menor', 'Justo diez, 10', 'Eres menor', 'Camino menor', 'Camino menor']);
  const propagada = await json('get_detail', { tree_id: T, tipo: 'leaf', ref: transLeaf });
  assert.equal(propagada.config.rules[0].expression, '$edad >= 21');
  assert.equal(propagada.config.rules[0].name, `e2e_mayor21_${stamp}`);
  step('editar la condición cambió la expresión y el nombre en los 2 nodos que la usan, y el motor lo notó');

  const borrada = await call('delete', { tree_id: T, tipo: 'condition', ref: `e2e_mayor21_${stamp}` });
  assert.match(borrada, /2 nodo\(s\) quedan con la regla propia/);
  const propia = (await json('get_detail', { tree_id: T, tipo: 'leaf', ref: transLeaf })).config.rules[0];
  assert.equal(propia.condicionId, undefined);
  assert.equal(propia.expression, '$edad >= 21');
  await caso(['Eres menor', 'Justo diez, 10', 'Eres menor', 'Camino menor', 'Camino menor']);
  step('borrar la condición dejó las reglas con su expresión, y el bot sigue igual');

  // Limpieza
  await call('update_leaf', { leaf_id: main.start_leaf_id, branch_id: main.id, remove_routes: [`e2e_edad_r_${stamp}`, `e2e_edad_t_${stamp}`] });
  await call('delete', { tree_id: T, tipo: 'branch', ref: condBranch });
  for (const i of await client.listIntents(T)) if (i.name.startsWith('e2e_')) await client.deleteIntent(T, i.id);
  for (const m of await client.listMessageTemplates(T)) if (m.name.startsWith('e2e_')) await client.deleteMessageTemplate(m.id);
  await call('update_tree', { tree_id: T, condicionales: wasOn });
  await client.trainAndWait(T, { force: true });
  step('limpieza de las condiciones: rama, intenciones, plantilla y condicionales como estaban');
}

// ── 1.4.0: ambientes, SQL sin base real, depuración del turno, nodo condition, linter ──
{
  const stamp2 = Date.now();
  const rechazo = (promesa, patron) => assert.rejects(promesa, (e) => patron.test(String(e?.response?.data?.detail ?? e?.message)));

  // Ambientes: el dev es saas, sin ellos. Ver es inocuo; publicar se niega antes de tocar nada.
  assert.match(await call('list_environments', { tree_id: T }), /un solo ambiente/);
  await assert.rejects(call('publish', { tree_id: T, destino: 'qa', confirm: true }), /no tiene ambientes/);
  assert.match(await call('publish', { tree_id: T, destino: 'qa', confirm: false }), /falta confirm=true/);
  assert.equal((await client.listTrees()).filter((t) => t.name === BOT).length, 1, 'publicar no debe haber creado copias');
  step('list_environments dice que no hay ambientes y publish se niega sin crear copias (edición saas)');

  // SQL: sin una base a la que llegar (el dev no abre redes privadas) se prueban las reglas y los errores
  assert.match(await call('save_sql_connection', { tree_id: T, nombre: `e2e_c_${stamp2}`, motor: 'postgres', host: '8.8.8.8', base: 'x', usuario: 'u', password: 'p' }), /^Conexión creada:\n- e2e_c_\d+ \[\S+\] postgres 8\.8\.8\.8:5432\/x · usuario u · con contraseña/);
  await rechazo(call('save_sql_connection', { tree_id: T, nombre: `e2e_mala_${stamp2}`, motor: 'oracle', host: 'x.com' }), /Motor no soportado/);
  await rechazo(call('save_sql_connection', { tree_id: T, connection_ref: `e2e_c_${stamp2}`, host: '9.9.9.9' }), /vuelve a escribir la contraseña/);
  await rechazo(call('save_sql_query', { tree_id: T, name: `e2e_q_${stamp2}`, connection: `e2e_c_${stamp2}`, sql: "SELECT * FROM t WHERE a = '{$x}'" }), /no puede ir entre comillas/);
  await assert.rejects(call('save_sql_query', { tree_id: T, name: 'q', connection: 'no_existe', sql: 'SELECT 1' }), /No existe la conexión "no_existe"/);
  const consulta = await call('save_sql_query', {
    tree_id: T, name: `e2e_q_${stamp2}`, connection: `e2e_c_${stamp2}`, sql: 'SELECT nombre FROM t WHERE email = {$email}',
    inputVariables: [{ name: 'email', testValue: 'a@b.c' }], outputVariables: [{ name: 'nombre' }],
  });
  assert.match(consulta, /estado unconfigured · entradas: email · salidas: nombre/);
  const prueba = JSON.parse(await call('test_sql_query', { tree_id: T, query_ref: `e2e_q_${stamp2}` }));
  assert.equal(prueba.estado, 'error');
  assert.deepEqual(prueba.payload, { p_email: 'a@b.c' }, 'la variable va como parámetro, no pegada en el texto');
  await assert.rejects(call('delete', { tree_id: T, tipo: 'sql_connection', ref: `e2e_c_${stamp2}` }), /la usan las consultas/);
  await call('delete', { tree_id: T, tipo: 'sql_query', ref: `e2e_q_${stamp2}` });
  await call('delete', { tree_id: T, tipo: 'sql_connection', ref: `e2e_c_${stamp2}` });
  assert.match(await call('list_sql', { tree_id: T }), /^Conexiones \(0\):\nConsultas \(0\):/);
  step('SQL: crear y cambiar conexiones y consultas, errores claros, la variable va como parámetro, y se borra');

  // Depuración de un turno: script con entradas renombradas, regla de Transición y nodo condition
  await call('create_intent', { tree_id: T, intents: [{ name: `e2e_dep_${stamp2}`, patterns: ['dame la edad e2e'], entities: [{ parameterName: 'edad', entity: 'sys.number', required: true, prompt: '¿Edad?' }] }] });
  await call('save_script', {
    tree_id: T, name: `e2e_doble_${stamp2}`, code: 'outputs = {"doble": int(inputs.get("n") or 0) * 2}',
    inputVariables: [{ name: 'n', testValue: '4', type: 'auto' }, { name: 'vacia' }], outputVariables: [{ name: 'doble', jsonPath: 'doble' }],
  });
  const script = (await client.listFertilizers(T)).scripts.find((x) => x.name === `e2e_doble_${stamp2}`);
  const ramaD = await call('create_branch', { tree_id: T, name: `Rama e2e dep ${stamp2}` });
  const depBranch = ramaD.match(/Rama "[^"]+" \[([^\]]+)\]/)[1];
  const depStart = ramaD.match(/- Start \([^)]*\) \[([^\]]+)\]/)[1];
  const dep = await call('create_leaf', {
    branch_id: depBranch,
    leaves: [
      { ref: 'adulto', leaf_type: 'message', name: 'Adulto dep', config: { isCustomResponse: true, messageText: 'Camino grande' } },
      { ref: 'chico', leaf_type: 'message', name: 'Chico dep', config: { isCustomResponse: true, messageText: 'Camino chico' } },
      { ref: 'cond', leaf_type: 'condition', name: 'Cond dep', config: { rules: [{ name: 'grande', expression: '$edad_doble > 20', targetLeafId: 'ref:adulto' }], elseLeafId: 'ref:chico' } },
      {
        ref: 'q', leaf_type: 'intent', name: 'Q dep',
        config: {
          intentName: `e2e_dep_${stamp2}`, isCustomResponse: true, messageText: 'x', nextLeafId: 'ref:cond', scriptIds: [script.id],
          toolMappings: { [script.id]: { inputs: { n: 'edad' }, outputs: { doble: 'edad_doble' } } },
        },
      },
    ],
    connect: [{ from: depStart, name: `e2e_dep_${stamp2}`, to: 'ref:q' }],
  });
  assert.match(dep, /Cond_dep \(condition\) \[\S+\] · reglas: grande→Adulto_dep · si no→Chico_dep/);
  const principal = (await client.listBranches(T)).find((b) => b.is_default);
  const qLeaf = dep.match(/- Q_dep \(intent\) \[([^\]]+)\]/)[1];
  await call('update_leaf', { leaf_id: principal.start_leaf_id, branch_id: principal.id, add_routes: [{ name: `e2e_dep_${stamp2}`, targetLeafId: qLeaf }] });
  await call('trigger_training', { tree_id: T });
  const turno = async (n) => {
    const a = await call('simulate_message', { tree_id: T, message: 'dame la edad e2e' });
    return call('simulate_message', { tree_id: T, message: n, session_id: a.match(/session_id: (\S+)/)[1] });
  };
  const grande = await turno('30');
  assert.match(grande, /^Bot: "Camino grande"/);
  assert.match(grande, /- script e2e_doble_\d+ ok \d+ms · entradas n=30, vacia=\(sin valor\) · guardó doble→edad_doble=60/);
  assert.match(grande, /reglas: Cond_dep: se cumplió \$edad_doble > 20 → va a Adulto_dep/);
  assert.match(grande, /recorrido: .*Adulto_dep/);
  const chico = await turno('5');
  assert.match(chico, /^Bot: "Camino chico"/);
  assert.match(chico, /Cond_dep: ninguna regla se cumplió/);
  step('simulate_message cuenta el script (entradas, la que no llegó, salida y nombre en la sesión), la regla que decidió y el recorrido; el nodo condition sigue funcionando');

  // Linter: un nodo con la sintaxis vieja se rechaza con el porqué
  await rechazo(
    call('create_leaf', { branch_id: depBranch, leaves: [{ leaf_type: 'message', name: 'Rota e2e', config: { isCustomResponse: true, messageText: 'Hola {{$n}}' } }] }),
    /es la sintaxis antigua/
  );
  step('un texto de nodo con {{ }} se rechaza con la explicación');

  await call('update_leaf', { leaf_id: principal.start_leaf_id, branch_id: principal.id, remove_routes: [`e2e_dep_${stamp2}`] });
  await call('delete', { tree_id: T, tipo: 'branch', ref: depBranch });
  await call('delete', { tree_id: T, tipo: 'script', ref: script.id });
  for (const i of await client.listIntents(T)) if (i.name.startsWith('e2e_')) await client.deleteIntent(T, i.id);
  await client.trainAndWait(T, { force: true });
  step('limpieza de la 1.4.0');
}

console.log('\nTamaño de las respuestas (caracteres):');
for (const [k, v] of Object.entries(sizes)) console.log(`  ${k.padEnd(20)} ${v}`);

console.log('\nTodo bien.');
