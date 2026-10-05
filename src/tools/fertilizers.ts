import { TreeflowClient, maskSecrets } from '../client/treeflowClient.js';
import { fertilizersSummary, toolLogsSummary } from './resumen.js';
import { ok, variableSchema } from './util.js';

const TOOL_NOTE =
  'Las variables se escriben { $nombre } en la URL y el cuerpo (la sintaxis {{ }} ya no existe). ' +
  'Los nombres de herramientas son únicos por bot: si se repite, el servidor añade _2, _3…';

export function registerFertilizerTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_list_fertilizers',
      description:
        'Lista las herramientas del bot: el webhook principal, las APIs externas y los scripts, cada una con su ID, ' +
        'estado y los nombres de sus variables. La configuración completa de una (URL, cuerpo, código, ' +
        'autenticación): treeflow_get_detail con tipo tool o script. Los secretos salen enmascarados (***).',
      inputSchema: {
        type: 'object',
        properties: { tree_id: { type: 'string', description: 'ID del bot/árbol' } },
        required: ['tree_id'],
      },
      handler: async (args: { tree_id: string }) => ok(fertilizersSummary(await client.listFertilizers(args.tree_id))),
    },
    {
      name: 'treeflow_create_tool',
      description:
        'Crea una herramienta de tipo API (llamada HTTP) y la guarda. ' + TOOL_NOTE +
        ' Después conviene probarla con treeflow_test_tool; el estado queda "unconfigured" hasta entonces.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string', description: 'ID del bot/árbol' },
          name: { type: 'string', description: 'Nombre único de la herramienta' },
          url: { type: 'string', description: 'URL a llamar. Admite variables { $nombre }' },
          method: { type: 'string', enum: ['POST', 'GET', 'PATCH', 'PUT', 'DELETE', 'QUERY'], description: 'Default: POST' },
          description: { type: 'string' },
          body: { type: 'string', description: 'Cuerpo JSON como texto (default "{}"). Admite { $nombre }' },
          timeout: { type: 'integer', description: 'Milisegundos (default 30000)' },
          authType: { type: 'string', enum: ['none', 'basic', 'bearer', 'apiKey'] },
          authConfig: {
            type: 'object',
            description: 'basic: {username,password}. bearer: {token}. apiKey: {key,value,in:"header"|"query"}',
          },
          inputVariables: { ...variableSchema, description: 'Datos que el bot le pasa a la API' },
          outputVariables: { ...variableSchema, description: 'Datos que el bot extrae de la respuesta' },
          errorMessage: { type: 'object', description: 'Mensaje al usuario si falla sin valores de respaldo, por idioma: {"es":"..."}' },
        },
        required: ['tree_id', 'name', 'url'],
      },
      handler: async (a: any) => {
        const { tree_id, ...input } = a;
        return ok(maskSecrets(await client.createTool(tree_id, input)));
      },
    },
    {
      name: 'treeflow_update_tool',
      description:
        'Modifica una herramienta API existente (por id o nombre). Sólo hace falta mandar lo que cambia. ' +
        'Si mandas inputVariables u outputVariables, sustituyen a la lista completa. ' +
        'Al cambiarla vuelve a "unconfigured" salvo que indiques status. ' + TOOL_NOTE,
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string' },
          tool_id: { type: 'string', description: 'ID o nombre de la herramienta' },
          name: { type: 'string' },
          url: { type: 'string' },
          method: { type: 'string', enum: ['POST', 'GET', 'PATCH', 'PUT', 'DELETE', 'QUERY'] },
          description: { type: 'string' },
          body: { type: 'string' },
          timeout: { type: 'integer' },
          enabled: { type: 'boolean' },
          authType: { type: 'string', enum: ['none', 'basic', 'bearer', 'apiKey'] },
          authConfig: { type: 'object', description: 'Se fusiona con la existente' },
          inputVariables: variableSchema,
          outputVariables: variableSchema,
          errorMessage: { type: 'object' },
          status: { type: 'string', enum: ['unconfigured', 'validated', 'deployed', 'error'] },
        },
        required: ['tree_id', 'tool_id'],
      },
      handler: async (a: any) => {
        const { tree_id, tool_id, ...patch } = a;
        return ok(maskSecrets(await client.updateTool(tree_id, tool_id, patch)));
      },
    },
    {
      name: 'treeflow_delete_tool',
      description: 'Elimina una herramienta API del bot (por id o nombre). Los nodos que la usen dejan de ejecutarla.',
      inputSchema: {
        type: 'object',
        properties: { tree_id: { type: 'string' }, tool_id: { type: 'string', description: 'ID o nombre' } },
        required: ['tree_id', 'tool_id'],
      },
      handler: async (a: { tree_id: string; tool_id: string }) => ok(await client.deleteTool(a.tree_id, a.tool_id)),
    },
    {
      name: 'treeflow_test_tool',
      description:
        'Prueba una herramienta API guardada con el MISMO ejecutor que usa la conversación. Hace una llamada real a la URL. ' +
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
      handler: async (a: any) => ok(await client.testTool(a.tree_id, a.tool_id, a.test_values)),
    },
    {
      name: 'treeflow_list_tool_logs',
      description:
        'Historial de ejecuciones de herramientas del bot (las reales de conversaciones y las pruebas), con filtros. ' +
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
      handler: async (a: any) => {
        const { tree_id, ...params } = a;
        return ok(toolLogsSummary(await client.listToolLogs(tree_id, { limit: 20, ...params })));
      },
    },
    {
      name: 'treeflow_create_script',
      description:
        'Crea un script personalizado (Python o Node.js) y lo guarda. El código lee las entradas con inputs.get("nombre") ' +
        'y debe dejar el resultado en un dict `outputs`, ej. outputs = {"resultado": valor}. Los nombres son únicos por bot ' +
        '(un duplicado da error 400). Pruébalo con treeflow_test_script.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string' },
          name: { type: 'string' },
          code: { type: 'string', description: 'Código fuente' },
          language: { type: 'string', enum: ['python', 'node', 'javascript'], description: 'Default: python' },
          description: { type: 'string' },
          timeout: { type: 'integer', description: 'Milisegundos (default 5000)' },
          inputVariables: variableSchema,
          outputVariables: variableSchema,
          errorMessage: { type: 'object' },
        },
        required: ['tree_id', 'name', 'code'],
      },
      handler: async (a: any) => {
        const { tree_id, ...input } = a;
        return ok(await client.createScript(tree_id, input));
      },
    },
    {
      name: 'treeflow_update_script',
      description: 'Modifica un script (por id o nombre). Sólo hace falta mandar lo que cambia; las listas de variables, si se mandan, sustituyen a las anteriores.',
      inputSchema: {
        type: 'object',
        properties: {
          tree_id: { type: 'string' },
          script_id: { type: 'string', description: 'ID o nombre' },
          name: { type: 'string' },
          code: { type: 'string' },
          language: { type: 'string', enum: ['python', 'node', 'javascript'] },
          description: { type: 'string' },
          timeout: { type: 'integer' },
          enabled: { type: 'boolean' },
          inputVariables: variableSchema,
          outputVariables: variableSchema,
          errorMessage: { type: 'object' },
          status: { type: 'string', enum: ['unconfigured', 'validated', 'deployed', 'error'] },
        },
        required: ['tree_id', 'script_id'],
      },
      handler: async (a: any) => {
        const { tree_id, script_id, ...patch } = a;
        return ok(await client.updateScript(tree_id, script_id, patch));
      },
    },
    {
      name: 'treeflow_delete_script',
      description: 'Elimina un script del bot (por id o nombre).',
      inputSchema: {
        type: 'object',
        properties: { tree_id: { type: 'string' }, script_id: { type: 'string', description: 'ID o nombre' } },
        required: ['tree_id', 'script_id'],
      },
      handler: async (a: { tree_id: string; script_id: string }) => ok(await client.deleteScript(a.tree_id, a.script_id)),
    },
    {
      name: 'treeflow_test_script',
      description:
        'Ejecuta un script guardado en caliente y devuelve sus outputs, stdout, stderr y tiempo. Las entradas salen del ' +
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
      handler: async (a: any) => ok(await client.testScript(a.tree_id, a.script_id, a.test_values)),
    },
  ];
}
