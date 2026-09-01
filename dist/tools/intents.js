export function registerIntentTools(client) {
    return [
        {
            name: 'treeflow_list_intents',
            description: 'Lista todas las intenciones NLU de un bot con sus frases de entrenamiento y entidades configuradas.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                },
                required: ['tree_id'],
            },
            handler: async (args) => {
                const intents = await client.listIntents(args.tree_id);
                return {
                    content: [{ type: 'text', text: JSON.stringify(intents, null, 2) }],
                };
            },
        },
        {
            name: 'treeflow_create_intent',
            description: 'Crea una nueva intención NLU con frases de entrenamiento (patterns) para el bot.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    name: { type: 'string', description: 'Nombre único de la intención (ej. saludo, reservar_mesa, consultar_saldo)' },
                    patterns: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Lista de frases de entrenamiento que activarán esta intención',
                    },
                    entities: {
                        type: 'array',
                        items: { type: 'object' },
                        description: 'Entidades asociadas a extraer en esta intención (opcional)',
                    },
                    type: { type: 'string', description: 'Tipo: conversational o contextual. Por defecto: conversational' },
                },
                required: ['tree_id', 'name', 'patterns'],
            },
            handler: async (args) => {
                const result = await client.createIntent(args.tree_id, {
                    name: args.name,
                    patterns: args.patterns,
                    entities: args.entities,
                    type: args.type || 'conversational',
                });
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            },
        },
        {
            name: 'treeflow_update_intent',
            description: 'Actualiza el nombre, frases de entrenamiento o entidades de una intención existente.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    intent_id: { type: 'string', description: 'ID de la intención' },
                    name: { type: 'string', description: 'Nuevo nombre' },
                    patterns: { type: 'array', items: { type: 'string' }, description: 'Nuevas frases de entrenamiento' },
                    entities: { type: 'array', items: { type: 'object' }, description: 'Entidades' },
                },
                required: ['tree_id', 'intent_id'],
            },
            handler: async (args) => {
                const result = await client.updateIntent(args.tree_id, args.intent_id, {
                    name: args.name,
                    patterns: args.patterns,
                    entities: args.entities,
                });
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
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
            handler: async (args) => {
                const result = await client.deleteIntent(args.tree_id, args.intent_id);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            },
        },
    ];
}
//# sourceMappingURL=intents.js.map