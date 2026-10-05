// Fase 4: menos vueltas. Crear en lote y entrenar esperando el resultado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTools } from '../dist/catalog.js';
import { resolveRefs } from '../dist/tools/leafs.js';
import { clienteFalso, texto } from './helpers.mjs';
import * as fx from './fixtures.mjs';

const herramientas = (client) => Object.fromEntries(buildTools(client).map((t) => [t.name.replace('treeflow_', ''), t]));

test('resolveRefs sustituye "ref:x" a cualquier profundidad y rechaza un ref desconocido', () => {
  const ids = new Map([['menu', 'id-menu'], ['precio', 'id-precio']]);
  assert.deepEqual(
    resolveRefs({ nextLeafId: 'ref:menu', intents: [{ name: 'precios', targetLeafId: 'ref:precio' }], texto: 'ref sin dos puntos' }, ids),
    { nextLeafId: 'id-menu', intents: [{ name: 'precios', targetLeafId: 'id-precio' }], texto: 'ref sin dos puntos' }
  );
  assert.throws(() => resolveRefs({ nextLeafId: 'ref:nada' }, ids), /"ref:nada" no corresponde a ninguna hoja/);
});

test('create_leaf crea varias hojas enlazadas entre sí en una llamada, con los IDs asignados antes', async () => {
  const sent = [];
  const tools = herramientas(clienteFalso({
    createLeaf: async (branchId, data) => (sent.push(data), { ...data, name: data.name, type: data.type, branch_id: branchId }),
  }));
  const out = texto(await tools.create_leaf.handler({
    branch_id: 'rama-1',
    leaves: [
      { ref: 'menu', leaf_type: 'trigger_context', name: 'Menu', config: { intents: [{ name: 'precios', targetLeafId: 'ref:precio' }] } },
      { ref: 'precio', leaf_type: 'intent', name: 'Precio', config: { intentName: 'consultar_precio', messageText: 'Cuesta 30', nextLeafId: 'ref:menu' } },
    ],
  }));
  const [menu, precio] = sent;
  assert.ok(menu.id && precio.id && menu.id !== precio.id);
  assert.equal(menu.config.intents[0].targetLeafId, precio.id);
  assert.equal(precio.config.nextLeafId, menu.id);
  assert.deepEqual([menu.position_x, precio.position_x], [0, 320], 'sin posición se colocan en fila');
  assert.match(out, /^Hojas creadas \(2\):\n- Menu \(trigger_context\) \[[^\]]+\] · escucha: precios→Precio\n- Precio \(intent\) .* · → Menu$/);
});

test('create_leaf con un ref roto no crea nada', async () => {
  let calls = 0;
  const tools = herramientas(clienteFalso({ createLeaf: async () => (calls++, {}) }));
  await assert.rejects(
    tools.create_leaf.handler({ branch_id: 'r', leaves: [{ leaf_type: 'intent', config: { nextLeafId: 'ref:fantasma' } }] }),
    /"ref:fantasma" no corresponde/
  );
  assert.equal(calls, 0);
});

test('create_leaf que falla a medias dice cuáles ya se crearon', async () => {
  let n = 0;
  const tools = herramientas(clienteFalso({
    createLeaf: async (_, data) => {
      if (++n === 2) throw Object.assign(new Error('400'), { response: { data: { detail: 'tipo inválido' } } });
      return { ...data };
    },
  }));
  await assert.rejects(
    tools.create_leaf.handler({ branch_id: 'r', leaves: [{ name: 'A', leaf_type: 'intent' }, { name: 'B', leaf_type: '??' }] }),
    /Falló la hoja 2 \(B\): tipo inválido\. Ya creadas: A \[/
  );
});

test('create_intent en lote: una que falla no detiene a las demás', async () => {
  const tools = herramientas(clienteFalso({
    createIntent: async (_, i) => {
      if (i.name === 'mala') throw Object.assign(new Error('409'), { response: { data: { detail: 'ya existe' } } });
      return { id: `id-${i.name}`, name: i.name, patterns: i.patterns, entities: [] };
    },
  }));
  const out = texto(await tools.create_intent.handler({
    tree_id: fx.TREE_ID,
    intents: [{ name: 'saludo', patterns: ['hola'] }, { name: 'mala', patterns: ['x'] }, { name: 'adios', patterns: ['bye', 'chao'] }],
  }));
  assert.equal(out, [
    'Intenciones creadas: 2 de 3 (1 con error)',
    '- saludo [id-saludo] · 1 frases',
    '- ✘ mala: ya existe',
    '- adios [id-adios] · 2 frases',
  ].join('\n'));
});

test('create_entity en lote', async () => {
  const tools = herramientas(clienteFalso({ createEntity: async (_, e) => ({ id: `id-${e.name}`, ...e }) }));
  const out = texto(await tools.create_entity.handler({
    tree_id: fx.TREE_ID, entities: [{ name: 'color', values: [{ key: 'rojo' }] }, { name: 'cp', type: 'regex', pattern: '^\\d{5}$' }],
  }));
  assert.match(out, /^Entidades creadas: 2 de 2\n- color \[id-color\] simple · 1 valores: rojo\n- cp \[id-cp\] regex/);
});

test('trigger_training espera a que termine y devuelve el resultado', async () => {
  const states = ['pendiente', 'en_proceso', 'updated'];
  const tools = herramientas(clienteFalso({
    triggerTraining: async () => ({ status: 'queued' }),
    getTrainingStatus: async () => ({ status: states.shift() ?? 'updated', can_use: true }),
    listTrainingHistory: async () => ({ items: [{ changes_summary: { intents_total: 12, entities_total: 3 } }] }),
  }));
  // Sin esperas reales en la prueba
  const real = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => real(fn, 0);
  try {
    const out = texto(await tools.trigger_training.handler({ tree_id: fx.TREE_ID }));
    assert.match(out, /^Entrenamiento terminado en \d+ s · estado updated · can_use true · 12 intenciones, 3 entidades$/);
  } finally {
    globalThis.setTimeout = real;
  }
});

test('trigger_training fuerza por defecto; con force=false el backend puede saltárselo y se dice', async () => {
  let forced;
  const tools = herramientas(clienteFalso({
    triggerTraining: async (_, force) => ((forced = force), { status: force ? 'queued' : 'skipped' }),
    getTrainingStatus: async () => ({ status: 'updated', can_use: true }),
    listTrainingHistory: async () => ({ items: [] }),
  }));
  await tools.trigger_training.handler({ tree_id: fx.TREE_ID });
  assert.equal(forced, true);
  assert.match(texto(await tools.trigger_training.handler({ tree_id: fx.TREE_ID, force: false })), /^El backend no vio cambios y no entrenó/);
});

test('trigger_training que falla trae el error del historial', async () => {
  const tools = herramientas(clienteFalso({
    triggerTraining: async () => ({ status: 'queued' }),
    getTrainingStatus: async () => ({ status: 'error', can_use: false }),
    listTrainingHistory: async () => ({ items: [{ error_message: 'No hay frases', error_phase: 'ml' }] }),
  }));
  assert.match(texto(await tools.trigger_training.handler({ tree_id: fx.TREE_ID })), /FALLIDO .* · can_use false · error en ml: No hay frases/);
});
