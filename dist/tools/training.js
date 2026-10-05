import { clip } from './resumen.js';
import { ok } from './util.js';
export function registerTrainingTools(client) {
    return [
        {
            name: 'treeflow_trigger_training',
            description: 'Reentrena el modelo NLU del bot con sus intenciones y entidades actuales y ESPERA a que termine: devuelve el ' +
                'resultado final (si quedó listo para usarse o el error). No hace falta consultar el estado después.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol a entrenar' },
                    force: { type: 'boolean', description: 'Default true. Con false, el backend no entrena si cree que no hubo cambios' },
                    esperar_segundos: { type: 'integer', description: 'Máximo a esperar (default 90)' },
                },
                required: ['tree_id'],
            },
            handler: async (args) => {
                const r = await client.trainAndWait(args.tree_id, {
                    // Forzado por defecto: el backend decide "sin cambios" comparando la fecha del
                    // último entrenamiento (UTC) con la de los cambios (hora local), y durante horas
                    // se salta entrenamientos con intenciones nuevas. Repetir uno cuesta segundos;
                    // saltarse uno deja los cambios sin efecto y sin aviso.
                    force: args.force ?? true,
                    timeoutMs: Math.min(Math.max(args.esperar_segundos ?? 90, 5), 600) * 1000,
                });
                if (r.outcome === 'skipped') {
                    return ok(`El backend no vio cambios y no entrenó (pediste force=false). can_use: ${r.status?.can_use}.`);
                }
                if (r.outcome === 'running') {
                    return ok(`Sigue entrenando después de ${Math.round(r.seconds)} s. Consulta treeflow_get_training_status más tarde.`);
                }
                const s = r.status ?? {};
                const summary = r.last?.changes_summary ?? {};
                const parts = [`Entrenamiento ${s.status === 'error' ? 'FALLIDO' : 'terminado'} en ${Math.round(r.seconds)} s`, `estado ${s.status}`, `can_use ${s.can_use}`];
                if (summary.intents_total !== undefined)
                    parts.push(`${summary.intents_total} intenciones, ${summary.entities_total ?? '?'} entidades`);
                if (r.last?.error_message)
                    parts.push(`error${r.last.error_phase ? ` en ${r.last.error_phase}` : ''}: ${clip(r.last.error_message, 200)}`);
                return ok(parts.join(' · '));
            },
        },
        {
            name: 'treeflow_get_training_status',
            description: 'Estado del entrenamiento NLU de un bot: si está entrenando, al día, desactualizado (hay cambios sin entrenar) ' +
                'o con error, y si se puede usar (can_use).',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                },
                required: ['tree_id'],
            },
            handler: async (args) => ok(await client.getTrainingStatus(args.tree_id)),
        },
    ];
}
//# sourceMappingURL=training.js.map