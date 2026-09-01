import { TreeflowClient } from '../client/treeflowClient.js';

export function registerVoiceTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_get_voice_config',
      description: 'Obtiene la configuración de voz del bot: estado de STT (Whisper) y TTS (Piper), modelo, idioma, voz y velocidad.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
        },
        required: ['tree_id'],
      },
      handler: async (args: { tree_id: string }) => {
        const result = await client.getVoiceConfig(args.tree_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    },
    {
      name: 'treeflow_update_voice_config',
      description: 'Actualiza los parámetros de voz del bot (activar/desactivar STT, TTS, cambiar voz, idioma o velocidad de reproducción).',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
          stt_enabled: { type: 'boolean', description: 'Activar Speech-To-Text (Whisper)' },
          stt_model: { type: 'string', description: 'Modelo STT (ej. base, small, medium)' },
          stt_language: { type: 'string', description: 'Idioma STT (es, en, etc.)' },
          stt_save_audio: { type: 'boolean', description: 'Guardar archivos de audio' },
          tts_enabled: { type: 'boolean', description: 'Activar Text-To-Speech (Piper)' },
          tts_voice: { type: 'string', description: 'Voz TTS (ej. es_ES-davefx-medium)' },
          tts_speed: { type: 'number', description: 'Velocidad de voz (0.5 a 2.0)' },
        },
        required: ['tree_id'],
      },
      handler: async (args: { tree_id: string; [key: string]: any }) => {
        const { tree_id, ...data } = args;
        const result = await client.updateVoiceConfig(tree_id, data);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    },
  ];
}
