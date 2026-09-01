export function registerDiagnosticTools(client) {
    return [
        {
            name: 'treeflow_simulate_message',
            description: 'Envía un mensaje de prueba al bot para evaluar en tiempo real la detección de intención, entidades extraídas, respuesta generada y transición de nodos.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    message: { type: 'string', description: 'Mensaje de usuario a simular (ej. "Hola quiero hacer una reserva para 2")' },
                    session_id: { type: 'string', description: 'ID de sesión opcional para continuar una conversación de prueba' },
                },
                required: ['tree_id', 'message'],
            },
            handler: async (args) => {
                const result = await client.simulateChatMessage(args.tree_id, args.message, args.session_id);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            },
        },
        {
            name: 'treeflow_list_conversations',
            description: 'Lista las conversaciones recientes registradas en el bot.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                },
                required: ['tree_id'],
            },
            handler: async (args) => {
                const result = await client.listConversations(args.tree_id);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            },
        },
    ];
}
//# sourceMappingURL=diagnostics.js.map