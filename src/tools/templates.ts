import { TreeflowClient } from '../client/treeflowClient.js';
import { templateLine } from './resumen.js';
import { ok } from './util.js';

export function registerTemplateTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_save_message_template',
      description:
        'Crea (sin template_id) o modifica (con template_id) una plantilla de mensaje. Con sólo text basta para un ' +
        'mensaje de texto. Para botones, tarjetas, imágenes… usa responses: { type: "payload", value: [bloques] }; ' +
        'formato de los bloques: treeflow_guide("bloques"). Al modificar sólo hace falta mandar lo que cambia; ' +
        'responses, si lo mandas, sustituye todas las respuestas.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
          template_id: { type: 'string', description: 'Para modificar. Sin él se crea una nueva' },
          name: { type: 'string', description: 'Obligatorio al crear (ej. menu_principal)' },
          text: { type: 'string', description: 'El mensaje en texto. Admite {$variable}' },
          description: { type: 'string' },
          responses: {
            type: 'array',
            description: 'Respuestas: { type: "text", value } o { type: "payload", value: [bloques] }, con platform opcional (web, telegram…)',
            items: { type: 'object' },
          },
        },
        required: ['tree_id'],
      },
      handler: async (args: { tree_id: string; template_id?: string; name?: string; text?: string; description?: string; responses?: any[] }) => {
        const { tree_id, template_id, ...fields } = args;
        if (template_id) return ok(`Plantilla actualizada: ${templateLine(await client.updateMessageTemplate(template_id, fields))}`);
        if (!fields.name) throw new Error('Para crear una plantilla hace falta name (para modificar una, manda template_id).');
        if (!fields.text && !fields.responses?.length) {
          throw new Error('Para crear una plantilla hace falta text o responses: si no, el bot no tiene nada que decir.');
        }
        return ok(`Plantilla creada: ${templateLine(await client.createMessageTemplate(tree_id, { ...fields, name: fields.name }))}`);
      },
    },
  ];
}
