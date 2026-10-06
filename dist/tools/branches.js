import { branchLine, branchOutline, canvasNames } from './resumen.js';
import { ok } from './util.js';
export function registerBranchTools(client) {
    return [
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
            handler: async (args) => {
                const result = await client.createBranch(args.tree_id, {
                    name: args.name,
                    description: args.description,
                    is_default: args.is_default,
                });
                // Con su hoja Start: es el ID que hace falta para seguir armando la rama.
                return ok(`Rama creada:\n${branchOutline(result, canvasNames([result]))}`);
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
            handler: async (args) => {
                const result = await client.updateBranch(args.branch_id, {
                    name: args.name,
                    description: args.description,
                    is_default: args.is_default,
                });
                return ok(`Rama actualizada: ${branchLine(result, canvasNames([result]))}`);
            },
        },
    ];
}
//# sourceMappingURL=branches.js.map