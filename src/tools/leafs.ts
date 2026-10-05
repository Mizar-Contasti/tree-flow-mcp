import { randomUUID } from 'node:crypto';
import { TreeflowClient } from '../client/treeflowClient.js';
import { DETAIL_HINT, branchOutline, canvasNames, leafLine } from './resumen.js';
import { ok } from './util.js';

export interface NewLeaf {
  ref?: string;
  leaf_type: string;
  name?: string;
  config?: Record<string, any>;
  position_x?: number;
  position_y?: number;
  is_start?: boolean;
}

/** Sustituye cada "ref:<ref>" del valor (a cualquier profundidad) por el ID asignado. */
export function resolveRefs(value: any, ids: Map<string, string>): any {
  if (typeof value === 'string' && value.startsWith('ref:')) {
    const id = ids.get(value.slice(4));
    if (!id) throw new Error(`"${value}" no corresponde a ninguna hoja de la lista (refs: ${[...ids.keys()].join(', ')}).`);
    return id;
  }
  if (Array.isArray(value)) return value.map((v) => resolveRefs(v, ids));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveRefs(v, ids)]));
  }
  return value;
}

// Los IDs se asignan antes de crear, así una hoja puede apuntar a otra que todavía no
// existe y todo queda enlazado en una sola pasada, sin crear y luego corregir.
async function createLeaves(client: TreeflowClient, branchId: string, leaves: NewLeaf[]) {
  if (!Array.isArray(leaves) || !leaves.length) throw new Error('Manda al menos una hoja en leaves.');
  const ids = new Map<string, string>();
  for (const [i, leaf] of leaves.entries()) {
    const ref = leaf.ref ?? leaf.name ?? `hoja${i + 1}`;
    if (ids.has(ref)) throw new Error(`El ref "${ref}" está repetido: cada hoja de la lista necesita uno distinto.`);
    ids.set(ref, randomUUID());
  }
  const refs = [...ids.keys()];
  // Todo se valida antes de crear nada: un ref roto no deja la rama a medias.
  const configs = leaves.map((leaf) => resolveRefs(leaf.config ?? {}, ids));

  const created: any[] = [];
  try {
    for (const [i, leaf] of leaves.entries()) {
      created.push(
        await client.createLeaf(branchId, {
          id: ids.get(refs[i]),
          name: leaf.name,
          type: leaf.leaf_type,
          config: configs[i],
          position_x: leaf.position_x ?? i * 320,
          position_y: leaf.position_y ?? 0,
          is_start: leaf.is_start,
        })
      );
    }
  } catch (e: any) {
    const done = created.map((l) => `${l.name} [${l.id}]`).join(', ') || 'ninguna';
    const detail = e?.response?.data?.detail ?? e?.message ?? e;
    throw new Error(`Falló la hoja ${created.length + 1} (${refs[created.length]}): ${typeof detail === 'object' ? JSON.stringify(detail) : detail}. Ya creadas: ${done}.`);
  }
  const names = canvasNames([{ leaves: created }]);
  return [`Hojas creadas (${created.length}):`, ...created.map((l) => leafLine(l, names))].join('\n');
}

export function registerLeafTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_list_leafs',
      description:
        'Esquema de las hojas de una rama: una línea por hoja con su tipo, ID, qué dice, qué escucha y a dónde va. ' +
        'El config completo de una hoja: treeflow_get_detail con tipo leaf.',
      inputSchema: {
        type: 'object',
        properties: {
          branch_id: { type: 'string', description: 'ID de la rama' },
        },
        required: ['branch_id'],
      },
      handler: async (args: { branch_id: string }) => {
        const branch = await client.getBranch(args.branch_id);
        // Los nombres de las plantillas permiten decir con cuál habla cada hoja.
        const templates = branch?.tree_id ? await client.listMessageTemplates(branch.tree_id).catch(() => []) : [];
        return ok(`${branchOutline(branch, canvasNames([branch], templates))}\n${DETAIL_HINT}`);
      },
    },
    {
      name: 'treeflow_create_leaf',
      description:
        'Crea una o varias hojas en una rama, en una sola llamada. Las hojas nuevas se pueden enlazar entre sí: en ' +
        'cualquier valor del config (nextLeafId, targetLeafId de intents/events…) escribe "ref:<ref>" con el ref de ' +
        'otra hoja de la misma lista, y se sustituye por su ID. Tipos habituales: intent (responde a una intención: ' +
        'intentName, messageText, nextLeafId), trigger_context (escucha intents/events y salta a su targetLeafId), ' +
        'event (responde a un evento como sys.no-match). Sin posición, se colocan en fila.',
      inputSchema: {
        type: 'object',
        properties: {
          branch_id: { type: 'string', description: 'ID de la rama' },
          leaves: {
            type: 'array',
            description: 'Hojas a crear, en orden',
            items: {
              type: 'object',
              properties: {
                ref: { type: 'string', description: 'Nombre corto para enlazarla desde otras hojas de la lista (default: name)' },
                leaf_type: { type: 'string', description: 'intent, trigger_context, event…' },
                name: { type: 'string', description: 'Nombre de la hoja (default: el tipo)' },
                config: { type: 'object', description: 'Config de la hoja; admite "ref:<ref>" como ID' },
                position_x: { type: 'number' },
                position_y: { type: 'number' },
                is_start: { type: 'boolean' },
              },
              required: ['leaf_type'],
            },
          },
        },
        required: ['branch_id', 'leaves'],
      },
      handler: async (args: { branch_id: string; leaves: NewLeaf[] }) => ok(await createLeaves(client, args.branch_id, args.leaves)),
    },
    {
      name: 'treeflow_update_leaf',
      description:
        'Actualiza un nodo (leaf): nombre, tipo, posición o config. config se combina con el guardado: manda sólo ' +
        'las claves que cambian (ej. {"messageText": "…"}), una clave en null se borra, y lo demás se conserva. ' +
        'Una clave que es lista (intents, events) se sustituye completa. Para combinar hace falta branch_id o tree_id.',
      inputSchema: {
        type: 'object',
        properties: {
          leaf_id: { type: 'string', description: 'ID del nodo (leaf)' },
          branch_id: { type: 'string', description: 'Rama del nodo (o tree_id): para leer su config guardado' },
          tree_id: { type: 'string', description: 'Bot del nodo, si no tienes branch_id' },
          name: { type: 'string', description: 'Nuevo nombre del nodo' },
          leaf_type: { type: 'string', description: 'Nuevo tipo de nodo' },
          config: { type: 'object', description: 'Claves del config que cambian' },
          replace_config: { type: 'boolean', description: 'true sustituye el config entero por el que mandas' },
          position_x: { type: 'number', description: 'Nueva posición X en el lienzo' },
          position_y: { type: 'number', description: 'Nueva posición Y en el lienzo' },
          is_start: { type: 'boolean', description: 'Marca el nodo como inicio de la rama' },
        },
        required: ['leaf_id'],
      },
      handler: async (args: {
        leaf_id: string;
        branch_id?: string;
        tree_id?: string;
        name?: string;
        leaf_type?: string;
        config?: any;
        replace_config?: boolean;
        position_x?: number;
        position_y?: number;
        is_start?: boolean;
      }) => {
        const result = await client.updateLeaf(
          args.leaf_id,
          {
            name: args.name,
            type: args.leaf_type,
            config: args.config,
            position_x: args.position_x,
            position_y: args.position_y,
            is_start: args.is_start,
          },
          { branchId: args.branch_id, treeId: args.tree_id, replaceConfig: args.replace_config }
        );
        return ok(`Hoja actualizada: ${leafLine(result, canvasNames([]))}`);
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
        return ok(result);
      },
    },
  ];
}
