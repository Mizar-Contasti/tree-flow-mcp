import { TreeflowClient } from '../client/treeflowClient.js';

export function registerLeafTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_list_leafs',
      description: 'Lista todos los nodos (leafs) dentro de una rama específica del canvas.',
      inputSchema: {
        type: 'object',
        properties: {
          branch_id: { type: 'string', description: 'ID de la rama' },
        },
        required: ['branch_id'],
      },
      handler: async (args: { branch_id: string }) => {
        const leafs = await client.listLeafs(args.branch_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(leafs, null, 2) }],
        };
      },
    },
    {
      name: 'treeflow_create_leaf',
      description: 'Crea un nuevo nodo (leaf) dentro de una rama. Tipos soportados: message, input, condition, action, webhook, trigger_context.',
      inputSchema: {
        type: 'object',
        properties: {
          branch_id: { type: 'string', description: 'ID de la rama' },
          leaf_type: { type: 'string', description: 'Tipo de nodo: message, input, condition, action, webhook, trigger_context' },
          config: {
            type: 'object',
            description: 'Configuración JSON del nodo (ej. plantilla de mensaje, opciones, condiciones)',
          },
          canvas_position: {
            type: 'object',
            description: 'Posición x, y en el lienzo { x: number, y: number }',
          },
        },
        required: ['branch_id', 'leaf_type'],
      },
      handler: async (args: { branch_id: string; leaf_type: string; config?: any; canvas_position?: any }) => {
        const result = await client.createLeaf(args.branch_id, {
          leaf_type: args.leaf_type,
          config: args.config || {},
          canvas_position: args.canvas_position,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    },
    {
      name: 'treeflow_update_leaf',
      description: 'Actualiza el contenido, configuración o posición de un nodo (leaf) existente.',
      inputSchema: {
        type: 'object',
        properties: {
          leaf_id: { type: 'string', description: 'ID del nodo (leaf)' },
          config: { type: 'object', description: 'Nueva configuración del nodo' },
          canvas_position: { type: 'object', description: 'Nueva posición { x, y }' },
        },
        required: ['leaf_id'],
      },
      handler: async (args: { leaf_id: string; config?: any; canvas_position?: any }) => {
        const result = await client.updateLeaf(args.leaf_id, {
          config: args.config,
          canvas_position: args.canvas_position,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    },
    {
      name: 'treeflow_delete_leaf',
      description: 'Elimina un nodo (leaf) del canvas.',
      inputSchema: {
        type: 'object',
        properties: {
          leaf_id: { type: 'string', description: 'ID del nodo a eliminar' },
        },
        required: ['leaf_id'],
      },
      handler: async (args: { leaf_id: string }) => {
        const result = await client.deleteLeaf(args.leaf_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    },
  ];
}
