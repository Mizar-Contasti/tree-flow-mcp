import { TreeflowClient } from '../client/treeflowClient.js';
import { branchesSummary } from './resumen.js';
import { ok } from './util.js';

export function registerBranchTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_list_branches',
      description:
        'Lista las ramas (flujos del canvas) de un bot, sin sus hojas: sólo cuántas tiene cada una y cuál es la de ' +
        'inicio. Las hojas de una rama: treeflow_list_leafs.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
        },
        required: ['tree_id'],
      },
      handler: async (args: { tree_id: string }) => ok(branchesSummary(await client.listBranches(args.tree_id))),
    },
    {
      name: 'treeflow_create_branch',
      description: 'Crea una nueva rama (flujo del canvas) dentro de un bot.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
          name: { type: 'string', description: 'Nombre de la rama (ej. Bienvenida, Reservas, FAQ)' },
          description: { type: 'string', description: 'Descripción opcional' },
          is_default: { type: 'boolean', description: 'Marca la rama como flujo por defecto del bot' },
        },
        required: ['tree_id', 'name'],
      },
      handler: async (args: { tree_id: string; name: string; description?: string; is_default?: boolean }) => {
        const result = await client.createBranch(args.tree_id, {
          name: args.name,
          description: args.description,
          is_default: args.is_default,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    },
    {
      name: 'treeflow_update_branch',
      description: 'Actualiza el nombre o descripción de una rama.',
      inputSchema: {
        type: 'object',
        properties: {
          branch_id: { type: 'string', description: 'ID de la rama' },
          name: { type: 'string', description: 'Nuevo nombre' },
          description: { type: 'string', description: 'Nueva descripción' },
          is_default: { type: 'boolean', description: 'Marca la rama como flujo por defecto del bot' },
        },
        required: ['branch_id'],
      },
      handler: async (args: { branch_id: string; name?: string; description?: string; is_default?: boolean }) => {
        const result = await client.updateBranch(args.branch_id, {
          name: args.name,
          description: args.description,
          is_default: args.is_default,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    },
    {
      name: 'treeflow_delete_branch',
      description: 'Elimina una rama y todos sus nodos asociados.',
      inputSchema: {
        type: 'object',
        properties: {
          branch_id: { type: 'string', description: 'ID de la rama a eliminar' },
        },
        required: ['branch_id'],
      },
      handler: async (args: { branch_id: string }) => {
        const result = await client.deleteBranch(args.branch_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    },
  ];
}
