import { TreeflowClient } from '../client/treeflowClient.js';
import { ok } from './util.js';

export function registerTrainingTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_trigger_training',
      description: 'Inicia el re-entrenamiento del modelo de Machine Learning y NLU de un bot con las intenciones y entidades actuales.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol a entrenar' },
        },
        required: ['tree_id'],
      },
      handler: async (args: { tree_id: string }) => {
        const result = await client.triggerTraining(args.tree_id);
        return ok(result);
      },
    },
    {
      name: 'treeflow_get_training_status',
      description: 'Consulta el estado actual del entrenamiento NLU de un bot (en progreso, completado, métricas).',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
        },
        required: ['tree_id'],
      },
      handler: async (args: { tree_id: string }) => {
        const status = await client.getTrainingStatus(args.tree_id);
        return ok(status);
      },
    },
  ];
}
