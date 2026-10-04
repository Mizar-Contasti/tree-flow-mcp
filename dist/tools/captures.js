import { ok } from './util.js';
const captureProps = {
    name: { type: 'string', description: 'Nombre único dentro del bot (el servidor lo sanea y añade _2, _3 si se repite)' },
    prompt: { type: 'string', description: 'La pregunta que hace el bot. Admite { $variable }' },
    prompt_rich: { type: 'boolean', description: 'true si la pregunta usa bloques enriquecidos (prompt_blocks)' },
    prompt_blocks: { type: 'array', items: { type: 'object' }, description: 'Bloques enriquecidos de la pregunta' },
    prompt_responses: { type: 'array', items: { type: 'object' }, description: 'Respuestas por canal/idioma de la pregunta' },
    prompt_template_id: { type: 'string', description: 'ID de una plantilla de mensaje para usar como pregunta' },
    fallback: { type: 'string', description: 'Lo que dice si la respuesta no sirve' },
    fallback_rich: { type: 'boolean' },
    fallback_blocks: { type: 'array', items: { type: 'object' } },
    fallback_responses: { type: 'array', items: { type: 'object' } },
    fallback_template_id: { type: 'string' },
    limit: { type: 'integer', description: 'Cuántas veces insiste antes de aplicar on_limit_action (default 1)' },
    on_limit_action: {
        type: 'string',
        enum: ['next_param', 'respond_anyway', 'skip_to_context'],
        description: 'Al llegar al límite: pasar al siguiente parámetro, responder igual, o saltar al contexto',
    },
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
            name: 'treeflow_create_capture',
            description: 'Crea una captura (pregunta reutilizable). Máximo 200 por bot. Afecta al motor al instante, sin reentrenar.',
            inputSchema: {
                type: 'object',
                properties: { tree_id: { type: 'string' }, ...captureProps },
                required: ['tree_id', 'name'],
            },
            handler: async (a) => {
                const { tree_id, ...data } = a;
                return ok(await client.createCapture(tree_id, data));
            },
        },
        {
            name: 'treeflow_update_capture',
            description: 'Modifica una captura (por id o nombre). Sólo hace falta mandar lo que cambia; el resto se conserva.',
            inputSchema: {
                type: 'object',
                properties: { tree_id: { type: 'string' }, capture_ref: { type: 'string', description: 'ID o nombre' }, ...captureProps },
                required: ['tree_id', 'capture_ref'],
            },
            handler: async (a) => {
                const { tree_id, capture_ref, ...patch } = a;
                return ok(await client.updateCapture(tree_id, capture_ref, patch));
            },
        },
        {
            name: 'treeflow_delete_capture',
            description: 'Elimina una captura (por id o nombre). Los parámetros que la usaban se quedan sin pregunta.',
            inputSchema: {
                type: 'object',
                properties: { tree_id: { type: 'string' }, capture_ref: { type: 'string', description: 'ID o nombre' } },
                required: ['tree_id', 'capture_ref'],
            },
            handler: async (a) => ok(await client.deleteCapture(a.tree_id, a.capture_ref)),
        },
    ];
}
//# sourceMappingURL=captures.js.map