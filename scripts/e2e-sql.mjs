#!/usr/bin/env node
/**
 * Las herramientas SQL contra una base REAL, de punta a punta: conexión, consultas, variables como parámetros,
 * salidas, un nodo que las usa y la conversación. El e2e-dev.mjs sólo cubre lo que no necesita llegar a una base,
 * porque el backend sólo se conecta a direcciones públicas.
 *
 * Para correrlo hace falta un backend de DESARROLLO con SQL_PERMITIR_RED_PRIVADA=true y una base desechable con
 *   CREATE TABLE usuarios(id ..., email VARCHAR(100), nombre VARCHAR(100), saldo DECIMAL(10,2));
 *   INSERT INTO usuarios(email, nombre, saldo) VALUES ('ana@x.com', 'Ana', 150.50), ('luis@x.com', 'Luis', 20);
 *
 * Uso (después de npm run build), con uno o los dos motores:
 *   TREEFLOW_E2E_PG_HOST=192.168.1.10 TREEFLOW_E2E_MYSQL_HOST=192.168.1.11 node scripts/e2e-sql.mjs
 * Opcionales: *_PORT, TREEFLOW_E2E_SQL_DB (default clientes), _USER (app), _PASSWORD (pw).
 * Crea su propio bot "MCP pruebas SQL (Claude)" y lo borra al terminar.
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

const env = process.env;
const engines = [
  env.TREEFLOW_E2E_PG_HOST && { motor: 'postgres', host: env.TREEFLOW_E2E_PG_HOST, puerto: Number(env.TREEFLOW_E2E_PG_PORT || 5432), nombre: 'pg', contiene: "ILIKE '%' || {$q} || '%'" },
  env.TREEFLOW_E2E_MYSQL_HOST && { motor: 'mysql', host: env.TREEFLOW_E2E_MYSQL_HOST, puerto: Number(env.TREEFLOW_E2E_MYSQL_PORT || 3306), nombre: 'maria', contiene: "LIKE CONCAT('%', {$q}, '%')" },
].filter(Boolean);
if (!engines.length) {
  console.error('Define TREEFLOW_E2E_PG_HOST y/o TREEFLOW_E2E_MYSQL_HOST (ver la cabecera del script).');
  process.exit(2);
}
const base = env.TREEFLOW_E2E_SQL_DB || 'clientes';
const usuario = env.TREEFLOW_E2E_SQL_USER || 'app';
const password = env.TREEFLOW_E2E_SQL_PASSWORD || 'pw';

const client = new TreeflowClient();
const tools = Object.fromEntries(buildTools(client).map((t) => [t.name.replace('treeflow_', ''), t]));
const call = async (name, args) => (await tools[name].handler(args)).content.map((c) => c.text).join('');
const json = async (name, args) => JSON.parse(await call(name, args));
const step = (msg) => console.log(`✔ ${msg}`);

const BOT = 'MCP pruebas SQL (Claude)';
for (const t of (await client.listTrees()).filter((x) => x.name === BOT)) await client.client.delete(`/trees/${t.tree_id}`);
await client.createTree({ name: BOT, purpose: 'general' });
const T = (await client.listTrees()).find((t) => t.name === BOT).tree_id;

try {
  for (const e of engines) {
    await call('save_sql_connection', { tree_id: T, nombre: e.nombre, motor: e.motor, host: e.host, puerto: e.puerto, base, usuario, password });
    assert.equal((await json('test_sql_connection', { tree_id: T, connection_ref: e.nombre })).ok, true);
    // Sin password y sin cambiar adónde se conecta, se conserva la guardada
    await call('save_sql_connection', { tree_id: T, connection_ref: e.nombre, ssl: false });
    assert.equal((await json('test_sql_connection', { tree_id: T, connection_ref: e.nombre })).ok, true);
    assert.doesNotMatch(await call('list_sql', { tree_id: T }), new RegExp(password));
    step(`${e.motor}: conexión creada, probada, y la contraseña se conserva sin mandarla (y no sale en list_sql)`);

    await call('save_sql_query', {
      tree_id: T, name: `saldo_${e.nombre}`, connection: e.nombre, sql: 'SELECT nombre, saldo FROM usuarios WHERE email = {$email} LIMIT 1',
      inputVariables: [{ name: 'email', testValue: 'ana@x.com' }], outputVariables: [{ name: 'nombre' }, { name: 'saldo' }, { name: 'total', jsonPath: 'total' }],
    });
    const hay = await json('test_sql_query', { tree_id: T, query_ref: `saldo_${e.nombre}` });
    assert.equal(hay.estado, 'ok');
    assert.deepEqual(hay.results, { nombre: 'Ana', saldo: 150.5, total: 1 });
    assert.deepEqual(hay.payload, { p_email: 'ana@x.com' }, 'la variable viaja como parámetro');
    const nada = await json('test_sql_query', { tree_id: T, query_ref: `saldo_${e.nombre}`, test_values: { email: "' OR 1=1 --" } });
    assert.deepEqual(nada.results, { total: 0 }, 'un texto raro sólo es un dato: no trae filas');
    await call('save_sql_query', {
      tree_id: T, name: `contiene_${e.nombre}`, connection: e.nombre, sql: `SELECT COUNT(*) AS n FROM usuarios WHERE nombre ${e.contiene}`,
      inputVariables: [{ name: 'q', testValue: 'an' }], outputVariables: [{ name: 'n' }],
    });
    assert.deepEqual((await json('test_sql_query', { tree_id: T, query_ref: `contiene_${e.nombre}` })).results, { n: 1 });
    step(`${e.motor}: una consulta con salidas por columna y por total, una inyección que no hace nada y un «contiene» con la sintaxis del motor`);
  }

  // En un nodo: la consulta corre y su salida decide el camino (Postgres si hay, si no el primero)
  const e = engines[0];
  const q = (await client.getSql(T)).consultas.find((x) => x.name === `saldo_${e.nombre}`);
  const rama = await call('create_branch', { tree_id: T, name: 'R sql' });
  const branchId = rama.match(/Rama "[^"]+" \[([^\]]+)\]/)[1];
  const startId = rama.match(/- Start \([^)]*\) \[([^\]]+)\]/)[1];
  await call('create_intent', { tree_id: T, intents: [{ name: 'saldo', patterns: ['mi saldo', 'consultar saldo'], entities: [{ parameterName: 'email', entity: 'sys.email', required: true, prompt: '¿Tu correo?' }] }] });
  await call('create_leaf', {
    branch_id: branchId,
    leaves: [
      { ref: 'ok', leaf_type: 'intent', name: 'Existe', config: { isCustomResponse: true, messageText: 'Hola {$nombre}, tu saldo es {$saldo}' } },
      { ref: 'no', leaf_type: 'intent', name: 'NoExiste', config: { isCustomResponse: true, messageText: 'No te encuentro' } },
      { ref: 's', leaf_type: 'intent', name: 'Saldo', config: { intentName: 'saldo', isCustomResponse: true, messageText: 'x', toolIds: [q.id], rules: [{ name: 'encontrado', expression: '$total > 0', targetLeafId: 'ref:ok' }], nextLeafId: 'ref:no' } },
    ],
    connect: [{ from: startId, name: 'saldo', to: 'ref:s' }],
  });
  const main = (await client.listBranches(T)).find((b) => b.is_default);
  const saldoLeaf = (await client.listBranches(T)).flatMap((b) => b.leaves).find((l) => l.name === 'Saldo');
  await call('update_leaf', { leaf_id: main.start_leaf_id, branch_id: main.id, add_routes: [{ name: 'saldo', targetLeafId: saldoLeaf.id }] });
  await call('trigger_training', { tree_id: T });
  const dice = async (correo) => {
    const a = await call('simulate_message', { tree_id: T, message: 'mi saldo' });
    return call('simulate_message', { tree_id: T, message: correo, session_id: a.match(/session_id: (\S+)/)[1] });
  };
  const si = await dice('ana@x.com');
  assert.match(si, /^Bot: "Hola Ana, tu saldo es 150\.5"/);
  assert.match(si, /- sql saldo_\w+ ok \d+ms · entradas email=ana@x\.com · guardó nombre=Ana, saldo=150\.5, total=1/);
  assert.match(si, /se cumplió \$total > 0 → va a Existe/);
  const no = await dice('nadie@x.com');
  assert.match(no, /^Bot: "No te encuentro"/);
  assert.match(no, /ninguna regla se cumplió/);
  step('el bot consulta la base, usa las salidas en el mensaje y la regla de la Transición elige el camino (y simulate_message lo cuenta)');
} finally {
  await client.client.delete(`/trees/${T}`).then(() => console.log('Bot de pruebas borrado.')).catch((e) => console.log('NO se pudo borrar el bot de pruebas:', e.message));
}
console.log('\nTodo bien.');
