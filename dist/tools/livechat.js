import { ok } from './util.js';
// Sólo lectura, a propósito: tomar, responder o cerrar una atención es hablar con un
// cliente real en nombre de una persona, y eso se hace desde la mesa de ayuda.
export function registerLiveChatTools(client) {
    return [
        {
            name: 'treeflow_get_live_chat_queue',
            description: 'Conversaciones que esperan a una persona o están en atención en la mesa de ayuda. Sin tree_id muestra todo el workspace. Requiere un rol con acceso a la mesa de ayuda.',
            inputSchema: { type: 'object', properties: { tree_id: { type: 'string', description: 'Filtrar por bot (opcional)' } } },
            handler: async (a) => ok(await client.getLiveChatQueue(a.tree_id)),
        },
        {
            name: 'treeflow_get_live_chat_history',
            description: 'Historial de atenciones de la mesa de ayuda, con filtros por bot, fechas, estado o texto.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string' },
                    desde: { type: 'string', description: 'Fecha inicial ISO 8601' },
                    hasta: { type: 'string', description: 'Fecha final ISO 8601' },
                    estado: { type: 'string' },
                    q: { type: 'string', description: 'Texto a buscar' },
                    limit: { type: 'integer', description: 'Default 20' },
                    offset: { type: 'integer' },
                },
            },
            handler: async (a) => ok(await client.getLiveChatHistory({ limit: 20, ...a })),
        },
        {
            name: 'treeflow_get_live_chat_session',
            description: 'Detalle de una atención de la mesa de ayuda con su historial cronológico de turnos.',
            inputSchema: { type: 'object', properties: { session_id: { type: 'string' } }, required: ['session_id'] },
            handler: async (a) => ok(await client.getLiveChatSession(a.session_id)),
        },
    ];
}
//# sourceMappingURL=livechat.js.map