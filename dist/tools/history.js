export function registerHistoryTools(client) {
    return [
        {
            name: 'treeflow_list_change_history',
            description: 'Obtiene el historial de auditoría de cambios del bot: quién modificó qué nodo, intención, configuración o entidad y cuándo.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    limit: { type: 'integer', description: 'Cantidad máxima de registros a obtener (default: 50)' },
                },
                required: ['tree_id'],
            },
            handler: async (args) => {
                const result = await client.listChangeHistory(args.tree_id, args.limit || 50);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            },
        },
        {
            name: 'treeflow_list_training_history',
            description: 'Obtiene el historial detallado de entrenamientos del bot con métricas de exactitud, duración y registros de errores.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    page: { type: 'integer', description: 'Página (default: 1)' },
                    page_size: { type: 'integer', description: 'Tamaño de página (default: 10)' },
                },
                required: ['tree_id'],
            },
            handler: async (args) => {
                const result = await client.listTrainingHistory(args.tree_id, args.page || 1, args.page_size || 10);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            },
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
    ];
}
//# sourceMappingURL=history.js.map