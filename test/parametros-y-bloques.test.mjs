// Lo que el MCP manda al guardar parámetros de intención y respuestas de plantilla tiene la
// misma forma que guarda el editor de la app: si no, el backend descarta campos sin avisar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIntentParams, normalizeTemplateResponses } from '../dist/client/treeflowClient.js';
import { templateLine } from '../dist/tools/resumen.js';
import { conHttp, texto } from './helpers.mjs';
import * as fx from './fixtures.mjs';

// La lista de entidades del backend trae también las de sistema, con el nombre como ID.
const entidades = [...fx.entities, { id: 'sys.number', name: 'sys.number', type: 'system' }];
const T = fx.TREE_ID;

// ── Parámetros de intención ──────────────────────────────────────────────────

test('un parámetro de sistema se guarda con la entidad en name, key y entityId, y la variable en parameterName', () => {
  assert.deepEqual(
    normalizeIntentParams([{ parameterName: 'cantidad', entity: 'sys.number', required: true, prompt: '¿Cuántos?' }]),
    [{ name: 'sys.number', key: 'sys.number', entityId: 'sys.number', parameterName: 'cantidad', required: true, prompt: '¿Cuántos?' }]
  );
});

test('una entidad del bot se resuelve a su ID por nombre, con @, sin distinguir mayúsculas o por el ID mismo', () => {
  for (const entity of ['producto', '@producto', 'Producto', 'ent-producto']) {
    const [p] = normalizeIntentParams([{ parameterName: 'bebida', entity }], entidades);
    assert.deepEqual([p.name, p.key, p.entityId, p.parameterName], ['producto', 'ent-producto', 'ent-producto', 'bebida'], entity);
  }
  const [sinVariable] = normalizeIntentParams([{ entity: 'producto' }], entidades);
  assert.equal(sinVariable.parameterName, 'producto', 'sin parameterName, la variable se llama como la entidad');
});

test('acepta la forma guardada (copiada de get_detail) sin cambiarla y la vieja { name, entity_name }', () => {
  const guardado = fx.intents[1].entities;
  assert.deepEqual(normalizeIntentParams(guardado, entidades), guardado);
  const [viejo] = normalizeIntentParams([{ name: 'gusto', entity_name: '@producto' }], entidades);
  assert.deepEqual([viejo.name, viejo.key, viejo.parameterName], ['producto', 'ent-producto', 'gusto']);
  assert.equal('entity_name' in viejo, false, 'el backend no lo conoce');
});

test('una entidad que no existe o que falta es error, no un parámetro sin entidad', () => {
  assert.throws(() => normalizeIntentParams([{ parameterName: 'x', entity: 'color' }], entidades),
    /No existe la entidad "color" en este bot\. Entidades: producto, codigo_postal;/);
  assert.throws(() => normalizeIntentParams([{ parameterName: 'x', required: true }], entidades), /Al parámetro x le falta entity/);
});

test('create_intent resuelve las entidades leyéndolas una sola vez por lote', async () => {
  const { tools, sent } = await conHttp({ [`/trees/${T}/entities`]: entidades });
  const out = texto(await tools.create_intent.handler({
    tree_id: T,
    intents: [
      { name: 'pedir', patterns: ['quiero pedir'], entities: [{ parameterName: 'bebida', entity: 'producto', required: true, prompt: '¿Qué te sirvo?' }] },
      { name: 'contar', patterns: ['quiero contar'], entities: [{ parameterName: 'n', entity: 'sys.number' }] },
    ],
  }));
  assert.match(out, /^Intenciones creadas: 2 de 2\n- pedir \[[^\]]+\] · 1 frases · parámetros: bebida\*\n- contar .* parámetros: n$/);
  assert.equal(sent.filter((s) => s.method === 'GET').length, 1);
  const [pedir, contar] = sent.filter((s) => s.method === 'POST').map((s) => s.body.entities[0]);
  assert.deepEqual(pedir, { name: 'producto', key: 'ent-producto', entityId: 'ent-producto', parameterName: 'bebida', required: true, prompt: '¿Qué te sirvo?' });
  assert.equal(contar.key, 'sys.number');
});

test('create_intent con sólo entidades de sistema no lee las del bot; con una que no existe, falla sólo esa', async () => {
  const { tools, sent } = await conHttp({ [`/trees/${T}/entities`]: entidades });
  await tools.create_intent.handler({ tree_id: T, intents: [{ name: 'contar', patterns: ['x'], entities: [{ entity: 'sys.number' }] }] });
  assert.equal(sent.filter((s) => s.method === 'GET').length, 0);

  const out = texto(await tools.create_intent.handler({
    tree_id: T,
    intents: [{ name: 'mala', patterns: ['x'], entities: [{ entity: 'color' }] }, { name: 'buena', patterns: ['y'] }],
  }));
  assert.match(out, /^Intenciones creadas: 1 de 2 \(1 con error\)\n- ✘ mala: No existe la entidad "color"/);
});

test('update_intent con entities: un parámetro que ya existía conserva lo que no se mandó', async () => {
  const intent = fx.intents[1];
  const { tools, sent } = await conHttp({ [`/trees/${T}/intents/${intent.id}`]: intent, [`/trees/${T}/entities`]: entidades });
  await tools.update_intent.handler({
    tree_id: T, intent_id: intent.id,
    entities: [{ parameterName: 'producto', required: false }, { parameterName: 'cantidad', entity: 'sys.number', required: true, prompt: '¿Cuántos?' }],
  });
  const [producto, cantidad] = sent.at(-1).body.entities;
  assert.deepEqual(producto, { ...intent.entities[0], required: false }, 'conserva entidad, pregunta, respaldo y límite');
  assert.deepEqual(cantidad, { name: 'sys.number', key: 'sys.number', entityId: 'sys.number', parameterName: 'cantidad', required: true, prompt: '¿Cuántos?' });
});

test('update_intent con una entidad que no existe no guarda nada', async () => {
  const intent = fx.intents[1];
  const { tools, sent } = await conHttp({ [`/trees/${T}/intents/${intent.id}`]: intent, [`/trees/${T}/entities`]: entidades });
  await assert.rejects(
    tools.update_intent.handler({ tree_id: T, intent_id: intent.id, entities: [{ parameterName: 'color', entity: 'color' }] }),
    /No existe la entidad "color"/
  );
  assert.equal(sent.filter((s) => s.method === 'PUT').length, 0);
});

// ── Respuestas de plantilla ──────────────────────────────────────────────────

test('save_message_template con sólo text crea un bloque { type: "text", value }', async () => {
  const { tools, sent } = await conHttp({});
  await tools.save_message_template.handler({ tree_id: T, name: 'hola', text: 'Hola {$nombre}' });
  assert.deepEqual(sent.at(-1).body, { name: 'hola', text: 'Hola {$nombre}', responses: [{ type: 'text', value: 'Hola {$nombre}' }] });
});

test('los bloques sueltos van juntos dentro de un payload, con los campos que pone el editor', () => {
  assert.deepEqual(
    normalizeTemplateResponses([
      { type: 'paragraph', text: '¿Qué deseas?' },
      { type: 'buttons', items: ['Ver menú', { label: 'Web', url: 'https://x.com' }] },
      { type: 'image', items: [{ url: 'https://x.com/a.png' }], platform: 'web' },
    ]),
    [
      {
        type: 'payload',
        value: [
          { type: 'paragraph', align: 'vertical', items: [{ text: '¿Qué deseas?' }] },
          {
            type: 'buttons', align: 'vertical', layout: 'vertical',
            items: [{ label: 'Ver menú', type: 'text', payload: 'Ver menú' }, { label: 'Web', url: 'https://x.com', type: 'link', payload: 'https://x.com' }],
          },
        ],
      },
      { type: 'payload', value: [{ type: 'image', align: 'vertical', layout: 'single', items: [{ url: 'https://x.com/a.png' }] }], platform: 'web' },
    ]
  );
});

test('{ type: "text", text } se corrige a value, y lo que ya está bien no cambia', () => {
  assert.deepEqual(normalizeTemplateResponses([{ type: 'text', text: 'hola', platform: 'telegram' }]), [{ type: 'text', value: 'hola', platform: 'telegram' }]);
  assert.deepEqual(normalizeTemplateResponses(fx.templates[0].responses), fx.templates[0].responses);
  const guardado = { type: 'payload', platform: 'web', value: [{ type: 'buttons', align: 'vertical', layout: 'vertical', items: [{ type: 'link', label: 'Ir', payload: 'https://x.com' }] }] };
  assert.deepEqual(normalizeTemplateResponses([guardado]), [guardado]);
});

test('un tipo desconocido o un bloque sin items es error que remite a la guía', () => {
  assert.throws(() => normalizeTemplateResponses([{ type: 'boton', items: [] }]), /Respuesta desconocida "boton".*treeflow_guide\("bloques"\)/);
  assert.throws(() => normalizeTemplateResponses([{ type: 'buttons', buttons: ['a'] }]), /El bloque buttons necesita items/);
  assert.throws(() => normalizeTemplateResponses([{ type: 'payload', value: [{ type: 'tabla', items: [] }] }]), /Bloque desconocido "tabla"/);
});

test('crear sin text el texto sale del bloque de texto general, como en el editor; sin nada es error', async () => {
  const { tools, sent } = await conHttp({});
  await tools.save_message_template.handler({ tree_id: T, name: 'menu', responses: [{ type: 'text', value: 'Hola' }, { type: 'buttons', items: ['Menú'] }] });
  assert.equal(sent.at(-1).body.text, 'Hola');
  await tools.save_message_template.handler({ tree_id: T, name: 'menu2', responses: [{ type: 'buttons', items: ['Menú'] }] });
  assert.equal(sent.at(-1).body.text, '', 'ya no usa el nombre de la plantilla como texto');
  await assert.rejects(tools.save_message_template.handler({ tree_id: T, name: 'vacia' }), /hace falta text o responses/);
});

test('cambiar sólo el texto cambia también el bloque de texto general, que es el que dice el bot', async () => {
  const tpl = {
    ...fx.templates[0],
    responses: [
      { type: 'text', value: 'Precio viejo' },
      { type: 'payload', platform: 'web', value: [{ type: 'paragraph', align: 'vertical', items: [{ text: 'web' }] }] },
    ],
  };
  const { tools, sent } = await conHttp({ [`/design/messages/${tpl.id}`]: tpl });
  await tools.save_message_template.handler({ tree_id: T, template_id: tpl.id, text: 'Precio nuevo' });
  const { body } = sent.at(-1);
  assert.equal(body.text, 'Precio nuevo');
  assert.deepEqual(body.responses, [{ type: 'text', value: 'Precio nuevo' }, tpl.responses[1]]);
});

test('modificar con responses y sin text recalcula el texto; sin text ni responses no lee nada', async () => {
  const { tools, sent } = await conHttp({});
  await tools.save_message_template.handler({ tree_id: T, template_id: 'tpl-1', responses: [{ type: 'text', text: 'Nuevo' }] });
  assert.deepEqual(sent.at(-1).body, { text: 'Nuevo', responses: [{ type: 'text', value: 'Nuevo' }] });
  await tools.save_message_template.handler({ tree_id: T, template_id: 'tpl-1', name: 'otro' });
  assert.deepEqual(sent.at(-1), { method: 'PUT', url: '/design/messages/tpl-1', body: { name: 'otro' } });
});

test('el resumen de una plantilla nombra los bloques que hay dentro del payload', () => {
  const line = templateLine({ id: 't', name: 'menu', responses: normalizeTemplateResponses([{ type: 'paragraph', text: 'x' }, { type: 'buttons', items: ['a'] }]) });
  assert.equal(line, '- menu [t] · bloques: paragraph, buttons');
});
