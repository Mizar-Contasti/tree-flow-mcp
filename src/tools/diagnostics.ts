import { TreeflowClient } from '../client/treeflowClient.js';

export function registerDiagnosticTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_simulate_message',
      description: 'Envía un mensaje de prueba a la consola del bot para probar en tiempo real el flujo conversacional. Retorna la respuesta del bot, la intención detectada con su score de confianza, entidades extraídas y el nuevo estado/nodo de la sesión.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
          message: { type: 'string', description: 'El mensaje de texto que el usuario escribe al bot' },
          session_id: { type: 'string', description: 'ID de sesión para el chat simulado (opcional, genera uno automáticamente si no se envía)' },
        },
        required: ['tree_id', 'message'],
      },
      handler: async (args: { tree_id: string; message: string; session_id?: string }) => {
        const result = await client.simulateChatMessage(args.tree_id, args.message, args.session_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    },
    {
      name: 'treeflow_list_conversations',
      description: 'Lista las conversaciones más recientes registradas en este bot.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
        },
        required: ['tree_id'],
      },
      handler: async (args: { tree_id: string }) => {
        const result = await client.listConversations(args.tree_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    },
    {
      name: 'treeflow_get_conversation',
      description: 'Obtiene los detalles completos y todos los turnos de mensaje (usuario y bot) de una conversación específica.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
          session_id: { type: 'string', description: 'ID de la sesión de conversación' },
        },
        required: ['tree_id', 'session_id'],
      },
      handler: async (args: { tree_id: string; session_id: string }) => {
        const result = await client.getConversation(args.tree_id, args.session_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    },
  ];
}
