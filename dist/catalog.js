import { expandIds, isFullId, lookupShort, shortenText } from './ids.js';
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
// ── Grupos de herramientas ───────────────────────────────────────────────────
// El catálogo viaja en cada llamada. Lo que se usa poco va en grupos opcionales, que se
// activan con TREEFLOW_TOOLSETS o, a mitad de una conversación, con treeflow_enable_tools.
// Lo que no cae en ningún grupo es la base y siempre está.
export const TOOLSETS = {
    capturas: { label: 'capturas del slot filling', match: /^treeflow_(list_captures|get_capture|save_capture)$/ },
    respaldos: { label: 'snapshots, export e import del bot', match: /^treeflow_(list_backups|create_backup|export_tree|import_tree|restore_snapshot)$/ },
    apis: { label: 'APIs y scripts del bot, con sus pruebas y logs', match: /^treeflow_(list_fertilizers|save_tool|test_tool|list_tool_logs|save_script|test_script)$/ },
    pruebas: {
        label: 'suites de prueba y sus ejecuciones',
        match: /^treeflow_(list_test_suites|get_test_suite|save_test_suite|import_test_suite_csv|export_test_suite_csv|run_test_suite|list_test_runs|get_test_run|compare_test_runs)$/,
    },
    atencion: { label: 'transferencia a humano y mesa de ayuda', match: /^treeflow_(list_transfers|save_transfer|test_transfer|get_live_chat_\w+)$/ },
    historial: {
        label: 'conversaciones reales, historial de cambios y de entrenamientos, y analíticas',
        match: /^treeflow_(list_conversations|get_conversation|list_change_history|list_training_history|get_conversation_analytics)$/,
    },
    admin: {
        label: 'configuración del bot (umbrales, NLP), canales, voz, usuarios y credenciales',
        match: /^treeflow_(get_tree|update_tree|list_integrations|configure_integration|get_voice_config|update_voice_config|list_users|create_user|update_user|list_credentials)$/,
    },
};
export const DEFAULT_TOOLSETS = ['capturas', 'respaldos'];
export function toolsetOf(toolName) {
    for (const [group, { match }] of Object.entries(TOOLSETS))
        if (match.test(toolName))
            return group;
    return 'base';
}
/**
 * Grupos activos según TREEFLOW_TOOLSETS. Vacía: la base y los de por defecto. Una lista
 * ("apis,pruebas") sustituye a los de por defecto; "todo" los activa todos.
 */
export function parseToolsets(value) {
    const names = (value ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (!names.length)
        return { active: new Set(['base', ...DEFAULT_TOOLSETS]), unknown: [] };
    if (names.includes('todo') || names.includes('all'))
        return { active: new Set(['base', ...Object.keys(TOOLSETS)]), unknown: [] };
    const unknown = names.filter((n) => n !== 'base' && !(n in TOOLSETS));
    return { active: new Set(['base', ...names.filter((n) => n in TOOLSETS)]), unknown };
}
// Reglas que ninguna descripción de herramienta puede transmitir por sí sola:
// aplican al servicio completo y evitan los errores más caros (sobre todo
// olvidar el reentrenamiento, que deja los cambios sin efecto en silencio).
// Sólo nombran herramientas de los grupos activos.
export function buildInstructions(active) {
    const inactive = Object.keys(TOOLSETS).filter((g) => !active.has(g));
    const irreversible = active.has('respaldos')
        ? 'treeflow_delete y treeflow_restore_snapshot son irreversibles: confírmalos'
        : 'treeflow_delete es irreversible: confírmalo';
    return `Treeflow es una plataforma de chatbots NLU. Un árbol (tree) es un bot.
Dos subsistemas que NO son lo mismo: el canvas (ramas = flujos, hojas = sus nodos; una rama
nueva trae su hoja Start) y el NLU (intenciones con frases de entrenamiento, entidades con
valores y sinónimos; en las frases, una entidad se escribe @nombre).

AHORRA LLAMADAS: cada una reenvía toda la conversación.
- tree_id acepta el nombre del bot: no listes los bots sólo para buscar su ID. Los IDs salen
  cortos (8 caracteres): úsalos tal cual.
- Explora con treeflow_get_tree_data (por defecto canvas e intenciones; pide otras secciones o
  una sola rama si hace falta) y el detalle con treeflow_get_detail, sólo de lo que vayas a tocar.
- Crea en lote: treeflow_create_intent, _create_entity y _create_leaf reciben listas. Las hojas
  nuevas se enlazan con "ref:<ref>", y create_leaf las conecta desde una existente (connect).
- Al editar manda sólo lo que cambia: el resto se conserva. Una lista que mandes se sustituye
  entera; para añadir o quitar frases, valores o rutas usa add_/remove_.

REENTRENA después de tocar intenciones o entidades, una vez al final: treeflow_trigger_training
espera, dice si quedó listo y, con probar, prueba mensajes en la misma llamada. Sin reentrenar,
los cambios no surten efecto y nada avisa.

TEXTOS CON HUECOS: {$variable}. La sintaxis {{ }} ya no existe e imprime otra cosa.
Guía de referencia (plantillas, bloques, APIs, scripts, hojas, capturas, suites): treeflow_guide.

El workspace sale de la API key: no lo pidas. Los secretos salen como ***; devolverlos así no
los pisa.${active.has('respaldos') ? ' Antes de cambios grandes, treeflow_create_backup.' : ''} ${irreversible} con el
usuario. Los bots y los usuarios no se borran desde aquí, y la mesa de ayuda es de sólo lectura.${inactive.length
        ? `\n\nHAY MÁS HERRAMIENTAS sin cargar (${inactive.join(', ')}): si la tarea las necesita, actívalas con
treeflow_enable_tools. No las actives por si acaso: cada herramienta pesa en todas las llamadas.`
        : ''}`;
}
/** Las instrucciones con todos los grupos activos: sirve para medirlas y probarlas. */
export const INSTRUCTIONS = buildInstructions(new Set(['base', ...Object.keys(TOOLSETS)]));
/**
 * La herramienta que activa grupos a mitad de una conversación. Sólo existe mientras quede
 * alguno inactivo; `onChange` avisa al cliente para que recargue la lista.
 */
export function enableToolsTool(active, allTools, onChange) {
    const inactive = Object.keys(TOOLSETS).filter((g) => !active.has(g));
    if (!inactive.length)
        return undefined;
    return {
        name: 'treeflow_enable_tools',
        description: `Carga grupos de herramientas que no están activos: ${inactive.map((g) => `${g} (${TOOLSETS[g].label})`).join('; ')}. ` +
            'Úsala sólo cuando la tarea los necesite: cada herramienta activa pesa en todas las llamadas siguientes.',
        inputSchema: {
            type: 'object',
            properties: { grupos: { type: 'array', items: { type: 'string', enum: inactive } } },
            required: ['grupos'],
        },
        handler: async (a) => {
            const wanted = (a.grupos ?? []).filter((g) => inactive.includes(g));
            if (!wanted.length)
                throw new Error(`Grupos que se pueden activar: ${inactive.join(', ')}.`);
            for (const g of wanted)
                active.add(g);
            await onChange();
            const added = allTools.filter((t) => wanted.includes(toolsetOf(t.name))).map((t) => t.name);
            return {
                content: [{
                        type: 'text',
                        text: `Activados: ${wanted.join(', ')}. Herramientas nuevas: ${added.join(', ')}. ` +
                            'Si no las ves, tu cliente no recarga la lista: hay que añadir esos grupos a TREEFLOW_TOOLSETS y reiniciarlo.',
                    }],
            };
        },
    };
}
// Catálogo completo, agrupado por módulo para poder medirlo por partes.
export function buildToolGroups(client) {
    const groups = {
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
    return Object.fromEntries(Object.entries(groups).map(([g, tools]) => [g, tools.map((t) => withIdsAndNames(client, t))]));
}
/**
 * Lo que vale para todas las herramientas: a la entrada, los IDs cortos se expanden y
 * tree_id acepta el nombre del bot; a la salida, cada UUID se muestra corto.
 */
function withIdsAndNames(client, tool) {
    return {
        ...tool,
        handler: async (args) => {
            // tree_id va aparte: además de un corto ya visto, acepta el nombre del bot o un
            // prefijo de su ID, que se buscan en la lista de bots.
            const { tree_id, ...rest } = args ?? {};
            const input = expandIds(rest);
            if (typeof tree_id === 'string') {
                input.tree_id = isFullId(tree_id) ? tree_id : lookupShort(tree_id) ?? (await client.resolveTreeId(tree_id));
            }
            else if (tree_id !== undefined) {
                input.tree_id = tree_id;
            }
            const result = await tool.handler(input);
            for (const c of result?.content ?? [])
                if (typeof c.text === 'string')
                    c.text = shortenText(c.text);
            return result;
        },
    };
}
export function buildTools(client) {
    return Object.values(buildToolGroups(client)).flat();
}
//# sourceMappingURL=catalog.js.map