// Fase 3: respuestas cortas que conservan lo necesario para el siguiente paso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTools } from '../dist/catalog.js';
import { simulationSummary, conversationSummary, testRunSummary } from '../dist/tools/resumen.js';
import { ok } from '../dist/tools/util.js';
import { clienteFalso, texto } from './helpers.mjs';
import * as fx from './fixtures.mjs';

test('ok() responde JSON compacto, sin sangría', () => {
  assert.equal(texto(ok({ a: [1, 2], b: { c: 3 } })), '{"a":[1,2],"b":{"c":3}}');
});

const simulacion = {
  intent: 'consultar_precio', confidence: 0.9234, matching_type: 'exact_pattern_match',
  response: { type: 'text', value: '¿Qué producto te interesa?' },
  candidates: [{ platform: 'default', response: { type: 'text', value: '¿Qué producto te interesa?' } }],
  parameters: { producto: { key_value: 'café', original_value: 'cafecito', required: true } },
  session_parameters: { last_utterance: { key_value: 'cuánto cuesta' }, producto: { key_value: 'café' }, cliente: { key_value: 'Ana' } },
  'sentiment-data': { status: 'ok', polarity: 0.1 }, 'stt-data': { status: 'skipped' },
  slot_filling: { active: true, parameter: 'tamaño' },
  state: { current_node: 'Precios', current_node_id: 'hoja-precios' },
  session_id: 'mcp_sim_1',
};

test('simulate_message: respuesta, por qué, dónde quedó y cómo seguir; sin sentimiento ni STT', () => {
  const out = simulationSummary(simulacion);
  assert.match(out, /^Bot: "¿Qué producto te interesa\?"/);
  assert.match(out, /intención consultar_precio · confianza 0\.92 · exact_pattern_match · hoja Precios \[hoja-precios\]/);
  assert.match(out, /parámetros del turno: producto=café/);
  assert.match(out, /en la sesión: cliente=Ana/);
  assert.ok(!out.includes('last_utterance'), 'las variables del sistema no se listan');
  assert.match(out, /slot filling: pidiendo tamaño/);
  assert.match(out, /session_id: mcp_sim_1/);
  assert.ok(!/sentiment|stt|candidates/.test(out));
});

test('simulate_message sin intención ni texto no revienta', () => {
  assert.match(simulationSummary({ response: { type: 'card', value: { title: 'Menú' } } }), /Bot: \[card\] \{"title":"Menú"\}\nsin intención/);
});

test('get_conversation: un turno por línea', () => {
  const out = conversationSummary({
    session_id: 's1', turns: [
      { user_input: 'hola', response: { intent: 'saludo', response: { type: 'text', value: '¡Hola!' }, state: { current_node: 'Saludo' } } },
      { user_input: 'precio', response: simulacion },
    ],
  });
  assert.equal(out.split('\n').length, 3);
  assert.match(out, /- usuario: "hola" → bot: "¡Hola!" \(intención saludo, hoja Saludo\)/);
});

test('run_test_suite: totales y sólo lo que falló', () => {
  const out = testRunSummary({
    id: 'run-1', status: 'terminado', totals: { casos: 2, casos_ok: 1, asserts: 3, asserts_ok: 2 },
    results: [
      { nombre: 'Saludo', ok: true, turnos: [{ mensaje: 'hola', respuesta: '¡Hola!', comprobaciones: [{ tipo: 'intencion', ok: true }] }] },
      {
        nombre: 'Precio', ok: false, turnos: [
          { mensaje: 'cuánto cuesta', respuesta: 'No entendí', comprobaciones: [{ tipo: 'intencion', esperado: 'consultar_precio', obtenido: 'sys.no-match', ok: false }] },
        ],
      },
    ],
  });
  assert.match(out, /Ejecución \[run-1\] · terminado · 1\/2 casos bien · 2\/3 comprobaciones bien/);
  assert.match(out, /- Precio\n  · "cuánto cuesta" → "No entendí"\n    intencion: esperaba "consultar_precio", obtuvo "sys\.no-match"/);
  assert.ok(!out.includes('Saludo'), 'lo que pasó no se repite');
});

test('las escrituras devuelven una línea con el ID, no el objeto entero', async () => {
  const start = { id: 'hoja-start-nueva', name: 'Start', type: 'trigger_context', is_start: true, config: {}, created_at: 'x', position_x: 0 };
  const client = clienteFalso({
    createBranch: async () => ({ id: 'rama-nueva', name: 'Reservas', start_leaf_id: start.id, leaves: [start], created_at: 'x', view_x: 0 }),
    createLeaf: async () => ({ ...fx.branches[0].leaves[1], id: 'hoja-nueva' }),
    createIntent: async () => fx.intents[1],
    createTree: async () => fx.tree,
  });
  const tools = Object.fromEntries(buildTools(client).map((t) => [t.name.replace('treeflow_', ''), t]));
  const rama = texto(await tools.create_branch.handler({ tree_id: fx.TREE_ID, name: 'Reservas' }));
  assert.match(rama, /Rama "Reservas" \[rama-nueva\] · inicio: Start · 1 hojas\n  - Start \(trigger_context, inicio\) \[hoja-start-nueva\]/);
  assert.ok(!rama.includes('created_at') && !rama.includes('view_x'));
  assert.match(texto(await tools.create_leaf.handler({ branch_id: 'rama-nueva', leaves: [{ leaf_type: 'intent' }] })), /^Hojas creadas \(1\):\n- Saludo \(intent\) \[hoja-nueva\]/);
  assert.match(texto(await tools.create_intent.handler({ tree_id: fx.TREE_ID, intents: [{ name: 'x', patterns: ['y'] }] })), /^Intenciones creadas: 1 de 1\n- consultar_precio \[int-precio\]/);
  // El UUID sale corto: sus primeros 8 caracteres
  assert.match(texto(await tools.create_tree.handler({ name: 'Bot de pruebas' })), /^Bot creado: Bot "Bot de pruebas" \[00000000\]/);
});

test('list_conversations pide 20 por defecto', async () => {
  let params;
  const client = clienteFalso();
  client.client.get = async (url, opts) => ((params = opts?.params), { data: [] });
  const tool = buildTools(client).find((t) => t.name === 'treeflow_list_conversations');
  await tool.handler({ tree_id: fx.TREE_ID });
  assert.equal(params.limit, 20);
});
