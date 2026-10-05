import { TreeflowClient } from '../client/treeflowClient.js';

export function registerIntegrationTools(client: TreeflowClient) {
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
      handler: async (args: { tree_id: string }) => {
        const result = await client.listIntegrations(args.tree_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    },
    {
      name: 'treeflow_configure_integration',
      description:
        'Activa, desactiva o ajusta un canal del bot. config se combina con lo guardado: manda sólo las claves que ' +
        'cambian, con los mismos nombres que muestra treeflow_list_integrations (ej. web: {"primaryColor": "#0a0"}). ' +
        'El token de Telegram no se configura aquí: se conecta desde el panel de Treeflow, que registra el webhook.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
          integration_key: { type: 'string', description: 'Clave del canal tal como sale en treeflow_list_integrations (web, telegram, whatsapp…)' },
          enabled: { type: 'boolean', description: 'true para activar, false para desactivar' },
          config: { type: 'object', description: 'Claves del canal que cambian' },
        },
        required: ['tree_id', 'integration_key', 'enabled'],
      },
      handler: async (args: { tree_id: string; integration_key: string; enabled: boolean; config?: any }) => {
        const result = await client.configureIntegration(args.tree_id, args.integration_key, args.enabled, args.config);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    },
  ];
}
