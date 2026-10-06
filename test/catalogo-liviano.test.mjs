// Fase 5: menos herramientas en el catálogo sin perder capacidades.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTools, INSTRUCTIONS, TOOLSETS, DEFAULT_TOOLSETS, buildInstructions, enableToolsTool, parseToolsets, toolsetOf } from '../dist/catalog.js';
import { GUIDE } from '../dist/tools/guide.js';
import { clienteFalso, texto } from './helpers.mjs';
import * as fx from './fixtures.mjs';

const herramientas = (client) => Object.fromEntries(buildTools(client).map((t) => [t.name.replace('treeflow_', ''), t]));

test('save_X crea sin ID y modifica con ID', async () => {
  const calls = [];
  const tools = herramientas(clienteFalso({
    createTool: async (t, input) => (calls.push(['create', input.name]), { id: 'api-1', ...input }),
    updateTool: async (t, id, patch) => (calls.push(['update', id, patch.timeout]), { id, name: 'precios', ...patch }),
    createCapture: async (t, data) => (calls.push(['createCapture', data.name]), data),
    updateCapture: async (t, ref, data) => (calls.push(['updateCapture', ref]), data),
  }));
  assert.match(texto(await tools.save_tool.handler({ tree_id: fx.TREE_ID, name: 'precios', url: 'https://x' })), /^API creada: - precios \[api-1\]/);
  assert.match(texto(await tools.save_tool.handler({ tree_id: fx.TREE_ID, tool_id: 'precios', timeout: 5 })), /^API actualizada/);
  await tools.save_capture.handler({ tree_id: fx.TREE_ID, name: 'pedir_fecha', prompt: '¿Qué día?' });
  await tools.save_capture.handler({ tree_id: fx.TREE_ID, capture_ref: 'pedir_fecha', limit: 2 });
  assert.deepEqual(calls, [['create', 'precios'], ['update', 'precios', 5], ['createCapture', 'pedir_fecha'], ['updateCapture', 'pedir_fecha']]);
});

test('save_X sin ID y sin los campos obligatorios explica qué falta', async () => {
  const tools = herramientas(clienteFalso());
  await assert.rejects(tools.save_tool.handler({ tree_id: fx.TREE_ID, url: 'https://x' }), /hacen falta name y url/);
  await assert.rejects(tools.save_script.handler({ tree_id: fx.TREE_ID, name: 'x' }), /hacen falta name y code/);
  await assert.rejects(tools.save_test_suite.handler({ name: 'x' }), /hacen falta tree_id y name/);
});

test('treeflow_delete borra cada tipo con la llamada que le toca', async () => {
  const calls = [];
  const rec = (name) => async (...args) => (calls.push([name, ...args]), { ok: true });
  const tools = herramientas(clienteFalso({
    deleteBranch: rec('branch'), deleteLeaf: rec('leaf'), deleteIntent: rec('intent'), deleteEntity: rec('entity'),
    deleteMessageTemplate: rec('template'), deleteTool: rec('tool'), deleteScript: rec('script'),
    deleteCapture: rec('capture'), deleteTransfer: rec('transfer'), deleteTestSuite: rec('test_suite'),
  }));
  const T = fx.TREE_ID;
  for (const tipo of ['branch', 'leaf', 'intent', 'tool', 'test_suite']) {
    assert.equal(texto(await tools.delete.handler({ tree_id: T, tipo, ref: `x-${tipo}` })), `Borrado: ${tipo} x-${tipo}`);
  }
  assert.deepEqual(calls, [['branch', 'x-branch'], ['leaf', 'x-leaf'], ['intent', T, 'x-intent'], ['tool', T, 'x-tool'], ['test_suite', 'x-test_suite']]);
  await assert.rejects(tools.delete.handler({ tree_id: T, tipo: 'tree', ref: 'x' }), /tipo debe ser uno de/);
});

test('ya no existen los create_/update_/delete_ que se juntaron', () => {
  const names = Object.keys(herramientas(clienteFalso()));
  for (const gone of ['create_tool', 'update_tool', 'delete_tool', 'create_script', 'update_capture', 'create_transfer',
    'update_message_template', 'create_test_suite', 'delete_branch', 'delete_leaf', 'delete_intent', 'delete_entity']) {
    assert.ok(!names.includes(gone), `${gone} debería haberse juntado`);
  }
});

test('TREEFLOW_TOOLSETS: vacía da los de por defecto; una lista los sustituye; "todo" los activa todos', () => {
  assert.deepEqual([...parseToolsets(undefined).active], ['base', ...DEFAULT_TOOLSETS]);
  assert.deepEqual([...parseToolsets(' APIs , pruebas ').active], ['base', 'apis', 'pruebas']);
  assert.deepEqual([...parseToolsets('todo').active], ['base', ...Object.keys(TOOLSETS)]);
  assert.deepEqual(parseToolsets('apis,fantasma').unknown, ['fantasma']);
});

test('cada grupo tiene herramientas y la base no se queda con las de un grupo', () => {
  const tools = buildTools(clienteFalso());
  for (const group of Object.keys(TOOLSETS)) {
    assert.ok(tools.some((t) => toolsetOf(t.name) === group), `el grupo ${group} no atrapa ninguna herramienta`);
  }
  for (const t of tools.filter((t) => toolsetOf(t.name) === 'base')) {
    assert.ok(!/fertilizers|_tool$|script|test_suite|test_run|transfer|live_chat|backup|export_tree|import_tree|restore|users?$|credentials|voice|integration|history|analytics|capture/.test(t.name),
      `${t.name} parece de un grupo opcional pero quedó en la base`);
  }
});

test('las instrucciones sólo nombran herramientas de los grupos activos', () => {
  const tools = buildTools(clienteFalso());
  for (const value of [undefined, 'base', 'todo']) {
    const { active } = parseToolsets(value);
    const visible = new Set(tools.filter((t) => active.has(toolsetOf(t.name))).map((t) => t.name));
    visible.add('treeflow_enable_tools');
    for (const name of buildInstructions(active).match(/treeflow_[a-z_]+/g)) {
      assert.ok(visible.has(name), `con ${value ?? 'por defecto'}, las instrucciones nombran ${name}, que no está activa`);
    }
  }
  assert.ok(!INSTRUCTIONS.includes('enable_tools'), 'con todo activo no hay nada que activar');
});

test('treeflow_enable_tools activa grupos y avisa; desaparece cuando ya no queda ninguno', async () => {
  const tools = buildTools(clienteFalso());
  const active = new Set(['base']);
  let avisos = 0;
  const enable = enableToolsTool(active, tools, async () => { avisos++; });
  assert.deepEqual(enable.inputSchema.properties.grupos.items.enum, Object.keys(TOOLSETS));
  const out = texto(await enable.handler({ grupos: ['apis', 'no_existe'] }));
  assert.ok(active.has('apis') && !active.has('no_existe'));
  assert.equal(avisos, 1);
  assert.match(out, /^Activados: apis\. Herramientas nuevas: treeflow_list_fertilizers, treeflow_save_tool/);
  await assert.rejects(enable.handler({ grupos: [] }), /Grupos que se pueden activar/);
  assert.equal(enableToolsTool(new Set(['base', ...Object.keys(TOOLSETS)]), tools, async () => {}), undefined);
});

test('la guía cubre cada tema que se menciona en el catálogo', async () => {
  const tools = herramientas(clienteFalso());
  const all = buildTools(clienteFalso()).map((t) => t.description).join('\n') + INSTRUCTIONS;
  for (const [, tema] of all.matchAll(/treeflow_guide\("([a-z]+)"\)/g)) assert.ok(GUIDE[tema], `falta el tema "${tema}"`);
  assert.match(texto(await tools.guide.handler({ tema: 'plantillas' })), /\{\{ \}\} YA NO EXISTE/);
  await assert.rejects(tools.guide.handler({ tema: 'nada' }), /Tema desconocido/);
});
