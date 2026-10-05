import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ok } from './util.js';
// Un export trae historiales y logs completos: varios MB. No cabe en una conversación,
// así que se guarda en disco (el MCP corre en la máquina del usuario) y se devuelve la ruta.
const EXPORT_DIR = process.env.TREEFLOW_EXPORT_DIR || path.join(os.homedir(), 'treeflow-exports');
// El formato del export conserva nombres viejos: "branches" son intenciones y "leaves" entidades.
const EXPORT_LABELS = {
    visual_branches: 'ramas',
    visual_leaves: 'hojas',
    branches: 'intenciones',
    leaves: 'entidades',
    message_templates: 'plantillas',
    change_history: 'cambios',
    training_history: 'entrenamientos',
    conversations: 'conversaciones',
    webhook_logs: 'ejecuciones de herramientas',
};
function exportSummary(backup) {
    return Object.entries(EXPORT_LABELS)
        .filter(([key]) => Array.isArray(backup[key]))
        .map(([key, label]) => `${backup[key].length} ${label}`)
        .join(', ');
}
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'bot';
export function registerBackupTools(client) {
    return [
        {
            name: 'treeflow_export_tree',
            description: 'Exporta el bot completo (ramas, hojas, intenciones, entidades, plantillas, herramientas, scripts e historiales) ' +
                `a un archivo JSON en esta computadora (${EXPORT_DIR}, o TREEFLOW_EXPORT_DIR) y devuelve la ruta y qué contiene. ` +
                'Sirve para copiar o archivar, no para explorar (para eso está treeflow_get_tree_data). Las conversaciones sólo ' +
                'van con include_conversations=true. El archivo puede contener las credenciales de las herramientas.',
            inputSchema: {
                type: 'object',
                properties: { tree_id: { type: 'string' }, include_conversations: { type: 'boolean', description: 'Default false' } },
                required: ['tree_id'],
            },
            handler: async (a) => {
                const backup = await client.exportTree(a.tree_id, a.include_conversations ?? false);
                const name = backup?.metadata?.tree_name ?? backup?.tree?.name ?? a.tree_id;
                const stamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
                fs.mkdirSync(EXPORT_DIR, { recursive: true });
                const file = path.join(EXPORT_DIR, `${slug(name)}-${stamp}.json`);
                const json = JSON.stringify(backup, null, 2);
                fs.writeFileSync(file, json);
                return ok(`Exportado "${name}" a ${file} (${(Buffer.byteLength(json) / 1048576).toFixed(1)} MB). ` +
                    `Contiene: ${exportSummary(backup)}. Para crear un bot nuevo desde él: treeflow_import_tree con archivo.`);
            },
        },
        {
            name: 'treeflow_import_tree',
            description: 'Crea un bot NUEVO a partir de un export: el archivo que dejó treeflow_export_tree (archivo) o el JSON mismo ' +
                '(backup). No modifica ningún bot existente. Falla si el workspace ya alcanzó su límite de bots. El bot ' +
                'importado necesita entrenarse antes de usarse.',
            inputSchema: {
                type: 'object',
                properties: {
                    archivo: { type: 'string', description: 'Ruta del JSON exportado en esta computadora' },
                    backup: { type: 'object', description: 'El JSON del export, si no está en un archivo' },
                },
            },
            handler: async (a) => {
                const backup = a.archivo ? JSON.parse(fs.readFileSync(a.archivo, 'utf8')) : a.backup;
                if (!backup)
                    throw new Error('Falta archivo o backup.');
                return ok(await client.importTree(backup));
            },
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