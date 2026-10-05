import { suiteLine, testRunSummary } from './resumen.js';
import { ok } from './util.js';
const casesSchema = {
    type: 'array',
    description: 'Casos de prueba. Cada caso: { nombre, turnos:[{ mensaje, asserts:[…] }] }. Un caso sin turnos se rechaza. ' +
        'Cada assert lleva "tipo": intencion | respuesta_contiene | parametro (con "nombre") | slot | evento, más el valor esperado.',
    items: {
        type: 'object',
        properties: {
            nombre: { type: 'string' },
            turnos: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        mensaje: { type: 'string', description: 'Lo que escribe el usuario' },
                        asserts: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    tipo: { type: 'string', enum: ['intencion', 'respuesta_contiene', 'parametro', 'slot', 'evento'] },
                                    nombre: { type: 'string', description: 'Obligatorio si tipo es "parametro"' },
                                },
                                required: ['tipo'],
                            },
                        },
                    },
                    required: ['mensaje'],
                },
            },
        },
        required: ['turnos'],
    },
};
export function registerSuiteTools(client) {
    return [
        {
            name: 'treeflow_list_test_suites',
            description: 'Lista las suites de prueba del bot: conjuntos de conversaciones guiadas con comprobaciones, para detectar regresiones.',
            inputSchema: { type: 'object', properties: { tree_id: { type: 'string' } }, required: ['tree_id'] },
            handler: async (a) => ok(await client.listTestSuites(a.tree_id)),
        },
        {
            name: 'treeflow_get_test_suite',
            description: 'Obtiene una suite con todos sus casos.',
            inputSchema: { type: 'object', properties: { suite_id: { type: 'string' } }, required: ['suite_id'] },
            handler: async (a) => ok(await client.getTestSuite(a.suite_id)),
        },
        {
            name: 'treeflow_create_test_suite',
            description: 'Crea una suite de prueba, opcionalmente con sus casos.',
            inputSchema: {
                type: 'object',
                properties: { tree_id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, cases: casesSchema },
                required: ['tree_id', 'name'],
            },
            handler: async (a) => {
                const { tree_id, ...data } = a;
                return ok(`${suiteLine(await client.createTestSuite(tree_id, data))} creada`);
            },
        },
        {
            name: 'treeflow_update_test_suite',
            description: 'Modifica una suite. Si mandas "cases", sustituye a TODOS los casos anteriores.',
            inputSchema: {
                type: 'object',
                properties: { suite_id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, cases: casesSchema },
                required: ['suite_id'],
            },
            handler: async (a) => {
                const { suite_id, ...data } = a;
                return ok(`${suiteLine(await client.updateTestSuite(suite_id, data))} actualizada`);
            },
        },
        {
            name: 'treeflow_delete_test_suite',
            description: 'Elimina una suite de prueba y su historial de ejecuciones.',
            inputSchema: { type: 'object', properties: { suite_id: { type: 'string' } }, required: ['suite_id'] },
            handler: async (a) => ok(await client.deleteTestSuite(a.suite_id)),
        },
        {
            name: 'treeflow_import_test_suite_csv',
            description: 'Carga los casos de una suite desde texto CSV (la plantilla está en GET /test-suites/plantilla.csv). ' +
                'modo "reemplazar" (default) sustituye los casos; "agregar" los añade a los existentes.',
            inputSchema: {
                type: 'object',
                properties: {
                    suite_id: { type: 'string' },
                    csv: { type: 'string', description: 'Contenido del CSV como texto' },
                    modo: { type: 'string', enum: ['reemplazar', 'agregar'] },
                },
                required: ['suite_id', 'csv'],
            },
            handler: async (a) => ok(await client.importTestSuiteCsv(a.suite_id, a.csv, a.modo)),
        },
        {
            name: 'treeflow_export_test_suite_csv',
            description: 'Devuelve los casos de una suite como texto CSV.',
            inputSchema: { type: 'object', properties: { suite_id: { type: 'string' } }, required: ['suite_id'] },
            handler: async (a) => ok(await client.exportTestSuiteCsv(a.suite_id)),
        },
        {
            name: 'treeflow_run_test_suite',
            description: 'Ejecuta la suite completa contra el motor del bot y devuelve los totales y el detalle sólo de lo que falló ' +
                '(lo que pasó no se repite; el detalle completo está en treeflow_get_test_run). Corre en la misma petición. ' +
                'Reentrena antes si cambiaste intenciones o entidades, o fallará por el modelo viejo.',
            inputSchema: { type: 'object', properties: { suite_id: { type: 'string' } }, required: ['suite_id'] },
            handler: async (a) => ok(testRunSummary(await client.runTestSuite(a.suite_id))),
        },
        {
            name: 'treeflow_list_test_runs',
            description: 'Historial de ejecuciones de una suite (sólo titulares y totales, sin el detalle por caso).',
            inputSchema: {
                type: 'object',
                properties: { suite_id: { type: 'string' }, limit: { type: 'integer', description: 'Default 20, máx. 100' } },
                required: ['suite_id'],
            },
            handler: async (a) => ok(await client.listTestRuns(a.suite_id, a.limit)),
        },
        {
            name: 'treeflow_get_test_run',
            description: 'Resultado completo de una ejecución, con el detalle de cada caso y turno.',
            inputSchema: { type: 'object', properties: { run_id: { type: 'string' } }, required: ['run_id'] },
            handler: async (a) => ok(await client.getTestRun(a.run_id)),
        },
        {
            name: 'treeflow_compare_test_runs',
            description: 'Compara dos ejecuciones: qué pasaba y ahora falla (regresiones) y qué fallaba y ahora pasa.',
            inputSchema: {
                type: 'object',
                properties: { run_id: { type: 'string', description: 'Ejecución base (la anterior)' }, other_run_id: { type: 'string', description: 'Ejecución a comparar (la nueva)' } },
                required: ['run_id', 'other_run_id'],
            },
            handler: async (a) => ok(await client.compareTestRuns(a.run_id, a.other_run_id)),
        },
    ];
}
//# sourceMappingURL=suites.js.map