import { TreeflowClient, maskSecrets } from '../client/treeflowClient.js';
import { DEFAULT_SECTIONS, SECTIONS, Section, treeHeader, treeOutline, withoutNoise } from './resumen.js';
import { ok } from './util.js';

export function registerTreeTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_list_trees',
      description: 'Lista los bots (árboles) del espacio de trabajo: nombre, ID, propósito, idioma y modo NLP.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        const trees: any[] = await client.listTrees();
        // Con ambientes, cada bot sale tres veces (Dev, QA y Prod): se dice cuál es cuál.
        const agents = trees.map((t) => t.agente_id).filter(Boolean);
        const withEnvs = new Set(agents).size < agents.length;
        return ok([`Bots (${trees.length}):`, ...trees.map((t) => `- ${treeHeader(t, withEnvs)}`)].join('\n'));
      },
    },
    {
      name: 'treeflow_get_tree',
      description:
        'Configuración de un bot: propósito, idiomas, modo NLP, umbrales y orden de detección. Los canales sólo se ' +
        'nombran; su configuración está en treeflow_list_integrations.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID único del bot/árbol (UUID)' },
        },
        required: ['tree_id'],
      },
      handler: async (args: { tree_id: string }) => {
        const { injertos, ...tree } = await client.getTree(args.tree_id);
        const canales = Object.entries(injertos ?? {}).map(([k, v]: [string, any]) =>
          `${k}${v === true || v?.enabled ? '' : ' (inactivo)'}`
        );
        return ok({ ...maskSecrets(withoutNoise(tree)), canales });
      },
    },
    {
      name: 'treeflow_get_tree_data',
      description:
        'Lee el bot por secciones, en resumen (una línea por pieza, con su ID). canvas: cada rama con sus hojas ' +
        '(qué dicen, qué escuchan, a dónde van); ramas: sólo las ramas; intenciones, entidades, plantillas. ' +
        'Por defecto canvas e intenciones. rama limita el canvas a una. El detalle de una pieza: treeflow_get_detail.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID o nombre del bot' },
          secciones: { type: 'array', items: { type: 'string', enum: [...SECTIONS] } },
          rama: { type: 'string', description: 'ID o nombre de una rama' },
        },
        required: ['tree_id'],
      },
      handler: async (args: { tree_id: string; secciones?: Section[]; rama?: string }) =>
        ok(treeOutline(await client.getTreeData(args.tree_id), args.secciones?.length ? args.secciones : DEFAULT_SECTIONS, args.rama)),
    },
    {
      name: 'treeflow_create_tree',
      description: 'Crea un nuevo bot (árbol) en el espacio de trabajo de Treeflow. En una instancia nace en sus tres ambientes (Dev, QA, Prod) y devuelve el Dev. Si el plan llegó a su tope de bots, responde 400/403 con el motivo.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre descriptivo del bot' },
          description: { type: 'string', description: 'Descripción de las funciones del bot' },
          purpose: { type: 'string', description: 'Giro o propósito (hotel, restaurante, inmobiliaria, clinica_spa, rrhh, general)' },
          primary_language: { type: 'string', description: 'Idioma principal (es, en, pt, fr, it, de). Por defecto: es' },
        },
        required: ['name'],
      },
      handler: async (args: { name: string; description?: string; purpose?: string; primary_language?: string }) =>
        ok(`Bot creado: ${treeHeader(await client.createTree(args))}`),
    },
    {
      name: 'treeflow_update_tree',
      description: 'Actualiza la configuración, modos de NLP, umbrales de confianza (ML/difuso), análisis de sentimiento o propósito de un bot.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
          name: { type: 'string', description: 'Nuevo nombre' },
          description: { type: 'string', description: 'Nueva descripción' },
          purpose: { type: 'string', description: 'Nuevo propósito' },
          webhook_url: { type: 'string', description: 'URL de webhook principal' },
          nlp_mode: { type: 'string', enum: ['basic', 'pro'], description: 'basic, o pro (entidades con spaCy: sólo plan Enterprise; en otro plan responde 403)' },
          sentiment_analysis_enabled: { type: 'boolean', description: 'Activar análisis de sentimiento en mensajes' },
          ml_confidence_threshold: { type: 'number', description: 'Umbral de confianza para ML (0.0 a 1.0)' },
          fuzzy_confidence_threshold: { type: 'number', description: 'Umbral de coincidencia difusa (0.0 a 1.0)' },
          mode: { type: 'string', description: 'Modo de operación: expert, beginner, test' },
          condicionales: { type: 'boolean', description: '«Agregar condicionales»: el editor ofrece las condiciones en Respuesta y Transición. Las reglas ya guardadas funcionan igual apagado' },
        },
        required: ['tree_id'],
      },
      handler: async (args: { tree_id: string; [key: string]: any }) => {
        const { tree_id, ...data } = args;
        const result = await client.updateTree(tree_id, data);
        return ok(`Bot actualizado (${Object.keys(data).join(', ') || 'sin cambios'}): ${treeHeader(result)}`);
      },
    },
  ];
}
