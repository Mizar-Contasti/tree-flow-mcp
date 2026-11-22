import { ok } from './util.js';
// Un borrado por tipo en una sola herramienta, como treeflow_get_detail: diez herramientas
// casi iguales pesaban en el catálogo en cada llamada.
const KINDS = ['branch', 'leaf', 'intent', 'entity', 'template', 'tool', 'script', 'capture', 'transfer', 'test_suite', 'condition', 'sql_query', 'sql_connection'];
const remove = {
    branch: (c, _t, ref) => c.deleteBranch(ref),
    leaf: (c, _t, ref) => c.deleteLeaf(ref),
    intent: (c, t, ref) => c.deleteIntent(t, ref),
    entity: (c, t, ref) => c.deleteEntity(t, ref),
    template: (c, _t, ref) => c.deleteMessageTemplate(ref),
    tool: (c, t, ref) => c.deleteTool(t, ref),
    script: (c, t, ref) => c.deleteScript(t, ref),
    capture: (c, t, ref) => c.deleteCapture(t, ref),
    transfer: (c, t, ref) => c.deleteTransfer(t, ref),
    test_suite: (c, _t, ref) => c.deleteTestSuite(ref),
    sql_query: (c, t, ref) => c.deleteSql(t, 'consulta', ref),
    sql_connection: (c, t, ref) => c.deleteSql(t, 'conexión', ref),
    condition: async (c, t, ref) => c.deleteCondition((await c.findCondition(t, ref)).condicion_id),
};
export function registerDeleteTools(client) {
    return [
        {
            name: 'treeflow_delete',
            description: 'Borra UNA pieza del bot. Es irreversible: confírmalo con el usuario antes. tipo: branch (con todas sus ' +
                'hojas), leaf, intent, entity, template, tool (API), script, capture, transfer, condition (las reglas que la usan se quedan como propias), sql_query, sql_connection (si ninguna ' +
                'consulta la usa) o test_suite (con su historial). ref es el ID; tool, script, capture, condition y sql_* aceptan también el nombre. Borrar intenciones o entidades obliga a ' +
                'reentrenar. Los bots y los usuarios no se borran desde aquí.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot' },
                    tipo: { type: 'string', enum: [...KINDS] },
                    ref: { type: 'string', description: 'ID de la pieza' },
                },
                required: ['tree_id', 'tipo', 'ref'],
            },
            handler: async (a) => {
                if (!KINDS.includes(a.tipo))
                    throw new Error(`tipo debe ser uno de: ${KINDS.join(', ')}`);
                const res = await remove[a.tipo](client, a.tree_id, a.ref);
                const nodes = typeof res?.nodos_actualizados === 'number' ? ` (${res.nodos_actualizados} nodo(s) quedan con la regla propia)` : '';
                return ok(`Borrado: ${a.tipo} ${a.ref}${nodes}`);
            },
        },
    ];
}
//# sourceMappingURL=delete.js.map