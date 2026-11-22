// Condiciones guardadas y reglas de los nodos: la forma que guarda el editor, sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRules } from '../dist/client/treeflowClient.js';
import { leafLine, canvasNames, treeHeader } from '../dist/tools/resumen.js';
import { GUIDE } from '../dist/tools/guide.js';
import { conHttp } from './helpers.mjs';
import * as fx from './fixtures.mjs';

const CID = '11111111-1111-4111-8111-111111111111';
const mayor = { condicion_id: CID, tree_id: fx.TREE_ID, name: 'Mayor de edad', expression: '$edad >= 18', description: null, usos: 2 };

test('normalizeRules: da id a cada regla y resuelve la condición por nombre o ID, sin diferenciar mayúsculas', () => {
  const out = normalizeRules({
    messageText: 'x',
    respuestasCondicionales: [{ condicion: 'mayor DE edad', messageText: 'Pasa' }],
    rules: [{ condicion: CID, targetLeafId: 'a' }, { id: 'mia', expression: '$x == 1', targetLeafId: 'b' }],
  }, [mayor]);
  assert.equal(out.respuestasCondicionales[0].condicionId, CID);
  assert.equal(out.respuestasCondicionales[0].condicion, undefined, 'condicion es sólo para el MCP: no se guarda');
  assert.match(out.respuestasCondicionales[0].id, /^rr_/);
  assert.equal(out.rules[0].condicionId, CID);
  assert.match(out.rules[0].id, /^regla_/);
  assert.equal(out.rules[1].id, 'mia');
  assert.equal(out.messageText, 'x');
});

test('normalizeRules: una condición que no existe dice cuáles hay', () => {
  assert.throws(() => normalizeRules({ rules: [{ condicion: 'nada', targetLeafId: 'a' }] }, [mayor]), /No existe la condición guardada "nada"\. Hay: Mayor de edad/);
});

test('update_leaf con una condición por nombre lee las condiciones del bot y guarda condicionId', async () => {
  const { tools, sent } = await conHttp({
    '/design/branches/rama-1': fx.branches[0],
    [`/api/condiciones/tree/${fx.TREE_ID}`]: [mayor],
  });
  await tools.update_leaf.handler({
    leaf_id: 'hoja-saludo', branch_id: 'rama-1',
    config: { respuestasCondicionales: [{ condicion: 'Mayor de edad', messageText: 'Pasa' }] },
  });
  const { body } = sent.at(-1);
  assert.equal(body.config.respuestasCondicionales[0].condicionId, CID);
  assert.equal(body.config.intentName, 'saludo', 'conserva el resto del config');
});

test('update_leaf sin nombres de condición no consulta las condiciones', async () => {
  const { tools, sent } = await conHttp({ '/design/branches/rama-1': fx.branches[0] });
  await tools.update_leaf.handler({ leaf_id: 'hoja-saludo', branch_id: 'rama-1', config: { rules: [{ expression: '$a == 1', targetLeafId: 'hoja-menu' }] } });
  assert.ok(!sent.some((s) => s.url.includes('condiciones')));
  assert.match(sent.at(-1).body.config.rules[0].id, /^regla_/);
});

test('save_condition: crea con name y expression, modifica por nombre y avisa a cuántos nodos llegó', async () => {
  const { tools, sent } = await conHttp({ [`/api/condiciones/tree/${fx.TREE_ID}`]: [mayor] });
  await tools.save_condition.handler({ tree_id: fx.TREE_ID, name: 'Vip', expression: '$plan == "vip"' });
  assert.deepEqual(sent.at(-1), { method: 'POST', url: `/api/condiciones/tree/${fx.TREE_ID}`, body: { name: 'Vip', expression: '$plan == "vip"' } });
  await assert.rejects(tools.save_condition.handler({ tree_id: fx.TREE_ID, name: 'Sin expresión' }), /hacen falta name y expression/);
  const out = await tools.save_condition.handler({ tree_id: fx.TREE_ID, condition_ref: 'mayor de edad', expression: '$edad >= 21' });
  assert.deepEqual(sent.at(-1), { method: 'PUT', url: `/api/condiciones/${CID}`, body: { expression: '$edad >= 21' } });
  assert.match(out.content[0].text, /^Condición actualizada, \d+ nodo\(s\) al día/);
});

test('delete tipo condition acepta el nombre y cuenta los nodos que quedan con regla propia', async () => {
  const { tools, sent } = await conHttp({ [`/api/condiciones/tree/${fx.TREE_ID}`]: [mayor] });
  const out = await tools.delete.handler({ tree_id: fx.TREE_ID, tipo: 'condition', ref: 'Mayor de edad' });
  assert.deepEqual(sent.at(-1), { method: 'DELETE', url: `/api/condiciones/${CID}` });
  assert.match(out.content[0].text, /^Borrado: condition Mayor de edad/);
});

test('leafLine muestra las reglas, el «si no» y treeHeader los condicionales', () => {
  const leaf = {
    id: 'l1', name: 'Nodo', type: 'intent',
    config: {
      messageText: 'Normal',
      respuestasCondicionales: [{ name: 'Mayor', expression: '$edad >= 18', messageText: 'x' }, { expression: '$vip == true', messageText: 'y' }],
      rules: [{ expression: '$n == 5', targetLeafId: 'hoja-menu' }],
      elseLeafId: 'hoja-saludo',
    },
  };
  const names = canvasNames(fx.branches);
  const line = leafLine(leaf, names);
  assert.match(line, /respuestas si: Mayor, \$vip == true/);
  assert.match(line, /reglas: \$n == 5→Menu/);
  assert.match(line, /si no→Saludo/);
  assert.match(treeHeader({ name: 'B', tree_id: 'x', condicionales: true }), /condicionales/);
});

test('la guía de condiciones existe y está enlazada desde las hojas', () => {
  assert.match(GUIDE.condiciones, /respuestasCondicionales/);
  assert.match(GUIDE.condiciones, /config\.rules/);
});
