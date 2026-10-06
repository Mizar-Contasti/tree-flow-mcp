import { TreeflowClient } from '../client/treeflowClient.js';
import { intentLine } from './resumen.js';
import { inBatch, ok } from './util.js';

// Esquema de los parámetros de una intención, compartido por crear y actualizar.
const paramsSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Nombre del parámetro/variable' },
      entity_name: { type: 'string', description: 'Entidad asignada (ej. sys.number, @tipo_habitacion)' },
      required: { type: 'boolean', description: 'Si el slot es obligatorio' },
      prompt: { type: 'string', description: 'Pregunta si falta el valor' },
    },
    required: ['name', 'entity_name'],
  },
};

export function registerIntentTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_create_intent',
      description:
        'Crea una o varias intenciones NLU en una sola llamada, cada una con sus frases de entrenamiento y sus ' +
        'parámetros (slots). Si una falla, las demás se crean igual y se dice cuál falló. Después hay que reentrenar.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
          intents: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Nombre único (ej. reservar_mesa)' },
                patterns: { type: 'array', items: { type: 'string' }, description: 'Frases de entrenamiento; entidades como @nombre' },
                entities: { ...paramsSchema, description: 'Parámetros a extraer' },
                type: { type: 'string', description: 'conversational (default) o contextual' },
              },
              required: ['name', 'patterns'],
            },
          },
        },
        required: ['tree_id', 'intents'],
      },
      handler: async (args: { tree_id: string; intents: { name: string; patterns: string[]; entities?: any[]; type?: string }[] }) =>
        ok(
          await inBatch('Intenciones', args.intents, (i) => i.name, async (i) =>
            intentLine(await client.createIntent(args.tree_id, { ...i, type: i.type || 'conversational' }))
          )
        ),
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
          entities: { ...paramsSchema, description: 'Sustituye TODOS los parámetros' },
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
  ];
}
