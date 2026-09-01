export function registerTrainingTools(client) {
    return [
        {
            name: 'treeflow_trigger_training',
            description: 'Inicia el re-entrenamiento del modelo de Machine Learning y NLU de un bot con las intenciones y entidades actuales.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol a entrenar' },
                },
                required: ['tree_id'],
            },
            handler: async (args) => {
                const result = await client.triggerTraining(args.tree_id);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            },
        },
        {
            name: 'treeflow_get_training_status',
            description: 'Consulta el estado actual del entrenamiento NLU de un bot (en progreso, completado, métricas).',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                },
                required: ['tree_id'],
            },
            handler: async (args) => {
                const status = await client.getTrainingStatus(args.tree_id);
                return {
                    content: [{ type: 'text', text: JSON.stringify(status, null, 2) }],
                };
            },
        },
    ];
}
//# sourceMappingURL=training.js.map