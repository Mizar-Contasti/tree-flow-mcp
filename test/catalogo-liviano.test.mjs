// Fase 5: menos herramientas en el catálogo sin perder capacidades.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTools, INSTRUCTIONS } from '../dist/catalog.js';
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
  for (const tipo of ['branch', 'leaf', 'intent', 'tool', 'test_suite']) {
    assert.equal(texto(await tools.delete.handler({ tree_id: 't', tipo, ref: `x-${tipo}` })), `Borrado: ${tipo} x-${tipo}`);
  }
  assert.deepEqual(calls, [['branch', 'x-branch'], ['leaf', 'x-leaf'], ['intent', 't', 'x-intent'], ['tool', 't', 'x-tool'], ['test_suite', 'x-test_suite']]);
  await assert.rejects(tools.delete.handler({ tree_id: 't', tipo: 'tree', ref: 'x' }), /tipo debe ser uno de/);
});

test('ya no existen los create_/update_/delete_ que se juntaron', () => {
  const names = Object.keys(herramientas(clienteFalso()));
  for (const gone of ['create_tool', 'update_tool', 'delete_tool', 'create_script', 'update_capture', 'create_transfer',
    'update_message_template', 'create_test_suite', 'delete_branch', 'delete_leaf', 'delete_intent', 'delete_entity']) {
    assert.ok(!names.includes(gone), `${gone} debería haberse juntado`);
  }
});

test('la guía cubre cada tema que se menciona en el catálogo', async () => {
  const tools = herramientas(clienteFalso());
  const all = buildTools(clienteFalso()).map((t) => t.description).join('\n') + INSTRUCTIONS;
  for (const [, tema] of all.matchAll(/treeflow_guide\("([a-z]+)"\)/g)) assert.ok(GUIDE[tema], `falta el tema "${tema}"`);
  assert.match(texto(await tools.guide.handler({ tema: 'plantillas' })), /\{\{ \}\} YA NO EXISTE/);
  await assert.rejects(tools.guide.handler({ tema: 'nada' }), /Tema desconocido/);
});
