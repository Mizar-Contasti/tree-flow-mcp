export function registerTemplateTools(client) {
    return [
        {
            name: 'treeflow_list_message_templates',
            description: 'Lista todas las plantillas de mensajes y respuestas enriquecidas configuradas en un bot de Treeflow.',
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
            description: 'Crea una nueva plantilla de mensaje (MessageTemplate) para respuestas estructuradas o enriquecidas (texto plano, botones, tarjetas, carruseles, audios).',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    name: { type: 'string', description: 'Nombre representativo de la plantilla (ej. respuesta_bienvenida, menu_principal)' },
                    text: { type: 'string', description: 'Texto plano de respaldo (fallback text)' },
                    description: { type: 'string', description: 'Descripción corta opcional' },
                    responses: {
                        type: 'array',
                        description: 'Arreglo de bloques enriquecidos (RichBlocks) compatibles con WhatsApp, Webchat y Telegram. Tipos soportados: text ({type: "text", text: "..."}), card ({type: "card", title, subtitle, imageUrl, buttons: [{label, url, payload}]}), quick_replies ({type: "quick_replies", options: ["Opción 1", "Opción 2"]}), carousel ({type: "carousel", cards: [...]}), image ({type: "image", url}), audio ({type: "audio", url}), file ({type: "file", url, filename}), location ({type: "location", latitude, longitude, address}).',
                        items: { type: 'object' },
                    },
                },
                required: ['tree_id', 'name'],
            },
            handler: async (args) => {
                const result = await client.createMessageTemplate(args.tree_id, {
                    name: args.name,
                    text: args.text || args.name,
                    description: args.description,
                    responses: args.responses || [{ type: 'text', text: args.text || args.name }],
                });
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            },
        },
        {
            name: 'treeflow_update_message_template',
            description: 'Actualiza una plantilla de mensaje existente (texto plano o bloques enriquecidos).',
            inputSchema: {
                type: 'object',
                properties: {
                    template_id: { type: 'string', description: 'ID de la plantilla a actualizar' },
                    name: { type: 'string', description: 'Nuevo nombre' },
                    text: { type: 'string', description: 'Nuevo texto plano fallback' },
                    description: { type: 'string', description: 'Nueva descripción' },
                    responses: { type: 'array', items: { type: 'object' }, description: 'Nuevo arreglo de bloques enriquecidos' },
                },
                required: ['template_id'],
            },
            handler: async (args) => {
                const result = await client.updateMessageTemplate(args.template_id, {
                    name: args.name,
                    text: args.text,
                    description: args.description,
                    responses: args.responses,
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