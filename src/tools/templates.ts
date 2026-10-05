import { TreeflowClient } from '../client/treeflowClient.js';
import { DETAIL_HINT, templateLine, templatesSummary } from './resumen.js';
import { ok } from './util.js';

export function registerTemplateTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_list_message_templates',
      description:
        'Lista las plantillas de mensaje de un bot: nombre, ID, el inicio de su texto y qué bloques enriquecidos ' +
        'usa. Los bloques completos: treeflow_get_detail con tipo template.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
        },
        required: ['tree_id'],
      },
      handler: async (args: { tree_id: string }) =>
        ok(`${templatesSummary(await client.listMessageTemplates(args.tree_id))}\n${DETAIL_HINT}`),
    },
    {
      name: 'treeflow_create_message_template',
      description: 'Crea una nueva plantilla de mensaje (MessageTemplate) para respuestas estructuradas o enriquecidas (texto plano, botones, tarjetas, carruseles, audios).',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
          name: { type: 'string', description: 'Nombre representativo de la plantilla (ej. respuesta_bienvenida, menu_principal)' },
          text: { type: 'string', description: 'Texto plano de respaldo (fallback text)' },
          description: { type: 'string', description: 'Descripción corta opcional' },
          responses: {
            type: 'array',
            description: 'Arreglo de bloques enriquecidos (RichBlocks) compatibles con WhatsApp, Webchat y Telegram. Tipos soportados: text ({type: "text", text: "..."}), card ({type: "card", title, subtitle, imageUrl, buttons: [{label, url, payload}]}), quick_replies ({type: "quick_replies", options: ["Opción 1", "Opción 2"]}), carousel ({type: "carousel", cards: [...]}), image ({type: "image", url}), audio ({type: "audio", url}), file ({type: "file", url, filename}), location ({type: "location", latitude, longitude, address}).',
            items: { type: 'object' },
          },
        },
        required: ['tree_id', 'name'],
      },
      handler: async (args: { tree_id: string; name: string; text?: string; description?: string; responses?: any[] }) => {
        const result = await client.createMessageTemplate(args.tree_id, {
          name: args.name,
          text: args.text || args.name,
          description: args.description,
          responses: args.responses || [{ type: 'text', text: args.text || args.name }],
        });
        return ok(`Plantilla creada: ${templateLine(result)}`);
      },
    },
    {
      name: 'treeflow_update_message_template',
      description:
        'Actualiza una plantilla de mensaje. Lo que no mandes se conserva; responses, si lo mandas, sustituye todos ' +
        'los bloques.',
      inputSchema: {
        type: 'object',
        properties: {
          template_id: { type: 'string', description: 'ID de la plantilla a actualizar' },
          name: { type: 'string', description: 'Nuevo nombre' },
          text: { type: 'string', description: 'Nuevo texto plano fallback' },
          description: { type: 'string', description: 'Nueva descripción' },
          responses: { type: 'array', items: { type: 'object' }, description: 'Nuevo arreglo de bloques enriquecidos' },
        },
        required: ['template_id'],
      },
      handler: async (args: { template_id: string; name?: string; text?: string; description?: string; responses?: any[] }) => {
        const result = await client.updateMessageTemplate(args.template_id, {
          name: args.name,
          text: args.text,
          description: args.description,
          responses: args.responses,
        });
        return ok(`Plantilla actualizada: ${templateLine(result)}`);
      },
    },
    {
      name: 'treeflow_delete_message_template',
      description: 'Elimina una plantilla de mensaje.',
      inputSchema: {
        type: 'object',
        properties: {
          template_id: { type: 'string', description: 'ID de la plantilla a eliminar' },
        },
        required: ['template_id'],
      },
      handler: async (args: { template_id: string }) => {
        const result = await client.deleteMessageTemplate(args.template_id);
        return ok(result);
      },
    },
  ];
}
