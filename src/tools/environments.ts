import { TreeflowClient } from '../client/treeflowClient.js';
import { clip } from './resumen.js';
import { ok } from './util.js';

const pubLine = (p: any) =>
  `- [${p.publicacion_id}] ${p.tipo === 'reversion' ? 'volver atrás' : `${p.origen}→${p.destino}`} · ${p.estado}` +
  `${p.version ? ` · v${p.version}` : ''} · ${p.solicitada_por_nombre ?? '?'}${p.nota ? ` · "${clip(p.nota, 60)}"` : ''}`;

export function registerEnvironmentTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_list_environments',
      description:
        'Los ambientes Dev, QA y Prod del bot (en una instancia cada bot tiene los tres): el ID y la versión de cada ' +
        'uno, las solicitudes a Prod que esperan al Admin y las últimas publicaciones. tree_id puede ser el de cualquier ' +
        'ambiente; "Nombre@qa" elige uno por nombre y, sin sufijo, el nombre es el de Dev.',
      inputSchema: { type: 'object', properties: { tree_id: { type: 'string' } }, required: ['tree_id'] },
      handler: async (a: { tree_id: string }) => {
        const [env, pubs] = await Promise.all([client.getEnvironments(a.tree_id), client.listPublications(a.tree_id).catch(() => [])]);
        const lines = Object.entries(env.ambientes ?? {}).map(
          ([amb, t]: [string, any]) => `- ${amb}: "${t.nombre}" [${t.tree_id}]${t.version ? ` · versión ${t.version}` : ''}`
        );
        if (Object.keys(env.ambientes ?? {}).length < 2) lines.push('Este bot tiene un solo ambiente: los ambientes sólo existen en las instancias.');
        return ok([
          'Ambientes:', ...lines,
          ...(env.pendientes?.length ? ['Esperando al Admin:', ...env.pendientes.map(pubLine)] : []),
          ...(pubs.length ? ['Últimas publicaciones:', ...pubs.slice(0, 5).map(pubLine)] : []),
        ].join('\n'));
      },
    },
    {
      name: 'treeflow_publish',
      description:
        'Copia un ambiente a otro (Dev→QA, QA→Prod, Prod→Dev…): el destino queda IGUAL al origen y pierde lo que tenía ' +
        '(se puede deshacer con volver=true). Exige confirm=true: confírmalo con el usuario. A Dev o QA se aplica en el ' +
        'acto y reentrena; a Prod queda pendiente hasta que lo apruebe el Admin de la instancia en su panel (no se aprueba ' +
        'desde aquí). tree_id es el ambiente ORIGEN; con volver=true, el ambiente que se quiere devolver a su versión ' +
        'anterior. cancelar=<ID de la solicitud> retira una solicitud a Prod pendiente. Canales, transferencias, ' +
        'credenciales y conversaciones no se copian.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del ambiente origen (o, con volver, el que se devuelve)' },
          destino: { type: 'string', enum: ['dev', 'qa', 'prod'] },
          volver: { type: 'boolean', description: 'Devuelve tree_id a como estaba antes de su última publicación' },
          cancelar: { type: 'string', description: 'ID de una solicitud pendiente a retirar' },
          nota: { type: 'string', description: '¿Qué cambia y por qué?' },
          confirm: { type: 'boolean', description: 'Debe ser true' },
        },
        required: ['tree_id', 'confirm'],
      },
      handler: async (a: { tree_id: string; destino?: string; volver?: boolean; cancelar?: string; nota?: string; confirm: boolean }) => {
        if (a.confirm !== true) return ok('No se publicó nada: falta confirm=true. Confirma con el usuario: el destino perderá lo que tiene.');
        let pub: any;
        // El backend de la edición saas acepta publicar y crea copias que nadie ve en la app: se evita aquí.
        if ((await client.getEdition()) === 'saas') {
          throw new Error('Este Treeflow no tiene ambientes (sólo las instancias los tienen): cada bot es uno solo. No se publicó nada.');
        }
        if (a.cancelar) pub = await client.cancelPublication(a.cancelar);
        else if (a.volver) pub = await client.revertEnvironment(a.tree_id, a.nota);
        else if (a.destino) pub = await client.publish(a.tree_id, a.destino, a.nota);
        else throw new Error('Indica destino (dev, qa o prod), volver=true o cancelar.');
        const wait = pub.estado === 'pendiente' ? ' Queda pendiente: sólo el Admin de la instancia la aprueba (panel /admin-app).' : '';
        return ok(`${pubLine(pub)}${wait}${pub.estado === 'aplicada' ? ' El destino se reentrena solo.' : ''}${pub.error ? ` Error: ${pub.error}` : ''}`);
      },
    },
  ];
}
