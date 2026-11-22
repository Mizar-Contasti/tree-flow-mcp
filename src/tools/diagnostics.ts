import { TreeflowClient } from '../client/treeflowClient.js';
import { canvasNames, conversationSummary, conversationsList, simulationSummary } from './resumen.js';
import { ok } from './util.js';

export function registerDiagnosticTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_simulate_message',
      description:
        'Envía un mensaje de prueba al bot y devuelve lo que contestó, la intención detectada con su confianza y por qué ' +
        'casó (qué entidad, sinónimo o patrón; con quién empató y por qué ganó), la ' +
        'hoja en la que quedó (y el recorrido si pasó por varias), los parámetros capturados, qué scripts, APIs y SQL ' +
        'corrieron (con qué entradas, cuáles llegaron vacías, qué guardaron y con qué nombre), qué regla de condición ' +
        'se cumplió y el session_id. Sirve para validar un flujo recién armado. Para seguir la misma conversación, ' +
        'manda ese session_id en el siguiente mensaje.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
          message: { type: 'string', description: 'El mensaje de texto que el usuario escribe al bot' },
          session_id: { type: 'string', description: 'ID de sesión para seguir una conversación (opcional; sin él empieza una nueva)' },
        },
        required: ['tree_id', 'message'],
      },
      handler: async (args: { tree_id: string; message: string; session_id?: string }) => {
        const r = await client.simulateChatMessage(args.tree_id, args.message, args.session_id);
        // Los nombres de los nodos por los que pasó, sólo si pasó por alguno (una lectura más).
        let names: Map<string, string> | undefined;
        if (r?.posicion_final?.camino?.length) {
          names = canvasNames(await client.listBranches(args.tree_id).catch(() => [])).leaves;
        }
        return ok(simulationSummary(r, names));
      },
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
      handler: async (args: { tree_id: string; [key: string]: any }) => {
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
      handler: async (args: { tree_id: string; session_id: string }) =>
        ok(conversationSummary(await client.getConversation(args.tree_id, args.session_id))),
    },
  ];
}
