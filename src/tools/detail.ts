import { TreeflowClient, maskSecrets } from '../client/treeflowClient.js';
import { clip, withoutNoise } from './resumen.js';

const KINDS = ['leaf', 'intent', 'entity', 'template', 'tool', 'script'] as const;
type Kind = (typeof KINDS)[number];

/** Busca por ID y, si no, por nombre. Un nombre repetido es error: hay que usar el ID. */
function find<T extends { id?: string; name?: string }>(items: T[], ref: string, what: string): T {
  const byId = items.find((x) => x.id === ref);
  if (byId) return byId;
  const byName = items.filter((x) => x.name === ref);
  if (byName.length === 1) return byName[0];
  if (byName.length > 1) {
    throw new Error(`"${ref}" es el nombre de ${byName.length} piezas (${byName.map((x) => x.id).join(', ')}): usa el ID.`);
  }
  throw new Error(`No existe ${what} "${ref}" en este bot.`);
}

async function detail(client: TreeflowClient, treeId: string, kind: Kind, ref: string) {
  switch (kind) {
    case 'leaf': {
      const branches = await client.listBranches(treeId);
      // La rama va con nombre en vez de branch_id: así se lee sin otra consulta.
      const leaves: any[] = branches.flatMap((b: any) =>
        (b.leaves ?? []).map(({ branch_id: _b, ...l }: any) => ({ ...l, branch: { id: b.id, name: b.name } }))
      );
      return withoutNoise(find(leaves, ref, 'una hoja'));
    }
    case 'intent': {
      const intent = find(await client.listIntents(treeId), ref, 'una intención');
      const out: Record<string, any> = withoutNoise(intent);
      // displayPatterns suele repetir patterns tal cual.
      if (JSON.stringify(out.displayPatterns) === JSON.stringify(out.patterns)) delete out.displayPatterns;
      return out;
    }
    case 'entity':
      return withoutNoise(find(await client.listEntities(treeId), ref, 'una entidad'));
    case 'template':
      return withoutNoise(find(await client.listMessageTemplates(treeId), ref, 'una plantilla'));
    case 'tool':
    case 'script': {
      const config = await client.listFertilizers(treeId);
      const items = kind === 'tool'
        ? config?.additionalFertilizers ?? config?.additional_tools ?? []
        : config?.scripts ?? config?.custom_scripts ?? [];
      const item: Record<string, any> = maskSecrets(withoutNoise(find(items, ref, kind === 'tool' ? 'una API' : 'un script')));
      // La última respuesta de prueba puede ser enorme y no hace falta para editar.
      if (typeof item.lastResponse === 'string' && item.lastResponse.length > 300) {
        item.lastResponse = `${clip(item.lastResponse, 300)} (recortada)`;
      }
      return item;
    }
  }
}

export function registerDetailTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_get_detail',
      description:
        'Detalle completo de UNA pieza del bot, para entenderla o editarla. Las lecturas generales ' +
        '(treeflow_get_tree_data, treeflow_list_*) sólo resumen: usa ésta para lo que vayas a tocar. ' +
        'tipo: leaf (hoja del canvas, con su config), intent (frases y parámetros), entity (valores y ' +
        'sinónimos), template (plantilla de mensaje), tool (API) o script.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot' },
          tipo: { type: 'string', enum: [...KINDS] },
          ref: { type: 'string', description: 'ID de la pieza, o su nombre si es único' },
        },
        required: ['tree_id', 'tipo', 'ref'],
      },
      handler: async (a: { tree_id: string; tipo: Kind; ref: string }) => {
        if (!KINDS.includes(a.tipo)) throw new Error(`tipo debe ser uno de: ${KINDS.join(', ')}`);
        const result = await detail(client, a.tree_id, a.tipo, a.ref);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      },
    },
  ];
}
