export function registerTreeTools(client) {
    return [
        {
            name: 'treeflow_list_trees',
            description: 'Lista todos los bots (árboles) disponibles en el espacio de trabajo actual de Treeflow.',
            inputSchema: {
                type: 'object',
                properties: {},
            },
            handler: async () => {
                const trees = await client.listTrees();
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(trees, null, 2),
                        },
                    ],
                };
            },
        },
        {
            name: 'treeflow_get_tree',
            description: 'Obtiene los detalles completos, configuración y propósito de un bot (árbol) por su ID.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID único del bot/árbol (UUID)' },
                },
                required: ['tree_id'],
            },
            handler: async (args) => {
                const tree = await client.getTree(args.tree_id);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(tree, null, 2),
                        },
                    ],
                };
            },
        },
        {
            name: 'treeflow_create_tree',
            description: 'Crea un nuevo bot (árbol) en el espacio de trabajo de Treeflow.',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Nombre descriptivo del bot' },
                    description: { type: 'string', description: 'Descripción de las funciones del bot' },
                    purpose: { type: 'string', description: 'Giro o propósito (hotel, restaurante, inmobiliaria, rrhh, general)' },
                    primary_language: { type: 'string', description: 'Idioma principal (es, en, pt, fr, it, de). Por defecto: es' },
                },
                required: ['name'],
            },
            handler: async (args) => {
                const result = await client.createTree(args);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            },
        },
        {
            name: 'treeflow_update_tree',
            description: 'Actualiza la configuración, nombre, propósito o parámetros de un bot existente.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    name: { type: 'string', description: 'Nuevo nombre' },
                    description: { type: 'string', description: 'Nueva descripción' },
                    purpose: { type: 'string', description: 'Nuevo propósito' },
                    nlp_mode: { type: 'string', description: 'Modo NLP (basic, advanced)' },
                },
                required: ['tree_id'],
            },
            handler: async (args) => {
                const { tree_id, ...data } = args;
                const result = await client.updateTree(tree_id, data);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            },
        },
        {
            name: 'treeflow_delete_tree',
            description: 'Elimina un bot de Treeflow de forma permanente.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot a eliminar' },
                },
                required: ['tree_id'],
            },
            handler: async (args) => {
                const result = await client.deleteTree(args.tree_id);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            },
        },
    ];
}
//# sourceMappingURL=trees.js.map