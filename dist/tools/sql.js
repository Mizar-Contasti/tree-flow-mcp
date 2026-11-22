import { clip } from './resumen.js';
import { ok, variableSchema } from './util.js';
const names = (vars) => (vars ?? []).map((v) => v?.name).filter(Boolean).join(', ');
const connLine = (c) => `- ${c.nombre} [${c.id}] ${c.motor} ${c.host}:${c.puerto}/${c.base || '?'} · usuario ${c.usuario || '?'}` +
    `${c.ssl ? ' · ssl' : ''} · ${c.tienePassword ? 'con contraseña' : 'SIN contraseña'}`;
const queryLine = (q) => [
    `- ${q.name} [${q.id}] sobre ${q.conexion || '?'} · estado ${q.status}${q.enabled === false ? ' · desactivada' : ''}`,
    names(q.inputVariables) && `entradas: ${names(q.inputVariables)}`,
    names(q.outputVariables) && `salidas: ${names(q.outputVariables)}`,
    `"${clip(q.sql, 70)}"`,
].filter(Boolean).join(' · ');
export function registerSqlTools(client) {
    return [
        {
            name: 'treeflow_list_sql',
            description: 'Lista las conexiones (a la base del cliente) y las consultas SQL del bot, con su ID, estado y variables. La ' +
                'contraseña nunca sale: sólo si la conexión tiene una. Motores, sintaxis y ejemplos: treeflow_guide("sql").',
            inputSchema: { type: 'object', properties: { tree_id: { type: 'string' } }, required: ['tree_id'] },
            handler: async (a) => {
                const { conexiones, consultas } = await client.getSql(a.tree_id);
                return ok([
                    `Conexiones (${conexiones.length}):`, ...conexiones.map(connLine),
                    `Consultas (${consultas.length}):`, ...consultas.map(queryLine),
                    'Una consulta se usa en un nodo poniendo su ID en config.toolIds (treeflow_update_leaf).',
                ].join('\n'));
            },
        },
        {
            name: 'treeflow_save_sql_connection',
            description: 'Crea (sin connection_ref) o modifica (con connection_ref: ID o nombre) la conexión a una base PostgreSQL, ' +
                'MySQL/MariaDB o SQL Server. Al modificar sólo hace falta mandar lo que cambia; sin password se conserva la ' +
                'guardada, salvo que cambie el motor, host, puerto o usuario (entonces hay que mandarla de nuevo). La contraseña ' +
                'pasaría por esta conversación: si es delicada, que el usuario la escriba en Herramientas › SQL. Pruébala con ' +
                'treeflow_test_sql_connection.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string' },
                    connection_ref: { type: 'string', description: 'Para modificar: ID o nombre. Sin él se crea una nueva' },
                    nombre: { type: 'string', description: 'Obligatorio al crear; las consultas la nombran así. Mismo nombre en Dev y Prod' },
                    new_name: { type: 'string', description: 'Para renombrarla (renombra también en sus consultas a mano)' },
                    motor: { type: 'string', enum: ['postgres', 'mysql', 'sqlserver'] },
                    host: { type: 'string', description: 'Dirección pública del servidor (no localhost ni redes privadas, salvo que la instancia lo permita)' },
                    puerto: { type: 'integer', description: 'Default según el motor: 5432, 3306, 1433' },
                    base: { type: 'string', description: 'Nombre de la base de datos' },
                    usuario: { type: 'string', description: 'Mejor uno con sólo los permisos que el bot necesita' },
                    password: { type: 'string' },
                    ssl: { type: 'boolean', description: 'Cifra el tráfico (sin verificar certificado). SQL Server aún no lo admite' },
                },
                required: ['tree_id'],
            },
            handler: async (a) => {
                const { tree_id, connection_ref, ...fields } = a;
                const saved = await client.saveSqlConnection(tree_id, connection_ref, fields);
                return ok(`Conexión ${connection_ref ? 'actualizada' : 'creada'}:\n${connLine(saved)}`);
            },
        },
        {
            name: 'treeflow_test_sql_connection',
            description: 'Prueba una conexión guardada: se conecta con la contraseña guardada y corre SELECT 1. Devuelve ok, el error ' +
                'de la base y los milisegundos. Máx. 30 pruebas por minuto.',
            inputSchema: {
                type: 'object',
                properties: { tree_id: { type: 'string' }, connection_ref: { type: 'string', description: 'ID o nombre' } },
                required: ['tree_id', 'connection_ref'],
            },
            handler: async (a) => {
                const { conexiones } = await client.getSql(a.tree_id);
                const c = client.findSql(conexiones, a.connection_ref, 'nombre', 'la conexión');
                return ok(await client.testSqlConnection(a.tree_id, c));
            },
        },
        {
            name: 'treeflow_save_sql_query',
            description: 'Crea (sin query_ref) o modifica (con query_ref: ID o nombre) una consulta SQL. Las variables van en el SQL como ' +
                '{$email}, SIN comillas: se mandan aparte como parámetros. Al modificar sólo hace falta mandar lo que cambia; ' +
                'las listas de variables, si las mandas, sustituyen a las anteriores, y la consulta vuelve a "unconfigured". ' +
                'Hace lo que diga su texto: un UPDATE escribe de verdad. Pruébala con treeflow_test_sql_query. Ejemplos por ' +
                'motor, salidas y cómo usarla en un nodo: treeflow_guide("sql").',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string' },
                    query_ref: { type: 'string', description: 'Para modificar: ID o nombre. Sin él se crea una nueva' },
                    name: { type: 'string', description: 'Obligatorio al crear; único por bot' },
                    sql: { type: 'string', description: 'Obligatorio al crear (máx. 32 KB)' },
                    connection: { type: 'string', description: 'Nombre de una conexión del bot. Obligatoria al crear' },
                    description: { type: 'string' },
                    inputVariables: { ...variableSchema, description: 'Datos que el SQL pide ({$nombre}); testValue es el de las pruebas, fallbackValue el de respaldo' },
                    outputVariables: { ...variableSchema, description: 'Qué se guarda de la respuesta: name = columna de la primera fila (o jsonPath: total, afectadas, filas.0.col)' },
                    timeout: { type: 'integer', description: 'Milisegundos, de 1000 a 60000 (default 15000)' },
                    maxFilas: { type: 'integer', description: 'De 1 a 500 (default 50)' },
                    enabled: { type: 'boolean' },
                    errorMessage: { type: 'object', description: 'Mensaje si falla, por idioma: {"es":"…"}' },
                    status: { type: 'string', enum: ['unconfigured', 'validated', 'deployed', 'error'], description: 'Sólo al modificar' },
                },
                required: ['tree_id'],
            },
            handler: async (a) => {
                const { tree_id, query_ref, ...fields } = a;
                const saved = await client.saveSqlQuery(tree_id, query_ref, fields);
                return ok(`Consulta ${query_ref ? 'actualizada' : 'creada'}:\n${queryLine(saved)}`);
            },
        },
        {
            name: 'treeflow_test_sql_query',
            description: 'Ejecuta de verdad una consulta guardada con los valores de prueba y devuelve estado (ok, sin_datos, error), filas ' +
                '(máx. 20), total, afectadas, entradas usadas y salidas extraídas con su nombre. Si escribe, escribe. ' +
                'test_values sustituye al vuelo los testValue.',
            inputSchema: {
                type: 'object',
                properties: {
                    tree_id: { type: 'string' },
                    query_ref: { type: 'string', description: 'ID o nombre' },
                    test_values: { type: 'object', description: 'Mapa nombre→valor para las entradas, ej. {"email":"ana@x.com"}' },
                },
                required: ['tree_id', 'query_ref'],
            },
            handler: async (a) => {
                const { consultas } = await client.getSql(a.tree_id);
                const q = client.findSql(consultas, a.query_ref, 'name', 'la consulta');
                const consulta = {
                    ...q,
                    inputVariables: (q.inputVariables ?? []).map((v) => ({
                        ...v, ...(a.test_values && a.test_values[v.name] !== undefined ? { testValue: a.test_values[v.name] } : {}),
                    })),
                };
                return ok(await client.testSqlQuery(a.tree_id, consulta));
            },
        },
    ];
}
//# sourceMappingURL=sql.js.map