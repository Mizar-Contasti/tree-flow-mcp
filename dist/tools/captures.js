import { ok } from './util.js';
const captureProps = {
    name: { type: 'string', description: 'Obligatorio al crear; único dentro del bot' },
    prompt: { type: 'string', description: 'La pregunta que hace el bot. Admite { $variable }' },
    prompt_rich: { type: 'boolean', description: 'true si la pregunta usa prompt_blocks' },
    prompt_blocks: { type: 'array', items: { type: 'object' } },
    prompt_responses: { type: 'array', items: { type: 'object' } },
    prompt_template_id: { type: 'string', description: 'Plantilla de mensaje a usar como pregunta' },
    fallback: { type: 'string', description: 'Lo que dice si la respuesta no sirve' },
    fallback_rich: { type: 'boolean' },
    fallback_blocks: { type: 'array', items: { type: 'object' } },
    fallback_responses: { type: 'array', items: { type: 'object' } },
    fallback_template_id: { type: 'string' },
    limit: { type: 'integer', description: 'Cuántas veces insiste (default 1)' },
    on_limit_action: { type: 'string', enum: ['next_param', 'respond_anyway', 'skip_to_context'] },
};
export function registerCaptureTools(client) {
    return [
        {
            name: 'treeflow_list_captures',
            description: 'Lista las capturas del bot: plantillas de pregunta reutilizables del slot filling. Varios parámetros de intenciones ' +
                'pueden apuntar a la misma captura, así que cambiar una afecta a todos.',
            inputSchema: {
                type: 'object',
                properties: { tree_id: { type: 'string' } },
                required: ['tree_id'],
            },
            handler: async (a) => ok(await client.listCaptures(a.tree_id)),
        },
        {
            name: 'treeflow_get_capture',
            description: 'Obtiene una captura por id o nombre.',
            inputSchema: {
                type: 'object',
                properties: { tree_id: { type: 'string' }, capture_ref: { type: 'string', description: 'ID o nombre' } },
                required: ['tree_id', 'capture_ref'],
            },
            handler: async (a) => ok(await client.getCapture(a.tree_id, a.capture_ref)),
        },
        {
            name: 'treeflow_save_capture',
            description: 'Crea (sin capture_ref) o modifica (con capture_ref: ID o nombre) una captura: la pregunta reutilizable del ' +
                'slot filling, su texto de respaldo, cuántas veces insiste y qué hace al llegar al límite. Al modificar sólo ' +
                'hace falta mandar lo que cambia. Surte efecto al instante, sin reentrenar. Máximo 200 por bot.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string' },
                    capture_ref: { type: 'string', description: 'Para modificar: ID o nombre. Sin él se crea una nueva' },
                    ...captureProps,
                },
                required: ['tree_id'],
            },
            handler: async (a) => {
                const { tree_id, capture_ref, ...fields } = a;
                if (capture_ref)
                    return ok(await client.updateCapture(tree_id, capture_ref, fields));
                if (!fields.name)
                    throw new Error('Para crear una captura hace falta name (para modificar una, manda capture_ref).');
                return ok(await client.createCapture(tree_id, fields));
            },
        },
    ];
}
//# sourceMappingURL=captures.js.map