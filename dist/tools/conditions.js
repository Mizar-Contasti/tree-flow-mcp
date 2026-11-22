import { clip } from './resumen.js';
import { ok } from './util.js';
const line = (c) => `- ${c.name} [${c.condicion_id}] · ${c.expression} · ${c.usos ?? 0} nodo(s)${c.description ? ` · ${clip(c.description, 60)}` : ''}`;
export function registerConditionTools(client) {
    return [
        {
            name: 'treeflow_list_conditions',
            description: 'Lista las condiciones guardadas del bot (reglas con nombre que varios nodos comparten): nombre, ID, expresión y ' +
                'en cuántos nodos se usan. Cómo ponerlas en un nodo: treeflow_guide("condiciones").',
            inputSchema: {
                type: 'object',
                properties: { tree_id: { type: 'string' } },
                required: ['tree_id'],
            },
            handler: async (a) => {
                const all = await client.listConditions(a.tree_id);
                return ok([`Condiciones (${all.length}):`, ...all.map(line)].join('\n'));
            },
        },
        {
            name: 'treeflow_save_condition',
            description: 'Crea (sin condition_ref) o modifica (con condition_ref: ID o nombre) una condición guardada. Al modificarla, su ' +
                'expresión y nombre se copian a todos los nodos que la usan, al instante y sin reentrenar; dice a cuántos. ' +
                'expression en el lenguaje de plantillas, ej. $edad >= 18 · $plan == "pro" · "vip" in $nota. Se borra con treeflow_delete(tipo condition).',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string' },
                    condition_ref: { type: 'string', description: 'Para modificar: ID o nombre. Sin él se crea una nueva' },
                    name: { type: 'string', description: 'Obligatorio al crear; único dentro del bot' },
                    expression: { type: 'string', description: 'Se cumple cuando… Obligatoria al crear' },
                    description: { type: 'string', description: 'Para qué sirve (null la borra)' },
                },
                required: ['tree_id'],
            },
            handler: async (a) => {
                const { tree_id, condition_ref, ...fields } = a;
                if (condition_ref) {
                    const current = await client.findCondition(tree_id, condition_ref);
                    const r = await client.updateCondition(current.condicion_id, fields);
                    return ok(`Condición actualizada, ${r.nodos_actualizados ?? 0} nodo(s) al día:\n${line(r)}`);
                }
                if (!fields.name || !fields.expression)
                    throw new Error('Para crear una condición hacen falta name y expression (para modificar una, manda condition_ref).');
                return ok(`Condición creada:\n${line(await client.createCondition(tree_id, fields))}`);
            },
        },
    ];
}
//# sourceMappingURL=conditions.js.map