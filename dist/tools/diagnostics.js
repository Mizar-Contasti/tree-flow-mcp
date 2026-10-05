import { conversationSummary, conversationsList, simulationSummary } from './resumen.js';
import { ok } from './util.js';
export function registerDiagnosticTools(client) {
    return [
        {
            name: 'treeflow_simulate_message',
            description: 'Envía un mensaje de prueba al bot y devuelve lo que contestó, la intención detectada con su confianza, la ' +
                'hoja en la que quedó, los parámetros capturados y el session_id. Para seguir la misma conversación, manda ' +
                'ese session_id en el siguiente mensaje.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    message: { type: 'string', description: 'El mensaje de texto que el usuario escribe al bot' },
                    session_id: { type: 'string', description: 'ID de sesión para seguir una conversación (opcional; sin él empieza una nueva)' },
                },
                required: ['tree_id', 'message'],
            },
            handler: async (args) => ok(simulationSummary(await client.simulateChatMessage(args.tree_id, args.message, args.session_id))),
        },
        {
            name: 'treeflow_list_conversations',
            description: 'Lista las conversaciones más recientes del bot (20 por defecto), con filtros por intención, texto o fechas.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    limit: { type: 'integer', description: 'Cuántas (default 20)' },
                    offset: { type: 'integer', description: 'Para paginar' },
                    intent: { type: 'string', description: 'Sólo las que pasaron por esta intención' },
                    message: { type: 'string', description: 'Sólo las que contienen este texto' },
                    start_date: { type: 'number', description: 'Timestamp Unix (segundos) de inicio' },
                    end_date: { type: 'number', description: 'Timestamp Unix (segundos) de fin' },
                },
                required: ['tree_id'],
            },
            handler: async (args) => {
                const { tree_id, ...params } = args;
                return ok(conversationsList(await client.listConversations(tree_id, params)));
            },
        },
        {
            name: 'treeflow_get_conversation',
            description: 'Los turnos de una conversación: qué escribió el usuario, qué contestó el bot, con qué intención y en qué hoja.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    session_id: { type: 'string', description: 'ID de la sesión de conversación' },
                },
                required: ['tree_id', 'session_id'],
            },
            handler: async (args) => ok(conversationSummary(await client.getConversation(args.tree_id, args.session_id))),
        },
    ];
}
//# sourceMappingURL=diagnostics.js.map