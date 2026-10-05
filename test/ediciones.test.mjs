// Fase 2: editar manda sólo lo que cambia y nunca borra ni pisa lo que no se mencionó.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTools } from '../dist/catalog.js';
import { mergeConfig, editList, maskUrl, unmaskUrl, maskSecrets } from '../dist/client/treeflowClient.js';
import { clienteFalso } from './helpers.mjs';
import * as fx from './fixtures.mjs';

/** Cliente con un HTTP falso: GET responde desde `routes`; PUT/POST se registran en `sent`. */
function conHttp(routes) {
  const client = clienteFalso();
  const sent = [];
  const respond = (url) => {
    for (const [pattern, data] of Object.entries(routes)) if (url === pattern) return { data: structuredClone(data) };
    throw new Error(`GET sin simular: ${url}`);
  };
  client.client = {
    get: async (url) => respond(url),
    put: async (url, body) => (sent.push({ method: 'PUT', url, body }), { data: body }),
    post: async (url, body) => (sent.push({ method: 'POST', url, body }), { data: body }),
    delete: async (url) => (sent.push({ method: 'DELETE', url }), { data: {} }),
  };
  const tools = Object.fromEntries(buildTools(client).map((t) => [t.name.replace('treeflow_', ''), t]));
  return { tools, sent };
}

const saludo = fx.branches[0].leaves[1];

test('mergeConfig: lo enviado pisa, null borra, lo demás se conserva', () => {
  assert.deepEqual(mergeConfig({ a: 1, b: 2, c: 3 }, { b: 20, c: null, d: 4 }), { a: 1, b: 20, d: 4 });
});

test('editList: añade sin duplicar y quita por texto', () => {
  assert.deepEqual(editList(['hola', 'buenas'], ['hey', 'hola '], ['buenas']), ['hola', 'hey']);
});

test('update_leaf con branch_id combina el config: cambiar el texto conserva intents, nextLeafId y customResponses', async () => {
  const { tools, sent } = conHttp({ '/design/branches/rama-1': fx.branches[0] });
  await tools.update_leaf.handler({ leaf_id: saludo.id, branch_id: 'rama-1', config: { messageText: 'Hola de nuevo' } });
  const { body } = sent.at(-1);
  assert.equal(body.config.messageText, 'Hola de nuevo');
  assert.equal(body.config.nextLeafId, 'hoja-menu');
  assert.equal(body.config.intentName, 'saludo');
  assert.deepEqual(body.config.customResponses, saludo.config.customResponses);
});

test('update_leaf con tree_id busca la hoja en todas las ramas', async () => {
  const { tools, sent } = conHttp({ [`/design/${fx.TREE_ID}/branches`]: fx.branches });
  await tools.update_leaf.handler({ leaf_id: 'hoja-menu', tree_id: fx.TREE_ID, config: { description: 'menú' } });
  assert.deepEqual(sent.at(-1).body.config.intents, fx.branches[1].leaves[0].config.intents);
});

test('update_leaf con config pero sin rama ni bot se niega antes que borrar', async () => {
  const { tools, sent } = conHttp({});
  await assert.rejects(tools.update_leaf.handler({ leaf_id: saludo.id, config: { messageText: 'x' } }), /hace falta branch_id o tree_id/);
  assert.equal(sent.length, 0);
});

test('update_leaf con replace_config sustituye sin leer; sin config no lee nada', async () => {
  const { tools, sent } = conHttp({});
  await tools.update_leaf.handler({ leaf_id: saludo.id, config: { messageText: 'sólo esto' }, replace_config: true });
  assert.deepEqual(sent.at(-1).body.config, { messageText: 'sólo esto' });
  await tools.update_leaf.handler({ leaf_id: saludo.id, position_x: 50 });
  assert.deepEqual(sent.at(-1).body, { position_x: 50 });
});

test('update_intent: add_patterns/remove_patterns sin mandar la lista, y sin displayPatterns viejas', async () => {
  const intent = fx.intents[0];
  const { tools, sent } = conHttp({ [`/trees/${fx.TREE_ID}/intents/${intent.id}`]: intent });
  await tools.update_intent.handler({ tree_id: fx.TREE_ID, intent_id: intent.id, add_patterns: ['qué tal'], remove_patterns: ['buenas'] });
  const { body } = sent.at(-1);
  assert.deepEqual(body.patterns, ['hola', 'qué tal']);
  assert.equal(body.displayPatterns, undefined, 'el backend las regenera');
});

test('update_intent que no toca las frases conserva sus displayPatterns', async () => {
  const intent = fx.intents[1];
  const { tools, sent } = conHttp({ [`/trees/${fx.TREE_ID}/intents/${intent.id}`]: intent });
  await tools.update_intent.handler({ tree_id: fx.TREE_ID, intent_id: intent.id, name: 'precio' });
  assert.deepEqual(sent.at(-1).body.displayPatterns, intent.displayPatterns);
  assert.deepEqual(sent.at(-1).body.entities, intent.entities);
});

test('update_entity: add_values suma sinónimos a un valor existente; remove_values lo quita', async () => {
  const ent = fx.entities[0];
  const { tools, sent } = conHttp({ [`/entities/${fx.TREE_ID}/${ent.id}`]: ent });
  await tools.update_entity.handler({
    tree_id: fx.TREE_ID, entity_id: ent.id,
    add_values: [{ key: 'café', synonyms: ['café de olla'] }, { key: 'chocolate' }], remove_values: ['té'],
  });
  assert.deepEqual(sent.at(-1).body.values, [
    { key: 'café', synonyms: ['cafecito', 'café de olla'] },
    { key: 'chocolate', synonyms: [] },
  ]);
});

test('configure_integration guarda la config plana dentro del canal, sin borrar lo demás', async () => {
  const { tools, sent } = conHttp({ [`/bots/${fx.TREE_ID}/injertos`]: { injertos: { web: { enabled: true, primaryColor: '#000', widgetTitle: 'Hola' } } } });
  await tools.configure_integration.handler({ tree_id: fx.TREE_ID, integration_key: 'web', enabled: true, config: { primaryColor: '#0a0' } });
  assert.deepEqual(sent.at(-1).body.web, { enabled: true, primaryColor: '#0a0', widgetTitle: 'Hola' });
});

test('maskUrl tapa claves en la URL pero no variables ni parámetros normales', () => {
  assert.equal(maskUrl('https://x.com/a?key=AIza123&lang=es'), 'https://x.com/a?key=***&lang=es');
  assert.equal(maskUrl('https://x.com/a?api_key=1&access_token=2&monkey=3'), 'https://x.com/a?api_key=***&access_token=***&monkey=3');
  assert.equal(maskUrl('https://x.com/a?token={$token}'), 'https://x.com/a?token={$token}');
  assert.equal(unmaskUrl('https://x.com/b?key=***&lang=en', 'https://x.com/a?key=AIza123&lang=es'), 'https://x.com/b?key=AIza123&lang=en');
  assert.equal(maskSecrets({ url: 'https://x.com?token=abc', endpoint_url: 'https://y.com?secret=s' }).endpoint_url, 'https://y.com?secret=***');
});

test('update_tool con la URL o el token enmascarados no pisa los secretos guardados', async () => {
  const config = structuredClone(fx.fertilizers);
  config.additionalFertilizers[0].url = 'https://api.ejemplo.com/precios?key=REAL';
  const { tools, sent } = conHttp({ [`/api/fertilizers/${fx.TREE_ID}`]: config });
  await tools.save_tool.handler({
    tree_id: fx.TREE_ID, tool_id: 'precios',
    url: 'https://api.ejemplo.com/v2/precios?key=***', authConfig: { token: '***' }, timeout: 5000,
  });
  const saved = sent.find((s) => s.method === 'POST').body.additionalFertilizers[0];
  assert.equal(saved.url, 'https://api.ejemplo.com/v2/precios?key=REAL');
  assert.equal(saved.authConfig.token, 'secreto-de-prueba');
  assert.equal(saved.timeout, 5000);
});

test('update_transfer con el token enmascarado conserva el real', async () => {
  const current = { name: 'Asesor', endpoint_url: 'https://help.com/in?token=REAL', auth_token: 'REAL2', is_active: true };
  const { tools, sent } = conHttp({ [`/api/integrations/transfers/${fx.TREE_ID}/cfg-1`]: current });
  await tools.save_transfer.handler({ tree_id: fx.TREE_ID, config_id: 'cfg-1', auth_token: '***', endpoint_url: 'https://help.com/in?token=***', transfer_message: 'Te paso' });
  const { body } = sent.at(-1);
  assert.equal(body.auth_token, 'REAL2');
  assert.equal(body.endpoint_url, 'https://help.com/in?token=REAL');
  assert.equal(body.transfer_message, 'Te paso');
});
