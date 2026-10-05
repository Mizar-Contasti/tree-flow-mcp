import { changeHistorySummary, trainingHistorySummary, withoutNoise } from './resumen.js';
import { ok } from './util.js';
export function registerHistoryTools(client) {
    return [
        {
            name: 'treeflow_list_change_history',
            description: 'Historial de auditoría del bot: quién cambió qué (hoja, rama, intención, entidad, plantilla, configuración), ' +
                'cuándo y qué campos tocó, una línea por cambio. Con change_id devuelve el antes/después completo de ese cambio.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    limit: { type: 'integer', description: 'Cuántos cambios (default 20, máx. 500)' },
                    offset: { type: 'integer', description: 'Para paginar' },
                    entity_type: { type: 'string', description: 'Filtrar por tipo: intent, entity, branch, message, fertilizer, injerto, tree…' },
                    action: { type: 'string', enum: ['created', 'updated', 'deleted'] },
                    change_id: { type: 'string', description: 'Devuelve sólo ese cambio, con su antes/después' },
                },
                required: ['tree_id'],
            },
            handler: async (args) => {
                const { tree_id, change_id, ...params } = args;
                if (change_id) {
                    const recent = await client.listChangeHistory(tree_id, { ...params, limit: 500 });
                    const entry = recent.find((e) => e.change_id === change_id);
                    if (!entry)
                        throw new Error(`No está el cambio ${change_id} entre los 500 más recientes que cumplen el filtro.`);
                    return ok(JSON.stringify(withoutNoise(entry)));
                }
                return ok(changeHistorySummary(await client.listChangeHistory(tree_id, params)));
            },
        },
        {
            name: 'treeflow_list_training_history',
            description: 'Historial de entrenamientos del bot: fecha, estado, duración, cuántas intenciones y entidades entrenó y el ' +
                'error si falló. Una línea por entrenamiento.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    page: { type: 'integer', description: 'Página (default: 1)' },
                    page_size: { type: 'integer', description: 'Tamaño de página (default: 10)' },
                },
                required: ['tree_id'],
            },
            handler: async (args) => ok(trainingHistorySummary(await client.listTrainingHistory(args.tree_id, args.page || 1, args.page_size || 10))),
        },
        {
            name: 'treeflow_list_backups',
            description: 'Lista todos los respaldos y snapshots de seguridad del bot.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                },
                required: ['tree_id'],
            },
            handler: async (args) => {
                const result = await client.listBackups(args.tree_id);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            },
        },
        {
            name: 'treeflow_create_backup',
            description: 'Crea un respaldo/snapshot completo del bot actual (intents, canvas, configuración) antes de realizar cambios masivos.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    note: { type: 'string', description: 'Nota descriptiva sobre el respaldo' },
                },
                required: ['tree_id'],
            },
            handler: async (args) => {
                const result = await client.createBackup(args.tree_id, args.note);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            },
        },
        {
            name: 'treeflow_get_conversation_analytics',
            description: 'Métricas analíticas de las conversaciones del bot: volumen, intenciones, tasas de fallback, retención y árbol de flujo de la conversación. Por defecto excluye las conversaciones de la consola de prueba.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    start_date: { type: 'number', description: 'Timestamp Unix (segundos) de inicio' },
                    end_date: { type: 'number', description: 'Timestamp Unix (segundos) de fin' },
                    intent: { type: 'string', description: 'Filtrar por intención' },
                    branch: { type: 'string', description: 'Filtrar por rama (ID)' },
                    include_console: { type: 'boolean', description: 'Incluir conversaciones de la consola de prueba (default false)' },
                    max_depth: { type: 'integer', description: 'Profundidad máxima del árbol de flujo, 1-10 (default 5)' },
                },
                required: ['tree_id'],
            },
            handler: async (args) => {
                const { tree_id, ...params } = args;
                const result = await client.getConversationAnalytics(tree_id, params);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            },
        },
    ];
}
//# sourceMappingURL=history.js.map