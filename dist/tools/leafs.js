export function registerLeafTools(client) {
    return [
        {
            name: 'treeflow_list_leafs',
            description: 'Lista todos los nodos (leafs) dentro de una rama específica del canvas.',
            inputSchema: {
                type: 'object',
                properties: {
                    branch_id: { type: 'string', description: 'ID de la rama' },
                },
                required: ['branch_id'],
            },
            handler: async (args) => {
                const leafs = await client.listLeafs(args.branch_id);
                return {
                    content: [{ type: 'text', text: JSON.stringify(leafs, null, 2) }],
                };
            },
        },
        {
            name: 'treeflow_create_leaf',
            description: 'Crea un nuevo nodo (leaf) dentro de una rama. Tipos soportados: message, input, condition, action, webhook, trigger_context.',
            inputSchema: {
                type: 'object',
                properties: {
                    branch_id: { type: 'string', description: 'ID de la rama' },
                    leaf_type: { type: 'string', description: 'Tipo de nodo: message, input, condition, action, webhook, trigger_context' },
                    name: { type: 'string', description: 'Nombre del nodo. Si se omite se usa el tipo.' },
                    config: {
                        type: 'object',
                        description: 'Configuración JSON del nodo (ej. plantilla de mensaje, opciones, condiciones)',
                    },
                    position_x: { type: 'number', description: 'Posición X en el lienzo (default 0)' },
                    position_y: { type: 'number', description: 'Posición Y en el lienzo (default 0)' },
                    is_start: { type: 'boolean', description: 'Marca el nodo como inicio de la rama' },
                },
                required: ['branch_id', 'leaf_type'],
            },
            handler: async (args) => {
                const result = await client.createLeaf(args.branch_id, {
                    name: args.name,
                    type: args.leaf_type,
                    config: args.config || {},
                    position_x: args.position_x,
                    position_y: args.position_y,
                    is_start: args.is_start,
                });
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            },
        },
        {
            name: 'treeflow_update_leaf',
            description: 'Actualiza el contenido, configuración o posición de un nodo (leaf) existente.',
            inputSchema: {
                type: 'object',
                properties: {
                    leaf_id: { type: 'string', description: 'ID del nodo (leaf)' },
                    name: { type: 'string', description: 'Nuevo nombre del nodo' },
                    leaf_type: { type: 'string', description: 'Nuevo tipo de nodo' },
                    config: { type: 'object', description: 'Nueva configuración del nodo' },
                    position_x: { type: 'number', description: 'Nueva posición X en el lienzo' },
                    position_y: { type: 'number', description: 'Nueva posición Y en el lienzo' },
                    is_start: { type: 'boolean', description: 'Marca el nodo como inicio de la rama' },
                },
                required: ['leaf_id'],
            },
            handler: async (args) => {
                const result = await client.updateLeaf(args.leaf_id, {
                    name: args.name,
                    type: args.leaf_type,
                    config: args.config,
                    position_x: args.position_x,
                    position_y: args.position_y,
                    is_start: args.is_start,
                });
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            },
        },
        {
            name: 'treeflow_delete_leaf',
            description: 'Elimina un nodo (leaf) del canvas.',
            inputSchema: {
                type: 'object',
                properties: {
                    leaf_id: { type: 'string', description: 'ID del nodo a eliminar' },
                },
                required: ['leaf_id'],
            },
            handler: async (args) => {
                const result = await client.deleteLeaf(args.leaf_id);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            },
        },
    ];
}
//# sourceMappingURL=leafs.js.map