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

// Restos de una corrida anterior que falló a medias
for (const b of await client.listBranches(T)) if (b.name.startsWith('Rama e2e ')) await client.deleteBranch(b.id);
for (const s of await client.listTestSuites(T)) if (s.name.startsWith('Suite e2e ')) await client.deleteTestSuite(s.id);
for (const i of await client.listIntents(T)) if (i.name.startsWith('e2e_')) await client.deleteIntent(T, i.id);
for (const e of await client.listEntities(T)) if (e.name.startsWith('e2e_')) await client.deleteEntity(T, e.id);

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
assert.deepEqual(now.entities ?? [], intent.entities ?? []);
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

// ── Fase 4: menos vueltas ──
const stamp = Date.now();
const flujo = await measured('create_branch', { tree_id: T, name: `Rama e2e lote ${stamp}` });
const flowBranch = flujo.match(/Rama "[^"]+" \[([^\]]+)\]/)[1];
const lote = await measured('create_leaf', {
  branch_id: flowBranch,
  leaves: [
    { ref: 'menu', leaf_type: 'trigger_context', name: 'Menu e2e', config: { intents: [{ name: `e2e_precio_${stamp}`, targetLeafId: 'ref:precio' }], events: [] } },
    { ref: 'precio', leaf_type: 'intent', name: 'Precio e2e', config: { intentName: `e2e_precio_${stamp}`, isCustomResponse: true, messageText: 'Cuesta 30 pesos', nextLeafId: 'ref:menu' } },
    { ref: 'nomatch', leaf_type: 'event', name: 'No entiendo e2e', config: { eventName: 'sys.no-match', messageText: 'No te entendí', nextLeafId: 'ref:menu' } },
  ],
});
const created = [...lote.matchAll(/- (.+?) \([^)]*\) \[([^\]]+)\]/g)].map((m) => ({ name: m[1], id: m[2] }));
assert.equal(created.length, 3, 'deben crearse las tres hojas');
const [menuLeaf, precioLeaf] = created;
const menuSaved = await json('get_detail', { tree_id: T, tipo: 'leaf', ref: menuLeaf.id });
const precioSaved = await json('get_detail', { tree_id: T, tipo: 'leaf', ref: precioLeaf.id });
assert.equal(menuSaved.config.intents[0].targetLeafId, precioLeaf.id);
assert.equal(precioSaved.config.nextLeafId, menuLeaf.id);
step('create_leaf creó 3 hojas enlazadas entre sí en una llamada (enlaces verificados releyéndolas)');

const nuevas = await measured('create_intent', {
  tree_id: T,
  intents: [
    { name: `e2e_precio_${stamp}`, patterns: ['cuánto cuesta el zafiro azul', 'precio del zafiro azul', 'qué vale el zafiro azul'] },
    { name: `e2e_horario_${stamp}`, patterns: ['a qué hora abre la joyería', 'horario de la joyería'] },
  ],
});
assert.match(nuevas, /^Intenciones creadas: 2 de 2/);
assert.match(await measured('create_entity', { tree_id: T, entities: [{ name: `e2e_gema_${stamp}`, values: [{ key: 'zafiro', synonyms: ['zafiros'] }] }] }), /^Entidades creadas: 1 de 1/);
step('create_intent y create_entity crearon en lote');

// Si el entrenamiento incluyó las nuevas, cuenta las mismas intenciones que hay ahora.
// (Simular una frase no lo prueba: el motor sólo considera las intenciones conectadas a
// la hoja actual, y una coincidencia exacta de entidad de la plantilla gana antes.)
const intentsNow = (await client.listIntents(T)).length;
const entrenado = await measured('trigger_training', { tree_id: T });
assert.match(entrenado, /^Entrenamiento terminado .* can_use true/);
assert.match(entrenado, new RegExp(` ${intentsNow} intenciones`), 'el entrenamiento debe incluir las intenciones recién creadas');
step(`trigger_training esperó hasta el final (${entrenado.match(/en (\d+) s/)[1]} s) e incluyó las ${intentsNow} intenciones`);

// Limpieza: el bot de pruebas queda como estaba
for (const i of await client.listIntents(T)) if (i.name.startsWith('e2e_')) await client.deleteIntent(T, i.id);
for (const e of await client.listEntities(T)) if (e.name.startsWith('e2e_')) await client.deleteEntity(T, e.id);
await client.deleteBranch(flowBranch);
await client.trainAndWait(T, { force: true });
step('limpieza: intenciones, entidad y rama de prueba borradas, y el bot reentrenado');

console.log('\nTamaño de las respuestas (caracteres):');
for (const [k, v] of Object.entries(sizes)) console.log(`  ${k.padEnd(20)} ${v}`);

console.log('\nTodo bien.');
