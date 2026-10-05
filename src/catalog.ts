import { TreeflowClient } from './client/treeflowClient.js';
import { registerTreeTools } from './tools/trees.js';
import { registerBranchTools } from './tools/branches.js';
import { registerLeafTools } from './tools/leafs.js';
import { registerIntentTools } from './tools/intents.js';
import { registerEntityTools } from './tools/entities.js';
import { registerTemplateTools } from './tools/templates.js';
import { registerFertilizerTools } from './tools/fertilizers.js';
import { registerIntegrationTools } from './tools/integrations.js';
import { registerVoiceTools } from './tools/voice.js';
import { registerTrainingTools } from './tools/training.js';
import { registerDiagnosticTools } from './tools/diagnostics.js';
import { registerHistoryTools } from './tools/history.js';
import { registerUserTools } from './tools/users.js';
import { registerCaptureTools } from './tools/captures.js';
import { registerTransferTools } from './tools/transfers.js';
import { registerSuiteTools } from './tools/suites.js';
import { registerLiveChatTools } from './tools/livechat.js';
import { registerBackupTools } from './tools/backups.js';
import { registerDetailTools } from './tools/detail.js';
import { registerDeleteTools } from './tools/delete.js';
import { registerGuideTools } from './tools/guide.js';

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  handler: (args: any) => Promise<any>;
}

// Reglas que ninguna descripción de herramienta puede transmitir por sí sola:
// aplican al servicio completo y evitan los errores más caros (sobre todo
// olvidar el reentrenamiento, que deja los cambios sin efecto en silencio).
export const INSTRUCTIONS = `Treeflow es una plataforma de chatbots NLU. Un árbol (tree) es un bot.
Dos subsistemas que NO son lo mismo: el canvas (ramas = flujos, hojas = sus nodos; una rama
nueva trae su hoja Start) y el NLU (intenciones con frases de entrenamiento, entidades con
valores y sinónimos; en las frases, una entidad se escribe @nombre).

AHORRA LLAMADAS: cada una reenvía toda la conversación.
- Explora con treeflow_get_tree_data (una línea por pieza, con su ID) y pide el detalle con
  treeflow_get_detail sólo de lo que vayas a tocar.
- Crea en lote: treeflow_create_intent, _create_entity y _create_leaf reciben listas (las hojas
  nuevas se enlazan con "ref:<ref>").
- Al editar manda sólo lo que cambia: el resto se conserva. Una lista que mandes se sustituye
  entera; para añadir o quitar frases o valores usa add_/remove_.

REENTRENA después de tocar intenciones o entidades, una vez al final: treeflow_trigger_training
espera y dice si quedó listo. Sin reentrenar, los cambios no surten efecto y nada avisa.

TEXTOS CON HUECOS: {$variable}. La sintaxis {{ }} ya no existe e imprime otra cosa.
Guía de referencia (plantillas, APIs, scripts, hojas, capturas, suites): treeflow_guide.

El workspace sale de la API key: no lo pidas. Los secretos salen como ***; devolverlos así no
los pisa. Antes de cambios grandes, treeflow_create_backup. treeflow_delete y
treeflow_restore_snapshot son irreversibles: confírmalos con el usuario. Los bots y los usuarios
no se borran desde aquí, y la mesa de ayuda es de sólo lectura: eso se hace en el panel.`;

// Catálogo completo, agrupado por módulo para poder medirlo por partes.
export function buildToolGroups(client: TreeflowClient): Record<string, ToolDef[]> {
  return {
    trees: registerTreeTools(client),
    detail: registerDetailTools(client),
    delete: registerDeleteTools(client),
    guide: registerGuideTools(),
    branches: registerBranchTools(client),
    leafs: registerLeafTools(client),
    intents: registerIntentTools(client),
    entities: registerEntityTools(client),
    templates: registerTemplateTools(client),
    fertilizers: registerFertilizerTools(client),
    integrations: registerIntegrationTools(client),
    voice: registerVoiceTools(client),
    training: registerTrainingTools(client),
    diagnostics: registerDiagnosticTools(client),
    history: registerHistoryTools(client),
    users: registerUserTools(client),
    captures: registerCaptureTools(client),
    transfers: registerTransferTools(client),
    suites: registerSuiteTools(client),
    livechat: registerLiveChatTools(client),
    backups: registerBackupTools(client),
  };
}

export function buildTools(client: TreeflowClient): ToolDef[] {
  return Object.values(buildToolGroups(client)).flat();
}
