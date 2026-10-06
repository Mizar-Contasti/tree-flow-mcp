import { randomUUID } from 'node:crypto';
import { Route, TreeflowClient } from '../client/treeflowClient.js';
import { canvasNames, leafLine } from './resumen.js';
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

/** Conectar una hoja nueva desde una que ya existe: la ruta se añade a esa hoja. */
export interface Connection {
  from: string;
  name: string;
  to: string;
  kind?: 'intent' | 'event';
}

const routeProps = {
  name: { type: 'string', description: 'La intención (o evento) que dispara la ruta' },
  kind: { type: 'string', enum: ['intent', 'event'], description: 'Default intent' },
};

// Los IDs se asignan antes de crear, así una hoja puede apuntar a otra que todavía no
// existe y todo queda enlazado en una sola pasada, sin crear y luego corregir.
async function createLeaves(client: TreeflowClient, branchId: string, leaves: NewLeaf[], connect: Connection[] = []) {
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
  const links = connect.map((c) => ({ ...c, to: resolveRefs(c.to, ids) as string }));

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
  const lines = [`Hojas creadas (${created.length}):`, ...created.map((l) => leafLine(l, names))];

  // Las rutas desde hojas existentes, agrupadas por hoja de origen: una escritura por cada una.
  if (links.length) {
    const treeId = (await client.getBranch(branchId))?.tree_id;
    const byFrom = new Map<string, Connection[]>();
    for (const l of links) byFrom.set(l.from, [...(byFrom.get(l.from) ?? []), l]);
    lines.push('Conectadas desde:');
    for (const [from, list] of byFrom) {
      try {
        const updated = await client.updateLeaf(from, {}, {
          treeId,
          addRoutes: list.map((l) => ({ name: l.name, targetLeafId: l.to, kind: l.kind })),
        });
        lines.push(`- ${updated.name} [${updated.id}]: ${list.map((l) => `${l.name}→${names.leaves.get(l.to) ?? l.to}`).join(', ')}`);
      } catch (e: any) {
        const detail = e?.response?.data?.detail ?? e?.message ?? e;
        lines.push(`- ✘ ${from}: no se pudo conectar (${typeof detail === 'object' ? JSON.stringify(detail) : detail}). Las hojas sí se crearon.`);
      }
    }
  }
  return lines.join('\n');
}

export function registerLeafTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_create_leaf',
      description:
        'Crea una o varias hojas en una rama, en una sola llamada. Enlázalas entre sí escribiendo "ref:<ref>" en ' +
        'cualquier valor del config (nextLeafId, targetLeafId…): se sustituye por el ID. connect las conecta desde ' +
        'hojas que ya existen (ej. el Start), en la misma llamada. Tipos y claves del config: treeflow_guide("hojas"). ' +
        'Sin posición, se colocan en fila.',
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
          connect: {
            type: 'array',
            description: 'Rutas a añadir en hojas existentes hacia las nuevas',
            items: {
              type: 'object',
              properties: {
                from: { type: 'string', description: 'ID de la hoja existente (un trigger_context)' },
                ...routeProps,
                to: { type: 'string', description: '"ref:<ref>" de una hoja nueva, o un ID' },
              },
              required: ['from', 'name', 'to'],
            },
          },
        },
        required: ['branch_id', 'leaves'],
      },
      handler: async (args: { branch_id: string; leaves: NewLeaf[]; connect?: Connection[] }) =>
        ok(await createLeaves(client, args.branch_id, args.leaves, args.connect)),
    },
    {
      name: 'treeflow_update_leaf',
      description:
        'Actualiza una hoja. config se combina con el guardado: manda sólo las claves que cambian (null borra una); ' +
        'las listas (intents, events) se sustituyen completas. Para añadir o quitar UNA ruta de un trigger_context ' +
        'usa add_routes / remove_routes: no hace falta leer ni reenviar la lista. Hace falta branch_id o tree_id.',
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
          add_routes: {
            type: 'array',
            items: { type: 'object', properties: { ...routeProps, targetLeafId: { type: 'string' } }, required: ['name', 'targetLeafId'] },
          },
          remove_routes: { type: 'array', items: { type: 'string' }, description: 'Nombres de las rutas a quitar' },
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
        add_routes?: Route[];
        remove_routes?: string[];
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
          {
            branchId: args.branch_id,
            treeId: args.tree_id,
            replaceConfig: args.replace_config,
            addRoutes: args.add_routes,
            removeRoutes: args.remove_routes,
          }
        );
        return ok(`Hoja actualizada: ${leafLine(result, canvasNames([]))}`);
      },
    },
  ];
}
