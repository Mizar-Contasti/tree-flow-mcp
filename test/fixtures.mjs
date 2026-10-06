// Un bot sintético pequeño con la forma real de la API de Treeflow. No sale de ningún cliente.

export const TREE_ID = '00000000-0000-4000-8000-000000000001';

const leaf = (id, name, type, config = {}, extra = {}) => ({
  id, name, type, config, branch_id: 'rama-1', position_x: 0, position_y: 0, is_start: false,
  created_at: '2026-10-01T10:00:00', updated_at: '2026-10-01T10:00:00', ...extra,
});

export const branches = [
  {
    id: 'rama-1', tree_id: TREE_ID, name: 'Principal', description: 'Flujo de bienvenida', is_default: true,
    start_leaf_id: 'hoja-start', view_x: 0, view_y: 0, view_zoom: 1,
    leaves: [
      leaf('hoja-start', 'Start', 'trigger_context', {
        intents: [{ id: 'i1', name: 'saludo', targetLeafId: 'hoja-saludo' }, { id: 'i2', name: 'precios', targetLeafId: 'hoja-precios' }],
        events: [{ name: 'No_entiendo', targetLeafId: 'hoja-noentiendo' }],
      }, { is_start: true }),
      leaf('hoja-saludo', 'Saludo', 'intent', {
        intentName: 'saludo', isCustomResponse: true, messageText: '¡Hola! Bienvenido a la tienda de pruebas.',
        customResponses: [{ type: 'text', value: '¡Hola! Bienvenido a la tienda de pruebas.' }], nextLeafId: 'hoja-menu',
      }),
      leaf('hoja-precios', 'Precios', 'intent', {
        intentName: 'consultar_precio', isCustomResponse: false, messageTemplateId: 'tpl-precios', toolIds: ['api-precios'],
      }),
      leaf('hoja-noentiendo', 'No entendí', 'event', { eventName: 'sys.no-match', messageText: 'No te entendí.' }),
    ],
  },
  {
    id: 'rama-2', tree_id: TREE_ID, name: 'Menú', is_default: false, start_leaf_id: 'hoja-menu',
    leaves: [leaf('hoja-menu', 'Menu', 'trigger_context', { intents: [{ name: 'precios', targetLeafId: 'hoja-precios' }] }, { branch_id: 'rama-2' })],
  },
];

export const intents = [
  {
    id: 'int-saludo', name: 'saludo', type: 'conversational', patterns: ['hola', 'buenas'], displayPatterns: ['hola', 'buenas'],
    entities: [], tree_id: TREE_ID, created_at: 'x',
  },
  {
    id: 'int-precio', name: 'consultar_precio', type: 'conversational', patterns: ['cuánto cuesta @producto'],
    displayPatterns: ['cuánto cuesta el producto'],
    // Como los guarda el editor: name es la entidad, key/entityId su ID, parameterName la variable.
    entities: [{
      name: 'producto', key: 'ent-producto', entityId: 'ent-producto', parameterName: 'producto',
      required: true, prompt: '¿Qué producto?', capture_id: null, fallback: 'No conozco ese producto', limit: 2,
    }],
  },
];

export const entities = [
  { id: 'ent-producto', name: 'producto', type: 'simple', values: [{ key: 'café', synonyms: ['cafecito'] }, { key: 'té', synonyms: [] }], pattern: null },
  { id: 'ent-cp', name: 'codigo_postal', type: 'regex', values: [], pattern: '^[0-9]{5}$' },
];

export const templates = [
  { id: 'tpl-precios', name: 'respuesta_precios', text: 'El café cuesta {$precio}.', responses: [{ type: 'text', value: 'El café cuesta {$precio}.' }, { type: 'payload', value: '{}' }], tree_id: TREE_ID },
];

export const tree = { tree_id: TREE_ID, name: 'Bot de pruebas', purpose: 'restaurante', primary_language: 'es', nlp_mode: 'basic' };

export const fertilizers = {
  tree_id: TREE_ID,
  mainFertilizer: { enabled: false, url: '' },
  additionalFertilizers: [
    {
      id: 'api-precios', name: 'precios', method: 'GET', url: 'https://api.ejemplo.com/precios', status: 'validated',
      authType: 'bearer', authConfig: { token: 'secreto-de-prueba' },
      inputVariables: [{ name: 'producto' }], outputVariables: [{ name: 'precio', jsonPath: 'data.precio' }],
      lastResponse: 'x'.repeat(5000),
    },
  ],
  scripts: [{ id: 'scr-1', name: 'redondear', language: 'python', code: 'outputs = {}', inputVariables: [], outputVariables: [{ name: 'total' }] }],
  custom_scripts: [{ id: 'scr-1', name: 'redondear', language: 'python', code: 'outputs = {}', inputVariables: [], outputVariables: [{ name: 'total' }] }],
};
