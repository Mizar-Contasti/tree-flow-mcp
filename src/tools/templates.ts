import { TreeflowClient } from '../client/treeflowClient.js';
import { templateLine } from './resumen.js';
import { ok } from './util.js';

export function registerTemplateTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_save_message_template',
      description:
        'Crea (sin template_id) o modifica (con template_id) una plantilla de mensaje: un texto de respaldo y, si ' +
        'hace falta, bloques enriquecidos. Al modificar sólo hace falta mandar lo que cambia; responses, si lo mandas, ' +
        'sustituye todos los bloques. Para el formato de los bloques, copia el de una plantilla existente ' +
        '(treeflow_get_detail con tipo template).',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
          template_id: { type: 'string', description: 'Para modificar. Sin él se crea una nueva' },
          name: { type: 'string', description: 'Obligatorio al crear (ej. menu_principal)' },
          text: { type: 'string', description: 'Texto de respaldo. Admite { $variable }' },
          description: { type: 'string' },
          responses: { type: 'array', items: { type: 'object' }, description: 'Bloques enriquecidos' },
        },
        required: ['tree_id'],
      },
      handler: async (args: { tree_id: string; template_id?: string; name?: string; text?: string; description?: string; responses?: any[] }) => {
        const { tree_id, template_id, ...fields } = args;
        if (template_id) return ok(`Plantilla actualizada: ${templateLine(await client.updateMessageTemplate(template_id, fields))}`);
        if (!fields.name) throw new Error('Para crear una plantilla hace falta name (para modificar una, manda template_id).');
        const result = await client.createMessageTemplate(tree_id, {
          name: fields.name,
          text: fields.text || fields.name,
          description: fields.description,
          responses: fields.responses || [{ type: 'text', text: fields.text || fields.name }],
        });
        return ok(`Plantilla creada: ${templateLine(result)}`);
      },
    },
  ];
}
