import { TreeflowClient } from '../client/treeflowClient.js';
import { clip, testLine } from './resumen.js';
import { ok } from './util.js';

export function registerTrainingTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_trigger_training',
      description:
        'Reentrena el modelo NLU del bot con sus intenciones y entidades actuales y ESPERA a que termine: devuelve el ' +
        'resultado final (si quedó listo para usarse o el error). Con probar, al terminar manda esos mensajes al bot ' +
        '(cada uno en una conversación nueva) y dice qué intención ganó y qué contestó: entrenar y probar en una llamada.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID o nombre del bot' },
          probar: { type: 'array', items: { type: 'string' }, description: 'Mensajes de prueba tras entrenar' },
          force: { type: 'boolean', description: 'Default false: si no hubo cambios desde el último entrenamiento, el backend no reentrena. Con true entrena igual' },
          esperar_segundos: { type: 'integer', description: 'Máximo a esperar (default 90)' },
        },
        required: ['tree_id'],
      },
      handler: async (args: { tree_id: string; probar?: string[]; force?: boolean; esperar_segundos?: number }) => {
        const r = await client.trainAndWait(args.tree_id, {
          // Sin forzar por defecto. Se forzaba porque el backend comparaba la fecha del
          // último entrenamiento (UTC) con la de los cambios (hora local) y se saltaba
          // entrenamientos con intenciones nuevas. Desde treeflow 41326ce8 compara las dos
          // en UTC, y producción está en UTC (comprobado el 14-oct-2026), así que "sin
          // cambios" es fiable. Forzar reentrenaba el mismo modelo en cada llamada: CPU de
          // la Raspberry Pi de producción para nada.
          force: args.force ?? false,
          timeoutMs: Math.min(Math.max(args.esperar_segundos ?? 90, 5), 600) * 1000,
        });
        if (r.outcome === 'running') {
          return ok(`Sigue entrenando después de ${Math.round(r.seconds!)} s. Consulta treeflow_get_training_status más tarde.`);
        }
        const s = r.status ?? {};
        const lines: string[] = [];
        if (r.outcome === 'skipped') {
          lines.push(`Sin cambios desde el último entrenamiento: el backend no reentrenó, el modelo ya está al día (can_use ${s.can_use}). Con force=true entrena igual.`);
        } else {
          const summary = r.last?.changes_summary ?? {};
          const parts = [`Entrenamiento ${s.status === 'error' ? 'FALLIDO' : 'terminado'} en ${Math.round(r.seconds!)} s`, `estado ${s.status}`, `can_use ${s.can_use}`];
          if (summary.intents_total !== undefined) parts.push(`${summary.intents_total} intenciones, ${summary.entities_total ?? '?'} entidades`);
          if (r.last?.error_message) parts.push(`error${r.last.error_phase ? ` en ${r.last.error_phase}` : ''}: ${clip(r.last.error_message, 200)}`);
          lines.push(parts.join(' · '));
        }
        // Probar sólo tiene sentido con un modelo listo; sin cambios, el que hay lo está.
        if (args.probar?.length && s.can_use) {
          lines.push('Pruebas (cada una en una conversación nueva):');
          for (const message of args.probar) {
            try {
              lines.push(testLine(message, await client.simulateChatMessage(args.tree_id, message)));
            } catch (e: any) {
              lines.push(`- "${clip(message, 60)}" → error: ${clip(e?.response?.data?.detail ?? e?.message ?? e, 120)}`);
            }
          }
        }
        return ok(lines.join('\n'));
      },
    },
    {
      name: 'treeflow_get_training_status',
      description:
        'Estado del entrenamiento NLU de un bot: si está entrenando, al día, desactualizado (hay cambios sin entrenar) ' +
        'o con error, y si se puede usar (can_use).',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
        },
        required: ['tree_id'],
      },
      handler: async (args: { tree_id: string }) => ok(await client.getTrainingStatus(args.tree_id)),
    },
  ];
}
