import { DETAIL_HINT, branchOutline, canvasNames, leafLine } from './resumen.js';
import { ok } from './util.js';
export function registerLeafTools(client) {
    return [
        {
            name: 'treeflow_list_leafs',
            description: 'Esquema de las hojas de una rama: una línea por hoja con su tipo, ID, qué dice, qué escucha y a dónde va. ' +
                'El config completo de una hoja: treeflow_get_detail con tipo leaf.',
            inputSchema: {
                type: 'object',
                properties: {
                    branch_id: { type: 'string', description: 'ID de la rama' },
                },
                required: ['branch_id'],
            },
            handler: async (args) => {
                const branch = await client.getBranch(args.branch_id);
                // Los nombres de las plantillas permiten decir con cuál habla cada hoja.
                const templates = branch?.tree_id ? await client.listMessageTemplates(branch.tree_id).catch(() => []) : [];
                return ok(`${branchOutline(branch, canvasNames([branch], templates))}\n${DETAIL_HINT}`);
            },
        },
        {
            name: 'treeflow_create_leaf',
            description: 'Crea un nuevo nodo (leaf) dentro de una rama. Tipos soportados: message, input, condition, action, webhook, trigger_context.',
            inputSchema: {
                type: 'object',
                properties: {
                    branch_id: { type: 'string', description: 'ID de la rama' },
                    leaf_type: { type: 'string', description: 'Tipo de nodo: message, input, condition, action, webhook, trigger_context' },
                    name: { type: 'string', description: 'Nombre del nodo. Si se omite se usa el tipo.' },
                    config: {
                        type: 'object',
                        description: 'Configuración JSON del nodo (ej. plantilla de mensaje, opciones, condiciones)',
                    },
                    position_x: { type: 'number', description: 'Posición X en el lienzo (default 0)' },
                    position_y: { type: 'number', description: 'Posición Y en el lienzo (default 0)' },
                    is_start: { type: 'boolean', description: 'Marca el nodo como inicio de la rama' },
                },
                required: ['branch_id', 'leaf_type'],
            },
            handler: async (args) => {
                const result = await client.createLeaf(args.branch_id, {
                    name: args.name,
                    type: args.leaf_type,
                    config: args.config || {},
                    position_x: args.position_x,
                    position_y: args.position_y,
                    is_start: args.is_start,
                });
                return ok(`Hoja creada: ${leafLine(result, canvasNames([]))}`);
            },
        },
        {
            name: 'treeflow_update_leaf',
            description: 'Actualiza un nodo (leaf): nombre, tipo, posición o config. config se combina con el guardado: manda sólo ' +
                'las claves que cambian (ej. {"messageText": "…"}), una clave en null se borra, y lo demás se conserva. ' +
                'Una clave que es lista (intents, events) se sustituye completa. Para combinar hace falta branch_id o tree_id.',
            inputSchema: {
                type: 'object',
                properties: {
                    leaf_id: { type: 'string', description: 'ID del nodo (leaf)' },
                    branch_id: { type: 'string', description: 'Rama del nodo (o tree_id): para leer su config guardado' },
                    tree_id: { type: 'string', description: 'Bot del nodo, si no tienes branch_id' },
                    name: { type: 'string', description: 'Nuevo nombre del nodo' },
                    leaf_type: { type: 'string', description: 'Nuevo tipo de nodo' },
                    config: { type: 'object', description: 'Claves del config que cambian' },
                    replace_config: { type: 'boolean', description: 'true sustituye el config entero por el que mandas' },
                    position_x: { type: 'number', description: 'Nueva posición X en el lienzo' },
                    position_y: { type: 'number', description: 'Nueva posición Y en el lienzo' },
                    is_start: { type: 'boolean', description: 'Marca el nodo como inicio de la rama' },
                },
                required: ['leaf_id'],
            },
            handler: async (args) => {
                const result = await client.updateLeaf(args.leaf_id, {
                    name: args.name,
                    type: args.leaf_type,
                    config: args.config,
                    position_x: args.position_x,
                    position_y: args.position_y,
                    is_start: args.is_start,
                }, { branchId: args.branch_id, treeId: args.tree_id, replaceConfig: args.replace_config });
                return ok(`Hoja actualizada: ${leafLine(result, canvasNames([]))}`);
            },
        },
        {
            name: 'treeflow_delete_leaf',
            description: 'Elimina un nodo (leaf) del canvas.',
            inputSchema: {
                type: 'object',
                properties: {
                    leaf_id: { type: 'string', description: 'ID del nodo a eliminar' },
                },
                required: ['leaf_id'],
            },
            handler: async (args) => {
                const result = await client.deleteLeaf(args.leaf_id);
                return ok(result);
            },
        },
    ];
}
//# sourceMappingURL=leafs.js.map