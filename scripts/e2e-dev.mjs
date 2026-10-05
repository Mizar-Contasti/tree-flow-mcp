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

process.on('unhandledRejection', (e) => {
  console.error(`FALLO: ${e?.response?.status ?? ''} ${e?.response?.data?.detail ? JSON.stringify(e.response.data.detail) : e?.message ?? e}`);
  process.exit(1);
});

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

console.log('\nTodo bien.');
