import { TreeflowClient } from '../client/treeflowClient.js';

export function registerEntityTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_list_entities',
      description: 'Lista todas las entidades (valores, sinónimos, expresiones regulares) de un bot en Treeflow.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
        },
        required: ['tree_id'],
      },
      handler: async (args: { tree_id: string }) => {
        const entities = await client.listEntities(args.tree_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(entities, null, 2) }],
        };
      },
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
      description: 'Actualiza los valores, tipo, sinónimos o patrón regex de una entidad existente.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
          entity_id: { type: 'string', description: 'ID de la entidad' },
          name: { type: 'string', description: 'Nuevo nombre' },
          type: { type: 'string', enum: ['simple', 'composite', 'regex'], description: 'Tipo de entidad' },
          values: {
            type: 'array',
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
      handler: async (args: { tree_id: string; entity_id: string; name?: string; type?: string; values?: any[]; pattern?: string }) => {
        const result = await client.updateEntity(args.tree_id, args.entity_id, {
          name: args.name,
          type: args.type,
          values: args.values,
          pattern: args.pattern,
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
