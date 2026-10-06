// Fase 7: IDs cortos y bots por nombre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTools } from '../dist/catalog.js';
import { shortId, shortenText, expandIds, _resetIds } from '../dist/ids.js';
import { clienteFalso, texto } from './helpers.mjs';

const A = '3f2a9c1d-1111-4111-8111-111111111111';
const B = '3f2a9c1d-2222-4222-8222-222222222222'; // mismo prefijo de 8
const C = 'aaaabbbb-3333-4333-8333-333333333333';

test('un UUID se muestra con 8 caracteres; si dos empiezan igual, el segundo usa 12', () => {
  _resetIds();
  assert.equal(shortId(A), '3f2a9c1d');
  assert.equal(shortId(B), '3f2a9c1d2222');
  assert.equal(shortId(A), '3f2a9c1d', 'el mismo UUID siempre da el mismo corto');
  assert.equal(shortenText(`hoja [${A}] → [${C}]`), 'hoja [3f2a9c1d] → [aaaabbbb]');
});

test('los cortos registrados se expanden a cualquier profundidad; los UUID completos pasan igual', () => {
  _resetIds();
  shortenText(`${A} ${C}`);
  assert.deepEqual(
    expandIds({ leaf_id: '3f2a9c1d', config: { nextLeafId: 'aaaabbbb', intents: [{ name: 'x', targetLeafId: '3F2A9C1D' }], toolIds: ['aaaabbbb'] }, otro: C }),
    { leaf_id: A, config: { nextLeafId: C, intents: [{ name: 'x', targetLeafId: A }], toolIds: [C] }, otro: C }
  );
});

test('un corto desconocido en un campo de ID es un error claro; en un texto se deja', () => {
  _resetIds();
  assert.throws(() => expandIds({ leaf_id: 'deadbeef' }), /No reconozco el ID corto "deadbeef" \(leaf_id\)/);
  assert.throws(() => expandIds({ config: { nextLeafId: 'deadbeef' } }), /nextLeafId/);
  assert.deepEqual(expandIds({ messageText: 'deadbeef' }), { messageText: 'deadbeef' });
});

test('las herramientas devuelven IDs cortos y aceptan de vuelta los cortos y el nombre del bot', async () => {
  _resetIds();
  const TREE = '0a1b2c3d-4444-4444-8444-444444444444';
  const LEAF = '5e6f7a8b-5555-4555-8555-555555555555';
  let pedido;
  const client = clienteFalso({
    listTrees: async () => [{ tree_id: TREE, name: 'Mi Bot' }],
    listBranches: async (treeId) => ((pedido = treeId), [{ id: 'r1', name: 'R', leaves: [{ id: LEAF, name: 'Hoja', type: 'intent', config: {} }] }]),
  });
  const detail = buildTools(client).find((t) => t.name === 'treeflow_get_detail');
  // Por nombre del bot (sin importar mayúsculas)
  const out = texto(await detail.handler({ tree_id: 'mi bot', tipo: 'leaf', ref: 'Hoja' }));
  assert.equal(pedido, TREE);
  assert.ok(out.includes('"id":"5e6f7a8b"') && !out.includes(LEAF), 'la salida lleva el ID corto');
  // Y el corto que acaba de ver sirve de vuelta, también para el bot
  pedido = undefined;
  await detail.handler({ tree_id: '0a1b2c3d', tipo: 'leaf', ref: '5e6f7a8b' });
  assert.equal(pedido, TREE);
});

test('un bot que no existe o con nombre repetido se dice claro', async () => {
  const client = clienteFalso({ listTrees: async () => [{ tree_id: 'x', name: 'Dup' }, { tree_id: 'y', name: 'dup' }] });
  const detail = buildTools(client).find((t) => t.name === 'treeflow_get_detail');
  await assert.rejects(detail.handler({ tree_id: 'Nada', tipo: 'leaf', ref: 'x' }), /No existe un bot llamado "Nada"/);
  await assert.rejects(detail.handler({ tree_id: 'DUP', tipo: 'leaf', ref: 'x' }), /Hay 2 bots llamados "DUP"/);
});
