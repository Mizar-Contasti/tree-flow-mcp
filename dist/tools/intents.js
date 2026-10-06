import { paramsNeedEntities } from '../client/treeflowClient.js';
import { intentLine } from './resumen.js';
import { inBatch, ok } from './util.js';
// Esquema de los parámetros de una intención, compartido por crear y actualizar.
// La entidad va por nombre: el cliente la resuelve a su ID, que es lo que guarda el backend.
const paramItem = {
    type: 'object',
    properties: {
        parameterName: { type: 'string', description: 'La variable, {$parameterName} (default: el nombre de la entidad)' },
        entity: { type: 'string', description: 'Entidad por nombre (ej. color) o de sistema (sys.number, sys.date…)' },
        required: { type: 'boolean', description: 'Si falta, el bot lo pregunta' },
        prompt: { type: 'string', description: 'La pregunta si falta. Admite {$variable}' },
        capture_id: { type: 'string', description: 'Captura que da pregunta, respaldo y límite' },
    },
};
export function registerIntentTools(client) {
    return [
        {
            name: 'treeflow_create_intent',
            description: 'Crea una o varias intenciones NLU en una sola llamada, cada una con sus frases de entrenamiento y sus ' +
                'parámetros (slots). Si una falla, las demás se crean igual y se dice cuál falló. Después hay que reentrenar.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    intents: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string', description: 'Nombre único (ej. reservar_mesa)' },
                                patterns: { type: 'array', items: { type: 'string' }, description: 'Frases de entrenamiento; entidades como @nombre' },
                                entities: { type: 'array', items: { ...paramItem, required: ['entity'] }, description: 'Parámetros a extraer' },
                                type: { type: 'string', description: 'conversational (default) o contextual' },
                            },
                            required: ['name', 'patterns'],
                        },
                    },
                },
                required: ['tree_id', 'intents'],
            },
            handler: async (args) => {
                // Las entidades del bot se leen una vez para todo el lote, y sólo si hacen falta.
                const known = (args.intents ?? []).some((i) => paramsNeedEntities(i.entities))
                    ? await client.listEntities(args.tree_id)
                    : undefined;
                return ok(await inBatch('Intenciones', args.intents, (i) => i.name, async (i) => intentLine(await client.createIntent(args.tree_id, { ...i, type: i.type || 'conversational' }, known))));
            },
        },
        {
            name: 'treeflow_update_intent',
            description: 'Actualiza una intención: nombre, frases o parámetros. Lo que no mandes se conserva. Para añadir o quitar ' +
                'frases usa add_patterns / remove_patterns (no hace falta leerlas antes); patterns y entities, si los ' +
                'mandas, sustituyen la lista completa. Un parámetro que ya existía (mismo parameterName) conserva lo que ' +
                'no mandes de él. Después hay que reentrenar.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    intent_id: { type: 'string', description: 'ID de la intención' },
                    name: { type: 'string', description: 'Nuevo nombre' },
                    add_patterns: { type: 'array', items: { type: 'string' }, description: 'Frases a añadir (las repetidas se ignoran)' },
                    remove_patterns: { type: 'array', items: { type: 'string' }, description: 'Frases a quitar, escritas igual' },
                    patterns: { type: 'array', items: { type: 'string' }, description: 'Sustituye TODAS las frases' },
                    entities: { type: 'array', items: paramItem, description: 'Sustituye TODOS los parámetros' },
                },
                required: ['tree_id', 'intent_id'],
            },
            handler: async (args) => {
                const result = await client.updateIntent(args.tree_id, args.intent_id, {
                    name: args.name,
                    patterns: args.patterns,
                    entities: args.entities,
                    add_patterns: args.add_patterns,
                    remove_patterns: args.remove_patterns,
                });
                return ok(`Intención actualizada: ${intentLine(result)}`);
            },
        },
    ];
}
//# sourceMappingURL=intents.js.map