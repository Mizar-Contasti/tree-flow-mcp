export function registerIntegrationTools(client) {
    return [
        {
            name: 'treeflow_list_integrations',
            description: 'Lista el estado de los canales e integraciones de terceros (WhatsApp, Webchat, Telegram, Webhooks, injertos) del bot.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                },
                required: ['tree_id'],
            },
            handler: async (args) => {
                const result = await client.listIntegrations(args.tree_id);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            },
        },
        {
            name: 'treeflow_configure_integration',
            description: 'Activa, desactiva o actualiza la configuración de un canal o integración externa (ej. whatsapp, telegram, webchat).',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    integration_key: { type: 'string', description: 'Clave de integración: whatsapp, telegram, webchat, etc.' },
                    enabled: { type: 'boolean', description: 'true para activar, false para desactivar' },
                    config: { type: 'object', description: 'Configuración opcional (tokens, phone numbers, endpoints)' },
                },
                required: ['tree_id', 'integration_key', 'enabled'],
            },
            handler: async (args) => {
                const result = await client.configureIntegration(args.tree_id, args.integration_key, args.enabled, args.config);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            },
        },
    ];
}
//# sourceMappingURL=integrations.js.map