import { TreeflowClient } from '../client/treeflowClient.js';
import { DETAIL_HINT, entitiesSummary } from './resumen.js';
import { ok } from './util.js';

export function registerEntityTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_list_entities',
      description:
        'Lista las entidades NLU de un bot: nombre, ID, tipo, cuántos valores tiene y los primeros. Los valores ' +
        'con sus sinónimos: treeflow_get_detail con tipo entity.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
        },
        required: ['tree_id'],
      },
      handler: async (args: { tree_id: string }) =>
        ok(`${entitiesSummary(await client.listEntities(args.tree_id))}\n${DETAIL_HINT}`),
    },
    {
      name: 'treeflow_create_entity',
      description: 'Crea una nueva entidad NLU (simple con sinónimos, compuesta o por expresión regular regex).',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
          name: { type: 'string', description: 'Nombre de la entidad (ej. tipo_habitacion, ciudad, horario)' },
          type: { type: 'string', enum: ['simple', 'composite', 'regex'], description: 'Tipo de entidad. Default: simple' },
          values: {
            type: 'array',
            description: 'Valores canónicos y sus sinónimos para entidades simple/composite',
            items: {
              type: 'object',
              properties: {
                key: { type: 'string', description: 'Valor canónico (o value)' },
                value: { type: 'string', description: 'Valor canónico alternativo' },
                synonyms: { type: 'array', items: { type: 'string' }, description: 'Sinónimos que mapean a este valor' },
                entity: { type: 'string', description: 'Sub-entidad si es compuesta' },
              },
            },
          },
          pattern: { type: 'string', description: 'Patrón regex si el tipo es regex (ej. ^[0-9]{5}$)' },
        },
        required: ['tree_id', 'name'],
      },
      handler: async (args: { tree_id: string; name: string; type?: string; values?: any[]; pattern?: string }) => {
        const result = await client.createEntity(args.tree_id, {
          name: args.name,
          type: args.type || 'simple',
          values: args.values || [],
          pattern: args.pattern,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    },
    {
      name: 'treeflow_update_entity',
      description:
        'Actualiza una entidad: nombre, tipo, valores o patrón regex. Lo que no mandes se conserva. Para añadir ' +
        'valores (o sinónimos a uno existente) usa add_values, y para quitarlos remove_values: no hace falta leerlos ' +
        'antes. values, si lo mandas, sustituye la lista completa. Después hay que reentrenar.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
          entity_id: { type: 'string', description: 'ID de la entidad' },
          name: { type: 'string', description: 'Nuevo nombre' },
          type: { type: 'string', enum: ['simple', 'composite', 'regex'], description: 'Tipo de entidad' },
          add_values: {
            type: 'array',
            description: 'Valores a añadir; si el valor ya existe, se le suman los sinónimos',
            items: {
              type: 'object',
              properties: { key: { type: 'string' }, synonyms: { type: 'array', items: { type: 'string' } } },
              required: ['key'],
            },
          },
          remove_values: { type: 'array', items: { type: 'string' }, description: 'Valores canónicos (key) a quitar' },
          values: {
            type: 'array',
            description: 'Sustituye TODOS los valores',
            items: {
              type: 'object',
              properties: {
                key: { type: 'string' },
                value: { type: 'string' },
                synonyms: { type: 'array', items: { type: 'string' } },
                entity: { type: 'string' },
              },
            },
          },
          pattern: { type: 'string', description: 'Nuevo patrón regex' },
        },
        required: ['tree_id', 'entity_id'],
      },
      handler: async (args: {
        tree_id: string;
        entity_id: string;
        name?: string;
        type?: string;
        values?: any[];
        pattern?: string;
        add_values?: any[];
        remove_values?: string[];
      }) => {
        const result = await client.updateEntity(args.tree_id, args.entity_id, {
          name: args.name,
          type: args.type,
          values: args.values,
          pattern: args.pattern,
          add_values: args.add_values,
          remove_values: args.remove_values,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    },
    {
      name: 'treeflow_delete_entity',
      description: 'Elimina una entidad NLU.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
          entity_id: { type: 'string', description: 'ID de la entidad a eliminar' },
        },
        required: ['tree_id', 'entity_id'],
      },
      handler: async (args: { tree_id: string; entity_id: string }) => {
        const result = await client.deleteEntity(args.tree_id, args.entity_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    },
  ];
}
