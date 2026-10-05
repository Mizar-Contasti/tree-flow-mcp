import { TreeflowClient } from '../client/treeflowClient.js';
import { DETAIL_HINT, intentLine, intentsSummary } from './resumen.js';
import { ok } from './util.js';

export function registerIntentTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_list_intents',
      description:
        'Lista las intenciones NLU de un bot: nombre, ID, cuántas frases tiene y sus parámetros. Las frases y la ' +
        'configuración de los parámetros: treeflow_get_detail con tipo intent.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
        },
        required: ['tree_id'],
      },
      handler: async (args: { tree_id: string }) =>
        ok(`${intentsSummary(await client.listIntents(args.tree_id))}\n${DETAIL_HINT}`),
    },
    {
      name: 'treeflow_create_intent',
      description: 'Crea una nueva intención NLU con frases de entrenamiento (patterns) y slots de parámetros requeridos (ej. fecha, cantidad, tipo_habitacion).',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
          name: { type: 'string', description: 'Nombre único de la intención (ej. saludo, reservar_mesa, consultar_precio)' },
          patterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Lista de frases de entrenamiento que activarán esta intención',
          },
          entities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Nombre del parámetro/variable' },
                entity_name: { type: 'string', description: 'Nombre de la entidad asignada (ej. sys.number, @tipo_habitacion)' },
                required: { type: 'boolean', description: 'Si el slot es obligatorio' },
                prompt: { type: 'string', description: 'Pregunta de repregunta si falta el valor' },
              },
              required: ['name', 'entity_name'],
            },
            description: 'Parámetros o slots a extraer en esta intención',
          },
          type: { type: 'string', description: 'Tipo: conversational o contextual. Por defecto: conversational' },
        },
        required: ['tree_id', 'name', 'patterns'],
      },
      handler: async (args: { tree_id: string; name: string; patterns: string[]; entities?: any[]; type?: string }) => {
        const result = await client.createIntent(args.tree_id, {
          name: args.name,
          patterns: args.patterns,
          entities: args.entities,
          type: args.type || 'conversational',
        });
        return ok(`Intención creada: ${intentLine(result)}`);
      },
    },
    {
      name: 'treeflow_update_intent',
      description:
        'Actualiza una intención: nombre, frases o parámetros. Lo que no mandes se conserva. Para añadir o quitar ' +
        'frases usa add_patterns / remove_patterns (no hace falta leerlas antes); patterns y entities, si los ' +
        'mandas, sustituyen la lista completa. Después hay que reentrenar.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
          intent_id: { type: 'string', description: 'ID de la intención' },
          name: { type: 'string', description: 'Nuevo nombre' },
          add_patterns: { type: 'array', items: { type: 'string' }, description: 'Frases a añadir (las repetidas se ignoran)' },
          remove_patterns: { type: 'array', items: { type: 'string' }, description: 'Frases a quitar, escritas igual' },
          patterns: { type: 'array', items: { type: 'string' }, description: 'Sustituye TODAS las frases' },
          entities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                entity_name: { type: 'string' },
                required: { type: 'boolean' },
                prompt: { type: 'string' },
              },
              required: ['name', 'entity_name'],
            },
            description: 'Sustituye TODOS los parámetros',
          },
        },
        required: ['tree_id', 'intent_id'],
      },
      handler: async (args: {
        tree_id: string;
        intent_id: string;
        name?: string;
        patterns?: string[];
        entities?: any[];
        add_patterns?: string[];
        remove_patterns?: string[];
      }) => {
        const result = await client.updateIntent(args.tree_id, args.intent_id, {
          name: args.name,
          patterns: args.patterns,
          entities: args.entities,
          add_patterns: args.add_patterns,
          remove_patterns: args.remove_patterns,
        });
        return ok(`Intención actualizada: ${intentLine(result)}`);
      },
    },
    {
      name: 'treeflow_delete_intent',
      description: 'Elimina una intención NLU de un bot.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
          intent_id: { type: 'string', description: 'ID de la intención a eliminar' },
        },
        required: ['tree_id', 'intent_id'],
      },
      handler: async (args: { tree_id: string; intent_id: string }) => {
        const result = await client.deleteIntent(args.tree_id, args.intent_id);
        return ok(result);
      },
    },
  ];
}
