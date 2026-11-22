// 1.4.0: SQL, ambientes y la depuración del turno, sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulationSummary } from '../dist/tools/resumen.js';
import { GUIDE } from '../dist/tools/guide.js';
import { conHttp, clienteFalso, texto } from './helpers.mjs';
import * as fx from './fixtures.mjs';

const conexion = { id: 'c1', nombre: 'clientes', motor: 'postgres', host: 'db.x.com', puerto: 5432, base: 'b', usuario: 'u', ssl: false, tienePassword: true };
const consulta = { id: 'sql_1', name: 'saldo', conexion: 'clientes', sql: 'SELECT saldo FROM t WHERE e = {$email}', status: 'validated', enabled: true, inputVariables: [{ name: 'email', testValue: 'a@b.c' }], outputVariables: [{ name: 'saldo' }] };
const rutaSql = `/api/sql/${fx.TREE_ID}`;

test('save_sql_connection modifica sin password: reenvía el id y no inventa una contraseña', async () => {
  const { tools, sent } = await conHttp({ [rutaSql]: { conexiones: [conexion], consultas: [] } });
  await tools.save_sql_connection.handler({ tree_id: fx.TREE_ID, connection_ref: 'CLIENTES', base: 'otra' });
  const put = sent.find((s) => s.method === 'PUT');
  assert.equal(put.url, `${rutaSql}/conexiones`);
  assert.equal(put.body.conexiones.length, 1);
  assert.equal(put.body.conexiones[0].id, 'c1');
  assert.equal(put.body.conexiones[0].base, 'otra');
  assert.ok(!('password' in put.body.conexiones[0]) && !('tienePassword' in put.body.conexiones[0]));
});

test('save_sql_connection exige nombre, motor y host al crear y nunca imprime la contraseña', async () => {
  const { tools } = await conHttp({ [rutaSql]: { conexiones: [], consultas: [] } });
  await assert.rejects(tools.save_sql_connection.handler({ tree_id: fx.TREE_ID, nombre: 'x' }), /hacen falta nombre, motor y host/);
  const out = texto(await tools.save_sql_connection.handler({ tree_id: fx.TREE_ID, nombre: 'n', motor: 'mysql', host: 'h.com', password: 'secreto-1234' }));
  assert.ok(!out.includes('secreto-1234'));
});

test('save_sql_query: la consulta nombra la conexión por nombre, nace sin probar y un cambio la deja sin probar', async () => {
  const { tools, sent } = await conHttp({ [rutaSql]: { conexiones: [conexion], consultas: [consulta] } });
  await tools.save_sql_query.handler({ tree_id: fx.TREE_ID, name: 'nueva', connection: 'Clientes', sql: 'SELECT 1' });
  let body = sent.find((s) => s.method === 'PUT').body;
  const creada = body.consultas.find((q) => q.name === 'nueva');
  assert.equal(creada.conexion, 'clientes');
  assert.equal(creada.status, 'unconfigured');
  assert.match(creada.id, /^sql_[0-9a-f]{12}$/);
  await tools.save_sql_query.handler({ tree_id: fx.TREE_ID, query_ref: 'saldo', sql: 'SELECT 2' });
  body = sent.filter((s) => s.method === 'PUT').at(-1).body;
  assert.equal(body.consultas[0].status, 'unconfigured');
  await tools.save_sql_query.handler({ tree_id: fx.TREE_ID, query_ref: 'saldo', description: 'sólo texto' });
  assert.equal(sent.filter((s) => s.method === 'PUT').at(-1).body.consultas[0].status, 'validated');
  await assert.rejects(tools.save_sql_query.handler({ tree_id: fx.TREE_ID, name: 'x', sql: 'SELECT 1', connection: 'no' }), /No existe la conexión "no"\. Hay: clientes/);
});

test('test_sql_query manda test_values al vuelo y delete protege una conexión en uso', async () => {
  const { tools, sent } = await conHttp({ [rutaSql]: { conexiones: [conexion], consultas: [consulta] } });
  await tools.test_sql_query.handler({ tree_id: fx.TREE_ID, query_ref: 'saldo', test_values: { email: 'z@z.z' } });
  const post = sent.find((s) => s.method === 'POST');
  assert.equal(post.url, `${rutaSql}/consultas/probar`);
  assert.equal(post.body.consulta.inputVariables[0].testValue, 'z@z.z');
  await assert.rejects(tools.delete.handler({ tree_id: fx.TREE_ID, tipo: 'sql_connection', ref: 'clientes' }), /la usan las consultas saldo/);
  await tools.delete.handler({ tree_id: fx.TREE_ID, tipo: 'sql_query', ref: 'saldo' });
  assert.deepEqual(sent.filter((s) => s.method === 'PUT').at(-1).body, { consultas: [] });
});

test('list_sql dice si falta la contraseña y no la muestra', async () => {
  const { tools } = await conHttp({ [rutaSql]: { conexiones: [{ ...conexion, tienePassword: false }], consultas: [consulta] } });
  const out = texto(await tools.list_sql.handler({ tree_id: fx.TREE_ID }));
  assert.match(out, /clientes \[c1\] postgres db\.x\.com:5432\/b · usuario u · SIN contraseña/);
  assert.match(out, /saldo \[sql_1\] sobre clientes · estado validated · entradas: email · salidas: saldo/);
});

test('la guía de SQL trae los tres motores y cómo se usa en un nodo', () => {
  for (const x of ['postgres', 'mysql', 'sqlserver', 'SELECT TOP 1', 'RETURNING', 'OUTPUT INSERTED', '{$email}', 'toolIds']) assert.ok(GUIDE.sql.includes(x), x);
});

test('la edición saas no tiene ambientes: publish se niega y no llama a publicar', async () => {
  const { tools, sent } = await conHttp({ '/api/instancia': { edicion: 'saas' } });
  await assert.rejects(tools.publish.handler({ tree_id: fx.TREE_ID, destino: 'qa', confirm: true }), /no tiene ambientes/);
  assert.ok(!sent.some((s) => s.method === 'POST'));
  assert.match(texto(await tools.publish.handler({ tree_id: fx.TREE_ID, destino: 'qa', confirm: false })), /falta confirm=true/);
});

test('en una instancia, publish a Prod avisa que espera al Admin y list_environments muestra los tres', async () => {
  const pub = { publicacion_id: 'p1', tipo: 'publicacion', origen: 'qa', destino: 'prod', estado: 'pendiente', solicitada_por_nombre: 'Ana' };
  const { tools, sent, client } = await conHttp({
    '/api/instancia': { edicion: 'instancia' },
    [`/api/agentes/${fx.TREE_ID}/ambientes`]: { agente_id: 'a', ambientes: { dev: { tree_id: 'd', nombre: 'B' }, qa: { tree_id: 'q', nombre: 'B', version: 2 }, prod: { tree_id: 'p', nombre: 'B', version: 1 } }, pendientes: [pub] },
    [`/api/agentes/${fx.TREE_ID}/publicaciones`]: [pub],
  });
  client.client.post = async (url, body) => (sent.push({ method: 'POST', url, body }), { data: pub });
  const out = await tools.publish.handler({ tree_id: fx.TREE_ID, destino: 'prod', confirm: true, nota: 'va' });
  assert.deepEqual(sent.find((s) => s.method === 'POST'), { method: 'POST', url: `/api/agentes/${fx.TREE_ID}/publicar`, body: { destino: 'prod', nota: 'va' } });
  assert.match(out.content[0].text, /Queda pendiente: sólo el Admin/);
  const lista = texto(await tools.list_environments.handler({ tree_id: fx.TREE_ID }));
  assert.match(lista, /- qa: "B" \[q\] · versión 2/);
  assert.match(lista, /Esperando al Admin:\n- \[p1\] qa→prod · pendiente/);
});

test('un nombre con tres ambientes elige Dev, y "Nombre@qa" elige QA', async () => {
  const trees = ['dev', 'qa', 'prod'].map((a, i) => ({ tree_id: `0000000${i}-0000-4000-8000-000000000000`, name: 'Mi bot', agente_id: 'ag', ambiente: a }));
  const client = clienteFalso({ listTrees: async () => trees });
  assert.equal(await client.resolveTreeId('mi bot'), trees[0].tree_id);
  assert.equal(await client.resolveTreeId('Mi bot@qa'), trees[1].tree_id);
  assert.equal(await client.resolveTreeId('Mi bot @PROD'), trees[2].tree_id);
});

test('simulate: cuenta lo que corrió, lo que no llegó, cómo se guardó y qué regla decidió', () => {
  const out = simulationSummary({
    response: { type: 'text', value: 'Camino grande' }, intent: 'q', state: { current_node: 'Start' },
    debug_tools: [
      { kind: 'script', tool_name: 'doble', estado: 'ok', execution_ms: 40, inputs: { n: '30', vacia: null }, outputs: { edad_doble: 60 }, guardado_en: { doble: 'edad_doble' } },
      { kind: 'sql', tool_name: 'saldo', estado: 'error', inputs: { email: 'a@b.c' }, outputs: {}, guardado_en: {}, fallback_used: true, error: 'connection refused' },
    ],
    debug_condiciones: [{ nodo: 'Cond', decision: '$x > 1', destino: 'Grande' }, { nodo: 'Q', decision: 'si no', destino: null }, { nodo: 'R', decision: '$a', destino: 'respuesta' }],
    posicion_final: { leaf_id: 'l3', camino: ['l1', 'l2'] },
  }, new Map([['l1', 'Q'], ['l2', 'Grande'], ['l3', 'Start']]));
  assert.match(out, /- script doble ok 40ms · entradas n=30, vacia=\(sin valor\) · guardó doble→edad_doble=60/);
  assert.match(out, /- sql saldo error · entradas email=a@b\.c · no guardó nada · con valores de respaldo · error: connection refused/);
  assert.match(out, /reglas: Cond: se cumplió \$x > 1 → va a Grande \| Q: ninguna regla se cumplió .* \| R: se cumplió \$a → cambió lo que dice/);
  assert.match(out, /recorrido: Q › Grande › Start/);
});

test('un turno sin depuración se resume como antes', () => {
  const out = simulationSummary({ response: { type: 'text', value: 'Hola' }, intent: 'saludo', session_id: 's' });
  assert.ok(!out.includes('herramientas') && !out.includes('reglas:') && !out.includes('recorrido'));
});
