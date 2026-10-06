// Fase 7: rutas sin reescribir la lista, conectar al crear, entrenar y probar en una llamada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTools } from '../dist/catalog.js';
import { editRoutes } from '../dist/client/treeflowClient.js';
import { clienteFalso, texto } from './helpers.mjs';
import * as fx from './fixtures.mjs';

const herramientas = (client) => Object.fromEntries(buildTools(client).map((t) => [t.name.replace('treeflow_', ''), t]));
const start = fx.branches[0].leaves[0]; // trigger_context con saludo y precios

test('editRoutes añade, redirige y quita rutas sin tocar las demás', () => {
  const out = editRoutes(start.config, [
    { name: 'horario', targetLeafId: 'hoja-horario' },
    { name: 'precios', targetLeafId: 'hoja-nueva' },
    { name: 'sys.no-input', targetLeafId: 'hoja-x', kind: 'event' },
  ], ['SALUDO']);
  assert.deepEqual(out.intents.map((r) => [r.name, r.targetLeafId]), [['precios', 'hoja-nueva'], ['horario', 'hoja-horario']]);
  assert.match(out.intents[1].id, /^intent_\d+/);
  assert.equal(out.events.length, 2);
  assert.deepEqual(out.events[1], { id: out.events[1].id, name: 'sys.no-input', type: 'custom', targetLeafId: 'hoja-x' });
  assert.equal(start.config.intents.length, 2, 'no muta el config original');
});

test('update_leaf con add_routes lee la hoja y conserva el resto del config', async () => {
  let sent;
  const client = clienteFalso();
  client.client = {
    get: async (url) => (url === '/design/branches/rama-1' ? { data: fx.branches[0] } : Promise.reject(new Error(url))),
    put: async (url, body) => ((sent = body), { data: { ...start, ...body } }),
  };
  await herramientas(client).update_leaf.handler({
    leaf_id: start.id, branch_id: 'rama-1', add_routes: [{ name: 'horario', targetLeafId: 'hoja-horario' }],
  });
  assert.deepEqual(sent.config.intents.map((r) => r.name), ['saludo', 'precios', 'horario']);
  assert.deepEqual(sent.config.events, start.config.events);
});

test('create_leaf con connect crea las hojas y las conecta desde una existente en la misma llamada', async () => {
  const created = [];
  let route;
  const tools = herramientas(clienteFalso({
    createLeaf: async (_, d) => (created.push(d), { ...d, id: d.id, name: d.name, type: d.type }),
    getBranch: async () => ({ id: 'rama-1', tree_id: fx.TREE_ID }),
    updateLeaf: async (id, data, opts) => ((route = { id, opts }), { ...start, id }),
  }));
  const out = texto(await tools.create_leaf.handler({
    branch_id: 'rama-1',
    leaves: [{ ref: 'horario', leaf_type: 'intent', name: 'Horario', config: { intentName: 'horario', messageText: 'De 9 a 18' } }],
    connect: [{ from: start.id, name: 'horario', to: 'ref:horario' }],
  }));
  assert.equal(route.id, start.id);
  assert.equal(route.opts.treeId, fx.TREE_ID);
  assert.deepEqual(route.opts.addRoutes, [{ name: 'horario', targetLeafId: created[0].id, kind: undefined }]);
  assert.match(out, /Conectadas desde:\n- Start \[hoja-start\]: horario→Horario/);
});

test('create_leaf con un ref roto en connect no crea nada', async () => {
  let calls = 0;
  const tools = herramientas(clienteFalso({ createLeaf: async () => (calls++, {}) }));
  await assert.rejects(
    tools.create_leaf.handler({ branch_id: 'r', leaves: [{ leaf_type: 'intent' }], connect: [{ from: 'x', name: 'y', to: 'ref:nada' }] }),
    /"ref:nada" no corresponde/
  );
  assert.equal(calls, 0);
});

test('trigger_training con probar entrena y prueba en una llamada', async () => {
  const tools = herramientas(clienteFalso({
    triggerTraining: async () => ({ status: 'queued' }),
    getTrainingStatus: async () => ({ status: 'updated', can_use: true }),
    listTrainingHistory: async () => ({ items: [{ changes_summary: { intents_total: 3, entities_total: 1 } }] }),
    simulateChatMessage: async (_, m) => ({
      intent: m.includes('hora') ? 'horario' : 'saludo', confidence: 0.9,
      response: { type: 'text', value: m.includes('hora') ? 'De 9 a 18' : 'Hola' }, state: { current_node: 'Horario' },
    }),
  }));
  const out = texto(await tools.trigger_training.handler({ tree_id: fx.TREE_ID, probar: ['a qué hora abren', 'hola'] }));
  assert.match(out, /Pruebas \(cada una en una conversación nueva\):\n- "a qué hora abren" → intención horario \(0\.90\) · hoja Horario · "De 9 a 18"\n- "hola" → intención saludo/);
});
