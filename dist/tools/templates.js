export function registerTemplateTools(client) {
    return [
        {
            name: 'treeflow_list_message_templates',
            description: 'Lista todas las plantillas de mensajes y respuestas configuradas en un bot de Treeflow.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                },
                required: ['tree_id'],
            },
            handler: async (args) => {
                const templates = await client.listMessageTemplates(args.tree_id);
                return {
                    content: [{ type: 'text', text: JSON.stringify(templates, null, 2) }],
                };
            },
        },
        {
            name: 'treeflow_create_message_template',
            description: 'Crea una nueva plantilla de respuesta de mensaje (con soporte para variaciones y variables como {nombre}).',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    name: { type: 'string', description: 'Nombre identificador de la plantilla (ej. respuesta_bienvenida)' },
                    template: { type: 'string', description: 'Texto del mensaje o plantilla' },
                    variations: { type: 'array', items: { type: 'string' }, description: 'Variaciones alternativas de la respuesta' },
                },
                required: ['tree_id', 'name', 'template'],
            },
            handler: async (args) => {
                const result = await client.createMessageTemplate(args.tree_id, {
                    name: args.name,
                    template: args.template,
                    variations: args.variations || [],
                });
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            },
        },
        {
            name: 'treeflow_update_message_template',
            description: 'Actualiza el texto o variaciones de una plantilla de mensaje existente.',
            inputSchema: {
                type: 'object',
                properties: {
                    template_id: { type: 'string', description: 'ID de la plantilla' },
                    name: { type: 'string', description: 'Nuevo nombre' },
                    template: { type: 'string', description: 'Nuevo texto de la plantilla' },
                    variations: { type: 'array', items: { type: 'string' }, description: 'Nuevas variaciones' },
                },
                required: ['template_id'],
            },
            handler: async (args) => {
                const result = await client.updateMessageTemplate(args.template_id, {
                    name: args.name,
                    template: args.template,
                    variations: args.variations,
                });
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            },
        },
        {
            name: 'treeflow_delete_message_template',
            description: 'Elimina una plantilla de mensaje.',
            inputSchema: {
                type: 'object',
                properties: {
                    template_id: { type: 'string', description: 'ID de la plantilla a eliminar' },
                },
                required: ['template_id'],
            },
            handler: async (args) => {
                const result = await client.deleteMessageTemplate(args.template_id);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            },
        },
    ];
}
//# sourceMappingURL=templates.js.map