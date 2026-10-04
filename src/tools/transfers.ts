import { TreeflowClient, maskSecrets } from '../client/treeflowClient.js';
import { ok } from './util.js';

const transferProps = {
  name: { type: 'string', description: 'Nombre de la configuración (máx. 100)' },
  description: { type: 'string' },
  endpoint_url: {
    type: 'string',
    description: 'URL del sistema externo (helpdesk) que recibe la conversación. Vacío = sólo la mesa de ayuda interna de Treeflow',
  },
  auth_token: { type: 'string', description: 'Token para el sistema externo' },
  custom_headers: { type: 'object', description: 'Cabeceras HTTP extra' },
  include_history: { type: 'boolean', description: 'Enviar el historial de la conversación (default true)' },
  history_format: { type: 'string', enum: ['json', 'text', 'markdown'], description: 'Default json' },
  agent_stops_listening: { type: 'boolean', description: 'El bot deja de contestar mientras atiende una persona (default true)' },
  persist_widget_chat: { type: 'boolean', description: 'El widget conserva el chat tras la transferencia (default true)' },
  transfer_message: { type: 'string', description: 'Lo que ve el usuario al transferirse' },
  is_active: { type: 'boolean' },
};

export function registerTransferTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_list_transfers',
      description:
        'Lista las configuraciones de transferencia a humano del bot (derivar la conversación a un asesor). ' +
        'Los tokens salen enmascarados (***).',
      inputSchema: {
        type: 'object',
        properties: { tree_id: { type: 'string' } },
        required: ['tree_id'],
      },
      handler: async (a: { tree_id: string }) => ok(maskSecrets(await client.listTransfers(a.tree_id))),
    },
    {
      name: 'treeflow_create_transfer',
      description: 'Crea una configuración de transferencia a humano.',
      inputSchema: {
        type: 'object',
        properties: { tree_id: { type: 'string' }, ...transferProps },
        required: ['tree_id', 'name'],
      },
      handler: async (a: any) => {
        const { tree_id, ...data } = a;
        return ok(maskSecrets(await client.createTransfer(tree_id, data)));
      },
    },
    {
      name: 'treeflow_update_transfer',
      description: 'Modifica una configuración de transferencia. Sólo hace falta mandar lo que cambia; el resto se conserva.',
      inputSchema: {
        type: 'object',
        properties: { tree_id: { type: 'string' }, config_id: { type: 'string' }, ...transferProps },
        required: ['tree_id', 'config_id'],
      },
      handler: async (a: any) => {
        const { tree_id, config_id, ...patch } = a;
        return ok(maskSecrets(await client.updateTransfer(tree_id, config_id, patch)));
      },
    },
    {
      name: 'treeflow_delete_transfer',
      description: 'Elimina una configuración de transferencia a humano.',
      inputSchema: {
        type: 'object',
        properties: { tree_id: { type: 'string' }, config_id: { type: 'string' } },
        required: ['tree_id', 'config_id'],
      },
      handler: async (a: { tree_id: string; config_id: string }) => ok(await client.deleteTransfer(a.tree_id, a.config_id)),
    },
    {
      name: 'treeflow_test_transfer',
      description:
        'Prueba el envío de una transferencia: hace una petición real al endpoint externo configurado. ' +
        'Sin parámetros usa lo guardado; con ellos prueba valores distintos sin guardarlos.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string' },
          config_id: { type: 'string' },
          endpoint_url: { type: 'string' },
          auth_token: { type: 'string' },
          custom_headers: { type: 'object' },
          history_format: { type: 'string', enum: ['json', 'text', 'markdown'] },
        },
        required: ['tree_id', 'config_id'],
      },
      handler: async (a: any) => {
        const { tree_id, config_id, ...data } = a;
        return ok(await client.testTransfer(tree_id, config_id, data));
      },
    },
  ];
}
