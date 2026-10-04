import { ok } from './util.js';
export function registerBackupTools(client) {
    return [
        {
            name: 'treeflow_export_tree',
            description: 'Exporta el bot completo como JSON (ramas, hojas, intenciones, entidades, plantillas, y también scripts y herramientas). ' +
                'Las conversaciones solo se incluyen con include_conversations=true. Pesa: úsalo para copiar o archivar, no para explorar ' +
                '(para eso está treeflow_get_tree_data). El resultado puede contener las credenciales configuradas en las herramientas.',
            inputSchema: {
                type: 'object',
                properties: { tree_id: { type: 'string' }, include_conversations: { type: 'boolean', description: 'Default false' } },
                required: ['tree_id'],
            },
            handler: async (a) => ok(await client.exportTree(a.tree_id, a.include_conversations ?? false)),
        },
        {
            name: 'treeflow_import_tree',
            description: 'Crea un bot NUEVO a partir de un export (el objeto que devuelve treeflow_export_tree). No modifica ningún bot existente. ' +
                'Falla si el workspace ya alcanzó su límite de bots. El bot importado necesita entrenarse antes de usarse.',
            inputSchema: {
                type: 'object',
                properties: { backup: { type: 'object', description: 'El JSON completo del export' } },
                required: ['backup'],
            },
            handler: async (a) => ok(await client.importTree(a.backup)),
        },
        {
            name: 'treeflow_restore_snapshot',
            description: 'RESTAURA el bot al estado de un snapshot, SOBRESCRIBIENDO el estado actual. Antes de restaurar se crea automáticamente ' +
                'un snapshot del estado actual para poder deshacerlo. Exige confirm=true: pídele confirmación explícita al usuario y ' +
                'dile qué snapshot (treeflow_list_backups) se va a aplicar. Después hay que reentrenar.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string' },
                    snapshot_id: { type: 'string', description: 'ID del snapshot, de treeflow_list_backups' },
                    confirm: { type: 'boolean', description: 'Debe ser true' },
                },
                required: ['tree_id', 'snapshot_id', 'confirm'],
            },
            handler: async (a) => {
                if (a.confirm !== true) {
                    return ok('No se restauró nada: falta confirm=true. Confirma con el usuario antes de sobrescribir el bot.');
                }
                const safety = await client.createBackup(a.tree_id, `Antes de restaurar ${a.snapshot_id} (MCP)`);
                const restored = await client.restoreSnapshot(a.tree_id, a.snapshot_id);
                return ok({ safety_snapshot: safety, restored, next_step: 'Llama a treeflow_trigger_training.' });
            },
        },
    ];
}
//# sourceMappingURL=backups.js.map