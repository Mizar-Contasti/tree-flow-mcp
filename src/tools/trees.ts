import { TreeflowClient } from '../client/treeflowClient.js';

export function registerTreeTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_list_trees',
      description: 'Lista todos los bots (árboles) disponibles en el espacio de trabajo actual de Treeflow.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        const trees = await client.listTrees();
        return {
          content: [{ type: 'text', text: JSON.stringify(trees, null, 2) }],
        };
      },
    },
    {
      name: 'treeflow_get_tree',
      description: 'Obtiene los detalles completos, configuración y propósito de un bot (árbol) por su ID.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID único del bot/árbol (UUID)' },
        },
        required: ['tree_id'],
      },
      handler: async (args: { tree_id: string }) => {
        const tree = await client.getTree(args.tree_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(tree, null, 2) }],
        };
      },
    },
    {
      name: 'treeflow_get_tree_data',
      description: 'Obtiene la estructura COMPLETA del bot en un solo llamado (información básica, todas las ramas, nodos, intenciones, entidades y plantillas de mensaje). Ideal para entender todo el bot de una vez.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
        },
        required: ['tree_id'],
      },
      handler: async (args: { tree_id: string }) => {
        const treeData = await client.getTreeData(args.tree_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(treeData, null, 2) }],
        };
      },
    },
    {
      name: 'treeflow_create_tree',
      description: 'Crea un nuevo bot (árbol) en el espacio de trabajo de Treeflow.',
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
      handler: async (args: { name: string; description?: string; purpose?: string; primary_language?: string }) => {
        const result = await client.createTree(args);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
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
          nlp_mode: { type: 'string', description: 'Modo NLP: basic (reglas) o advanced (Machine Learning)' },
          sentiment_analysis_enabled: { type: 'boolean', description: 'Activar análisis de sentimiento en mensajes' },
          ml_confidence_threshold: { type: 'number', description: 'Umbral de confianza para ML (0.0 a 1.0)' },
          fuzzy_confidence_threshold: { type: 'number', description: 'Umbral de coincidencia difusa (0.0 a 1.0)' },
          mode: { type: 'string', description: 'Modo de operación: expert, beginner, test' },
        },
        required: ['tree_id'],
      },
      handler: async (args: { tree_id: string; [key: string]: any }) => {
        const { tree_id, ...data } = args;
        const result = await client.updateTree(tree_id, data);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    },
  ];
}
