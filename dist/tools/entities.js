export function registerEntityTools(client) {
    return [
        {
            name: 'treeflow_list_entities',
            description: 'Lista todas las entidades (valores y sinónimos) de un bot en Treeflow.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                },
                required: ['tree_id'],
            },
            handler: async (args) => {
                const entities = await client.listEntities(args.tree_id);
                return {
                    content: [{ type: 'text', text: JSON.stringify(entities, null, 2) }],
                };
            },
        },
        {
            name: 'treeflow_create_entity',
            description: 'Crea una nueva entidad NLU con sus valores y sinónimos para el reconocimiento de slots.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    name: { type: 'string', description: 'Nombre de la entidad (ej. tipo_habitacion, ciudad, horario)' },
                    values: {
                        type: 'array',
                        description: 'Valores canónicos y sus sinónimos',
                        items: {
                            type: 'object',
                            properties: {
                                value: { type: 'string', description: 'Valor canónico' },
                                synonyms: { type: 'array', items: { type: 'string' }, description: 'Sinónimos' },
                            },
                            required: ['value', 'synonyms'],
                        },
                    },
                },
                required: ['tree_id', 'name', 'values'],
            },
            handler: async (args) => {
                const result = await client.createEntity(args.tree_id, {
                    name: args.name,
                    values: args.values,
                });
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            },
        },
        {
            name: 'treeflow_update_entity',
            description: 'Actualiza los valores o sinónimos de una entidad existente.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    entity_id: { type: 'string', description: 'ID de la entidad' },
                    name: { type: 'string', description: 'Nuevo nombre' },
                    values: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                value: { type: 'string' },
                                synonyms: { type: 'array', items: { type: 'string' } },
                            },
                            required: ['value', 'synonyms'],
                        },
                    },
                },
                required: ['tree_id', 'entity_id'],
            },
            handler: async (args) => {
                const result = await client.updateEntity(args.tree_id, args.entity_id, {
                    name: args.name,
                    values: args.values,
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
            handler: async (args) => {
                const result = await client.deleteEntity(args.tree_id, args.entity_id);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            },
        },
    ];
}
//# sourceMappingURL=entities.js.map