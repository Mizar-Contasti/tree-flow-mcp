// Fase 1: las lecturas resumen sin perder piezas, y el detalle se pide aparte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { clienteFalso, texto } from './helpers.mjs';
import * as fx from './fixtures.mjs';

// Antes de importar el catálogo: export_tree fija su carpeta al cargarse.
const exportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'treeflow-mcp-test-'));
process.env.TREEFLOW_EXPORT_DIR = exportDir;
const { buildTools } = await import('../dist/catalog.js');
const { treeOutline, leafLine, canvasNames, changedFields, fertilizersSummary } = await import('../dist/tools/resumen.js');

const client = clienteFalso({
  listTrees: async () => [fx.tree],
  listBranches: async () => fx.branches,
  getBranch: async (id) => fx.branches.find((b) => b.id === id),
  listIntents: async () => fx.intents,
  listEntities: async () => fx.entities,
  listMessageTemplates: async () => fx.templates,
  listFertilizers: async () => fx.fertilizers,
  exportTree: async () => ({ metadata: { tree_name: 'Bot de pruebas' }, visual_branches: fx.branches, visual_leaves: [], branches: fx.intents, leaves: fx.entities }),
  importTree: async (backup) => ({ ok: true, recibido: backup.metadata.tree_name }),
});
const tools = Object.fromEntries(buildTools(client).map((t) => [t.name.replace('treeflow_', ''), t]));
const call = async (name, args) => texto(await tools[name].handler({ tree_id: fx.TREE_ID, ...args }));

test('el esquema del bot nombra cada rama, hoja, intención, entidad y plantilla con su ID', async () => {
  const out = await call('get_tree_data');
  const ids = [
    ...fx.branches.flatMap((b) => [b.id, ...b.leaves.map((l) => l.id)]),
    ...fx.intents.map((i) => i.id), ...fx.entities.map((e) => e.id), ...fx.templates.map((t) => t.id),
  ];
  for (const id of ids) assert.ok(out.includes(`[${id}]`), `falta ${id}`);
  assert.ok(!out.includes('position_x') && !out.includes('created_at'), 'el esquema no debe llevar posiciones ni fechas');
});

test('una hoja dice qué responde, qué escucha y a dónde va, con nombres en vez de IDs', () => {
  const names = canvasNames(fx.branches, fx.templates);
  const [start, saludo, precios] = fx.branches[0].leaves;
  assert.match(leafLine(start, names), /escucha: saludo→Saludo, precios→Precios · eventos: No_entiendo→No entendí/);
  assert.match(leafLine(saludo, names), /dice "¡Hola! Bienvenido a la tienda de pruebas\." · → Menu/);
  // isCustomResponse=false: habla con la plantilla, no con su texto
  assert.match(leafLine(precios, names), /plantilla respuesta_precios · 1 API/);
});

test('un destino con otro nombre se muestra como intención→hoja', () => {
  const names = canvasNames(fx.branches);
  const leaf = { id: 'x', name: 'X', type: 'trigger_context', config: { intents: [{ name: 'ver_menu', targetLeafId: 'hoja-menu' }] } };
  assert.match(leafLine(leaf, names), /escucha: ver_menu→Menu/);
});

test('list_branches no trae las hojas, sólo las cuenta', async () => {
  const out = await call('list_branches');
  assert.match(out, /Rama "Principal" \[rama-1\] · por defecto · inicio: Start · 4 hojas/);
  assert.ok(!out.includes('hoja-saludo'));
});

test('list_leafs da el esquema de una rama', async () => {
  const out = await call('list_leafs', { branch_id: 'rama-1' });
  assert.match(out, /- Saludo \(intent\) \[hoja-saludo\]/);
  assert.ok(!out.includes('rama-2'));
});

test('list_intents cuenta frases y marca los parámetros obligatorios', async () => {
  const out = await call('list_intents');
  assert.match(out, /- consultar_precio \[int-precio\] · 1 frases · parámetros: producto\*/);
  assert.ok(!out.includes('cuánto cuesta'), 'las frases van en el detalle');
});

test('list_entities muestra los primeros valores y el patrón de las regex', async () => {
  const out = await call('list_entities');
  assert.match(out, /producto \[ent-producto\] simple · 2 valores: café, té/);
  assert.match(out, /codigo_postal \[ent-cp\] regex · regex \^\[0-9\]\{5\}\$/);
});

test('list_fertilizers no repite los scripts ni trae lastResponse ni secretos', () => {
  const out = fertilizersSummary(fx.fertilizers);
  assert.equal(out.match(/redondear/g).length, 1, 'el script sale una sola vez');
  assert.ok(!out.includes('xxxxx') && !out.includes('secreto-de-prueba'));
  assert.match(out, /- precios \[api-precios\] GET https:\/\/api\.ejemplo\.com\/precios · estado validated · entradas: producto · salidas: precio/);
});

test('get_detail encuentra por ID o por nombre y quita el ruido', async () => {
  const leaf = JSON.parse(await call('get_detail', { tipo: 'leaf', ref: 'Saludo' }));
  assert.equal(leaf.id, 'hoja-saludo');
  assert.deepEqual(leaf.branch, { id: 'rama-1', name: 'Principal' });
  assert.equal(leaf.config.nextLeafId, 'hoja-menu');
  assert.equal(leaf.created_at, undefined);

  const intent = JSON.parse(await call('get_detail', { tipo: 'intent', ref: 'int-saludo' }));
  assert.equal(intent.displayPatterns, undefined, 'displayPatterns igual a patterns no se repite');
  const precio = JSON.parse(await call('get_detail', { tipo: 'intent', ref: 'consultar_precio' }));
  assert.ok(precio.displayPatterns, 'si difiere de patterns, se conserva');
});

test('get_detail de una API enmascara secretos y recorta lastResponse', async () => {
  const api = JSON.parse(await call('get_detail', { tipo: 'tool', ref: 'precios' }));
  assert.equal(api.authConfig.token, '***');
  assert.ok(api.lastResponse.length < 400);
});

test('get_detail con un nombre repetido pide el ID', async () => {
  const dup = clienteFalso({ listBranches: async () => [{ id: 'r', name: 'R', leaves: [{ id: 'a', name: 'Igual' }, { id: 'b', name: 'Igual' }] }] });
  const detail = buildTools(dup).find((t) => t.name === 'treeflow_get_detail');
  await assert.rejects(detail.handler({ tree_id: 't', tipo: 'leaf', ref: 'Igual' }), /"Igual" es el nombre de 2 piezas \(a, b\): usa el ID/);
});

test('changedFields dice qué campos de primer nivel cambiaron', () => {
  assert.deepEqual(changedFields({ before: { a: 1, b: [1] }, after: { a: 1, b: [2], c: 3 } }), ['b', 'c']);
});

test('export_tree escribe el archivo y devuelve la ruta; import_tree lo lee', async () => {
  const out = await call('export_tree');
  const file = out.match(/a (.+\.json) \(/)[1];
  assert.ok(fs.existsSync(file) && file.startsWith(exportDir));
  assert.match(out, /Contiene: 2 ramas, 0 hojas, 2 intenciones, 2 entidades/);
  const imported = JSON.parse(texto(await tools.import_tree.handler({ archivo: file })));
  assert.equal(imported.recibido, 'Bot de pruebas');
});
