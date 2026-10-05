import { maskSecrets } from '../client/treeflowClient.js';
import { fertilizersSummary, scriptLine, toolLine, toolLogsSummary } from './resumen.js';
import { ok, variableSchema } from './util.js';
const STATUS = { type: 'string', enum: ['unconfigured', 'validated', 'deployed', 'error'], description: 'Sólo al modificar' };
export function registerFertilizerTools(client) {
    return [
        {
            name: 'treeflow_list_fertilizers',
            description: 'Lista las herramientas del bot: el webhook principal, las APIs externas y los scripts, cada una con su ID, ' +
                'estado y los nombres de sus variables. La configuración completa de una (URL, cuerpo, código, ' +
                'autenticación): treeflow_get_detail con tipo tool o script. Los secretos salen enmascarados (***).',
            inputSchema: {
                type: 'object',
                properties: { tree_id: { type: 'string', description: 'ID del bot/árbol' } },
                required: ['tree_id'],
            },
            handler: async (args) => ok(fertilizersSummary(await client.listFertilizers(args.tree_id))),
        },
        {
            name: 'treeflow_save_tool',
            description: 'Crea (sin tool_id) o modifica (con tool_id: ID o nombre) una herramienta API, una llamada HTTP que el bot ' +
                'hace durante la conversación. Al modificar sólo hace falta mandar lo que cambia; las listas de variables, si ' +
                'las mandas, sustituyen a las anteriores, y la API vuelve a "unconfigured" salvo que indiques status. ' +
                'Pruébala después con treeflow_test_tool. Variables, autenticación y jsonPath: treeflow_guide("apis").',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string', description: 'ID del bot/árbol' },
                    tool_id: { type: 'string', description: 'Para modificar: ID o nombre. Sin él se crea una nueva' },
                    name: { type: 'string', description: 'Obligatorio al crear; único por bot' },
                    url: { type: 'string', description: 'Obligatoria al crear. Admite { $variable }' },
                    method: { type: 'string', enum: ['POST', 'GET', 'PATCH', 'PUT', 'DELETE', 'QUERY'], description: 'Default POST' },
                    description: { type: 'string' },
                    body: { type: 'string', description: 'Cuerpo JSON como texto. Admite { $variable }' },
                    timeout: { type: 'integer', description: 'Milisegundos (default 30000)' },
                    enabled: { type: 'boolean' },
                    authType: { type: 'string', enum: ['none', 'basic', 'bearer', 'apiKey'] },
                    authConfig: { type: 'object', description: 'Se combina con la guardada' },
                    inputVariables: { ...variableSchema, description: 'Datos que el bot le pasa a la API' },
                    outputVariables: { ...variableSchema, description: 'Datos que el bot extrae de la respuesta' },
                    errorMessage: { type: 'object', description: 'Mensaje si falla, por idioma: {"es":"…"}' },
                    status: STATUS,
                },
                required: ['tree_id'],
            },
            handler: async (a) => {
                const { tree_id, tool_id, ...fields } = a;
                if (tool_id)
                    return ok(`API actualizada: ${toolLine(await client.updateTool(tree_id, tool_id, fields))}`);
                if (!fields.name || !fields.url)
                    throw new Error('Para crear una API hacen falta name y url (para modificar una, manda tool_id).');
                return ok(`API creada: ${toolLine(await client.createTool(tree_id, fields))}`);
            },
        },
        {
            name: 'treeflow_test_tool',
            description: 'Prueba una herramienta API guardada con el MISMO ejecutor que usa la conversación. Hace una llamada real a la URL. ' +
                'Devuelve estado ("ok", "sin_datos" o "error"), código HTTP, tiempo, entradas usadas y salidas extraídas. ' +
                'Las entradas salen del testValue de cada variable; test_values las sustituye al vuelo.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string' },
                    tool_id: { type: 'string', description: 'ID o nombre' },
                    test_values: { type: 'object', description: 'Mapa nombre→valor para las variables de entrada, ej. {"ciudad":"Mérida"}' },
                },
                required: ['tree_id', 'tool_id'],
            },
            handler: async (a) => ok(maskSecrets(await client.testTool(a.tree_id, a.tool_id, a.test_values))),
        },
        {
            name: 'treeflow_list_tool_logs',
            description: 'Historial de ejecuciones de herramientas del bot (las reales de conversaciones y las pruebas), con filtros. ' +
                'Una línea por ejecución: resultado, tiempo, error y entradas/salidas recortadas.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string' },
                    limit: { type: 'integer', description: 'Default 20' },
                    offset: { type: 'integer' },
                    success: { type: 'boolean', description: 'true sólo exitosas, false sólo fallidas' },
                    tool_name: { type: 'string' },
                    search: { type: 'string', description: 'Texto a buscar en nombre, error, petición o respuesta' },
                    date_from: { type: 'string', description: 'ISO 8601' },
                    date_to: { type: 'string', description: 'ISO 8601' },
                },
                required: ['tree_id'],
            },
            handler: async (a) => {
                const { tree_id, ...params } = a;
                return ok(toolLogsSummary(await client.listToolLogs(tree_id, { limit: 20, ...params })));
            },
        },
        {
            name: 'treeflow_save_script',
            description: 'Crea (sin script_id) o modifica (con script_id: ID o nombre) un script Python o Node.js del bot. El código ' +
                'lee las entradas con inputs.get("nombre") y deja el resultado en outputs = {…}. Al modificar sólo hace falta ' +
                'mandar lo que cambia. Pruébalo con treeflow_test_script.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string' },
                    script_id: { type: 'string', description: 'Para modificar: ID o nombre. Sin él se crea uno nuevo' },
                    name: { type: 'string', description: 'Obligatorio al crear; único por bot' },
                    code: { type: 'string', description: 'Obligatorio al crear' },
                    language: { type: 'string', enum: ['python', 'node', 'javascript'], description: 'Default python' },
                    description: { type: 'string' },
                    timeout: { type: 'integer', description: 'Milisegundos (default 5000)' },
                    enabled: { type: 'boolean' },
                    inputVariables: variableSchema,
                    outputVariables: variableSchema,
                    errorMessage: { type: 'object' },
                    status: STATUS,
                },
                required: ['tree_id'],
            },
            handler: async (a) => {
                const { tree_id, script_id, ...fields } = a;
                if (script_id)
                    return ok(`Script actualizado: ${scriptLine(await client.updateScript(tree_id, script_id, fields))}`);
                if (!fields.name || !fields.code)
                    throw new Error('Para crear un script hacen falta name y code (para modificar uno, manda script_id).');
                return ok(`Script creado: ${scriptLine(await client.createScript(tree_id, fields))}`);
            },
        },
        {
            name: 'treeflow_test_script',
            description: 'Ejecuta un script guardado en caliente y devuelve sus outputs, stdout, stderr y tiempo. Las entradas salen del ' +
                'testValue de cada variable; test_values las sustituye al vuelo.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string' },
                    script_id: { type: 'string', description: 'ID o nombre' },
                    test_values: { type: 'object', description: 'Mapa nombre→valor para las entradas' },
                },
                required: ['tree_id', 'script_id'],
            },
            handler: async (a) => ok(await client.testScript(a.tree_id, a.script_id, a.test_values)),
        },
    ];
}
//# sourceMappingURL=fertilizers.js.map