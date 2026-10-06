import { entityLine } from './resumen.js';
import { inBatch, ok } from './util.js';
export function registerEntityTools(client) {
    return [
        {
            name: 'treeflow_create_entity',
            description: 'Crea una o varias entidades NLU en una sola llamada: simple (valores con sinónimos), composite o regex. Si ' +
                'una falla, las demás se crean igual y se dice cuál falló. Después hay que reentrenar.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    entities: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string', description: 'Nombre (ej. tipo_habitacion)' },
                                type: { type: 'string', enum: ['simple', 'composite', 'regex'], description: 'Default: simple' },
                                values: {
                                    type: 'array',
                                    description: 'Valores canónicos con sus sinónimos (simple/composite)',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            key: { type: 'string', description: 'Valor canónico' },
                                            synonyms: { type: 'array', items: { type: 'string' } },
                                            entity: { type: 'string', description: 'Sub-entidad si es compuesta' },
                                        },
                                    },
                                },
                                pattern: { type: 'string', description: 'Patrón si es regex (ej. ^[0-9]{5}$)' },
                            },
                            required: ['name'],
                        },
                    },
                },
                required: ['tree_id', 'entities'],
            },
            handler: async (args) => ok(await inBatch('Entidades', args.entities, (e) => e.name, async (e) => entityLine(await client.createEntity(args.tree_id, { ...e, type: e.type || 'simple', values: e.values || [] })))),
        },
        {
            name: 'treeflow_update_entity',
            description: 'Actualiza una entidad: nombre, tipo, valores o patrón regex. Lo que no mandes se conserva. Para añadir ' +
                'valores (o sinónimos a uno existente) usa add_values, y para quitarlos remove_values: no hace falta leerlos ' +
                'antes. values, si lo mandas, sustituye la lista completa. Después hay que reentrenar.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    entity_id: { type: 'string', description: 'ID de la entidad' },
                    name: { type: 'string', description: 'Nuevo nombre' },
                    type: { type: 'string', enum: ['simple', 'composite', 'regex'], description: 'Tipo de entidad' },
                    add_values: {
                        type: 'array',
                        description: 'Valores a añadir; si el valor ya existe, se le suman los sinónimos',
                        items: {
                            type: 'object',
                            properties: { key: { type: 'string' }, synonyms: { type: 'array', items: { type: 'string' } } },
                            required: ['key'],
                        },
                    },
                    remove_values: { type: 'array', items: { type: 'string' }, description: 'Valores canónicos (key) a quitar' },
                    values: {
                        type: 'array',
                        description: 'Sustituye TODOS los valores',
                        items: {
                            type: 'object',
                            properties: {
                                key: { type: 'string' },
                                value: { type: 'string' },
                                synonyms: { type: 'array', items: { type: 'string' } },
                                entity: { type: 'string' },
                            },
                        },
                    },
                    pattern: { type: 'string', description: 'Nuevo patrón regex' },
                },
                required: ['tree_id', 'entity_id'],
            },
            handler: async (args) => {
                const result = await client.updateEntity(args.tree_id, args.entity_id, {
                    name: args.name,
                    type: args.type,
                    values: args.values,
                    pattern: args.pattern,
                    add_values: args.add_values,
                    remove_values: args.remove_values,
                });
                return ok(`Entidad actualizada: ${entityLine(result)}`);
            },
        },
    ];
}
//# sourceMappingURL=entities.js.map