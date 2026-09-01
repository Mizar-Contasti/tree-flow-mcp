import { TreeflowClient } from '../client/treeflowClient.js';

export function registerFertilizerTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_list_fertilizers',
      description: 'Lista todas las herramientas adicionales (fertilizantes), scripts personalizados y configuraciones de Knowledge Base (RAG) de un bot.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
        },
        required: ['tree_id'],
      },
      handler: async (args: { tree_id: string }) => {
        const result = await client.listFertilizers(args.tree_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    },
    {
      name: 'treeflow_create_fertilizer',
      description: 'Crea o agrega una nueva herramienta / fertilizante adicional (ej. automation, external_api, knowledge_base).',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
          name: { type: 'string', description: 'Nombre descriptivo de la herramienta' },
          fertilizer_type: { type: 'string', description: 'Tipo: automation, external_api, knowledge_base' },
          config: { type: 'object', description: 'Configuración JSON de la herramienta (url, headers, auth, etc.)' },
        },
        required: ['tree_id', 'name', 'fertilizer_type', 'config'],
      },
      handler: async (args: { tree_id: string; name: string; fertilizer_type: string; config: any }) => {
        const current = await client.listFertilizers(args.tree_id);
        const additionalTools = current?.additionalFertilizers || current?.additional_tools || [];
        const newTool = {
          id: `fert_${Date.now()}`,
          name: args.name,
          type: args.fertilizer_type,
          config: args.config,
        };
        additionalTools.push(newTool);
        const updated = await client.updateFertilizerConfig(args.tree_id, {
          ...current,
          additionalFertilizers: additionalTools,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, tool: newTool, updated }, null, 2) }],
        };
      },
    },
    {
      name: 'treeflow_delete_fertilizer',
      description: 'Elimina una herramienta o fertilizante adicional por su ID.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
          fertilizer_id: { type: 'string', description: 'ID de la herramienta a eliminar' },
        },
        required: ['tree_id', 'fertilizer_id'],
      },
      handler: async (args: { tree_id: string; fertilizer_id: string }) => {
        const current = await client.listFertilizers(args.tree_id);
        let additionalTools = current?.additionalFertilizers || current?.additional_tools || [];
        additionalTools = additionalTools.filter((t: any) => t.id !== args.fertilizer_id);
        const updated = await client.updateFertilizerConfig(args.tree_id, {
          ...current,
          additionalFertilizers: additionalTools,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Herramienta eliminada', updated }, null, 2) }],
        };
      },
    },
  ];
}
