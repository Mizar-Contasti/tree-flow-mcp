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

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  handler: (args: any) => Promise<any>;
}

// Reglas que ninguna descripción de herramienta puede transmitir por sí sola:
// aplican al servicio completo y evitan los errores más caros (sobre todo
// olvidar el reentrenamiento, que deja los cambios sin efecto en silencio).
export const INSTRUCTIONS = `Treeflow es una plataforma de chatbots NLU. Un "árbol" (tree) es un bot.

DOS SUBSISTEMAS DISTINTOS, no los confundas:
1. Canvas visual: Ramas (branches) son contenedores de flujo; Hojas (leafs) son
   los nodos dentro de una rama (message, intent, trigger_context, condition...).
   Al crear una rama se genera sola una hoja "Start".
2. NLU: Intenciones (intents) tienen frases de entrenamiento; Entidades (entities)
   tienen valores y sinónimos. Son los datos con los que se entrena el modelo.
Ramas/Hojas NO son sinónimo de Intenciones/Entidades: conviven pero sirven a cosas
distintas.

REENTRENAMIENTO OBLIGATORIO: después de crear, modificar o borrar intenciones o
entidades, llama a treeflow_trigger_training. Si no lo haces, el motor NLU sigue
usando el modelo viejo y tus cambios no surten efecto, sin aviso ni error.
Confirma con treeflow_get_training_status: can_use debe quedar en true.

EXPLORAR: usa treeflow_get_tree_data para obtener la estructura completa de un bot
(ramas, hojas, intenciones, entidades y plantillas) en una sola llamada, en vez de
encadenar varios list.

PATRONES: dentro de las frases de una intención, las entidades se referencian con
arroba, por ejemplo "quiero una @tipo_habitacion".

ACTUALIZACIONES: en update sólo hace falta mandar el campo que cambia; el resto se
conserva.

WORKSPACE: sale del API Key. No le pidas al usuario un workspace ni un ID de
workspace.

ANTES DE CAMBIOS GRANDES: treeflow_create_backup deja un snapshot restaurable.

HERRAMIENTAS Y PLANTILLAS: el bot puede decir cosas con huecos. Hay UNA sola sintaxis:
{ ... }, y dentro el $ distingue una variable de un texto. {$nombre} es la variable
nombre; {nombre} es la palabra "nombre". Condiciones: {$edad > 18 ? "adulto" : "menor"}.
La sintaxis {{ }} ya NO existe: un texto con ella no falla, imprime otra cosa
({{$x}} sale como "{Ana}"). Vale para mensajes, preguntas de captura, y la URL y el
cuerpo de las herramientas.
 - Una herramienta API (treeflow_create_tool) se guarda con campos planos (url,
   method, body, authType, inputVariables, outputVariables…). Tras crearla o
   cambiarla, pruébala con treeflow_test_tool: llama de verdad a la URL y devuelve
   estado ok / sin_datos / error. Los scripts igual (treeflow_test_script).
 - Los nombres de herramientas y scripts son únicos por bot.
 - Contraseñas y tokens salen enmascarados (***) al listar: es normal, los valores
   reales siguen guardados y no se pierden al actualizar.
 - Las capturas son preguntas reutilizables del slot filling: cambiar una afecta a
   todos los parámetros que la usan, y surte efecto sin reentrenar.
 - Tras cambios de lógica, treeflow_run_test_suite detecta regresiones, y
   treeflow_compare_test_runs dice qué cambió entre dos ejecuciones.

RESTAURAR: treeflow_restore_snapshot sobrescribe el bot. Exige confirmación explícita
del usuario y crea antes un snapshot de seguridad.

MESA DE AYUDA: las herramientas de chat en vivo son sólo de lectura. Tomar, responder
o cerrar una atención se hace desde la mesa de ayuda de Treeflow.

BORRADOS: eliminar bots o usuarios no está disponible a propósito, por ser
irreversible. Si el usuario lo pide, dile que lo haga desde el panel de Treeflow.`;

// Catálogo completo, agrupado por módulo para poder medirlo por partes.
export function buildToolGroups(client: TreeflowClient): Record<string, ToolDef[]> {
  return {
    trees: registerTreeTools(client),
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
