import { maskSecrets } from '../client/treeflowClient.js';
import { ok } from './util.js';
const transferProps = {
    name: { type: 'string', description: 'Obligatorio al crear (máx. 100)' },
    description: { type: 'string' },
    endpoint_url: { type: 'string', description: 'Sistema externo que recibe la conversación. Vacío = sólo la mesa de ayuda de Treeflow' },
    auth_token: { type: 'string', description: 'Token para el sistema externo' },
    custom_headers: { type: 'object', description: 'Cabeceras HTTP extra' },
    include_history: { type: 'boolean', description: 'Enviar el historial (default true)' },
    history_format: { type: 'string', enum: ['json', 'text', 'markdown'], description: 'Default json' },
    agent_stops_listening: { type: 'boolean', description: 'El bot calla mientras atiende una persona (default true)' },
    persist_widget_chat: { type: 'boolean', description: 'El widget conserva el chat (default true)' },
    transfer_message: { type: 'string', description: 'Lo que ve el usuario al transferirse' },
    is_active: { type: 'boolean' },
};
export function registerTransferTools(client) {
    return [
        {
            name: 'treeflow_list_transfers',
            description: 'Lista las configuraciones de transferencia a humano del bot (derivar la conversación a un asesor). ' +
                'Los tokens salen enmascarados (***).',
            inputSchema: {
                type: 'object',
                properties: { tree_id: { type: 'string' } },
                required: ['tree_id'],
            },
            handler: async (a) => ok(maskSecrets(await client.listTransfers(a.tree_id))),
        },
        {
            name: 'treeflow_save_transfer',
            description: 'Crea (sin config_id) o modifica (con config_id) una configuración de transferencia a humano. Al modificar ' +
                'sólo hace falta mandar lo que cambia; un *** que devuelvas no pisa el token guardado.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string' },
                    config_id: { type: 'string', description: 'Para modificar. Sin él se crea una nueva' },
                    ...transferProps,
                },
                required: ['tree_id'],
            },
            handler: async (a) => {
                const { tree_id, config_id, ...fields } = a;
                if (config_id)
                    return ok(maskSecrets(await client.updateTransfer(tree_id, config_id, fields)));
                if (!fields.name)
                    throw new Error('Para crear una transferencia hace falta name (para modificar una, manda config_id).');
                return ok(maskSecrets(await client.createTransfer(tree_id, fields)));
            },
        },
        {
            name: 'treeflow_test_transfer',
            description: 'Prueba el envío de una transferencia: hace una petición real al endpoint externo configurado. ' +
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
            handler: async (a) => {
                const { tree_id, config_id, ...data } = a;
                return ok(maskSecrets(await client.testTransfer(tree_id, config_id, data)));
            },
        },
    ];
}
//# sourceMappingURL=transfers.js.map