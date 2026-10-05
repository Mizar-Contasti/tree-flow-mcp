import { ok } from './util.js';
// Documentación que no hace falta en cada llamada. En el catálogo o en las instrucciones
// viajaría siempre; aquí sólo cuando el modelo la pide.
export const GUIDE = {
    plantillas: `LENGUAJE DE PLANTILLAS (mensajes, preguntas de captura, URL y cuerpo de APIs)
Una sola sintaxis: { … }. Dentro, el $ distingue una variable de un texto.
  {$nombre}  el valor de la variable      {nombre}  la palabra "nombre"
  {$nombre.original_value}  como lo escribió el usuario · {$nombre.key_value}  normalizado
Una variable que no existe queda en blanco.
Condiciones: {$edad > 18 ? "adulto" : "menor"}; el ":" es opcional (si no se cumple, no sale nada).
  {$color == rojo} compara con el TEXTO "rojo"; {$color == $otro} con otra variable.
Texto y cálculo: { "Tienes " + $n + " mensajes" } · {$precio * 1.16} · {round($x, 2)}
Funciones: len($x) (caracteres), count($x) (cuántas veces lo dijo), round, min, max, abs, sum,
  str, int, float, bool; métodos de texto: {$x.upper()} {$x.capitalize()} {$x.strip()}.
Varios valores en una frase: {$producto[0]}, {$producto[1]}, {count($producto)}.
Del sistema: {$last_utterance} (lo último que escribió el usuario), {$last_no_match} (la última
  frase que el bot no entendió).
Respuesta de una API guardada en un parámetro: {$api.estado}, {$api.items[0]}.
Un JSON literal ({"a": 1}), CSS o una regex pasan intactos; dentro de un JSON el hueco sí se
  resuelve: {"cliente": "{$nombre}"}.
{{ }} YA NO EXISTE: no falla, imprime otra cosa ({{$x}} sale como "{Ana}"). Usa {$x}.`,
    apis: `HERRAMIENTAS API (treeflow_save_tool, treeflow_test_tool)
Campos planos: url, method (POST por defecto), body (JSON como texto), timeout (ms),
  authType + authConfig, inputVariables, outputVariables, errorMessage.
Variables: escríbelas { $nombre } en la url o el body y declara cada una en inputVariables
  ({ name, type, testValue }). testValue es lo que se usa al probar.
Salidas: cada outputVariable necesita name y jsonPath dentro de la respuesta
  (ej. "data.items[0].precio"); sin jsonPath nunca se extrae. fallbackValue se usa si falla.
  Después se usan como {$nombre} en mensajes y condiciones.
authConfig: basic {username, password} · bearer {token} · apiKey {key, value, in: "header"|"query"}.
Nombres únicos por bot (si se repite, el servidor añade _2, _3…).
Tras crearla o cambiarla queda "unconfigured": pruébala con treeflow_test_tool, que hace la
  llamada real con el mismo ejecutor de la conversación y devuelve ok / sin_datos / error.
Secretos: salen como ***. Un *** que devuelvas al guardar no pisa el valor real.
No inventes URLs, tokens ni claves: pídeselos al usuario.`,
    scripts: `SCRIPTS (treeflow_save_script, treeflow_test_script)
Python (default) o Node.js. Lee las entradas con inputs.get("nombre") y deja el resultado en un
  diccionario outputs, ej.: outputs = {"total": round(float(inputs.get("precio")) * 1.16, 2)}
Declara las entradas en inputVariables (con testValue para probar) y las salidas en
  outputVariables. Nombres únicos por bot (un duplicado da error 400).
treeflow_test_script lo ejecuta en caliente y devuelve outputs, stdout, stderr y tiempo.`,
    hojas: `HOJAS DEL CANVAS (treeflow_create_leaf, treeflow_update_leaf)
Tipos y claves de config habituales:
  intent: responde cuando se detecta una intención. intentName, messageText (o messageTemplateId
    con isCustomResponse: false), nextLeafId (a dónde pasa después), toolIds / scriptIds.
  trigger_context: un punto de espera que escucha intenciones y eventos y salta a otra hoja.
    intents: [{ name, targetLeafId }], events: [{ name, targetLeafId }], contextName.
  event: responde a un evento como sys.no-match. eventName, messageText, nextLeafId.
Una rama nueva trae su hoja Start (trigger_context): conéctala a tus hojas con update_leaf.
Para que el motor detecte una intención, alguna hoja trigger_context alcanzable debe escucharla.
Al crear varias, enlázalas con "ref:<ref>" en cualquier valor del config (nextLeafId, targetLeafId).
update_leaf combina el config por claves: manda sólo las que cambian; una en null se borra; las
  listas (intents, events) se sustituyen completas. Hace falta branch_id o tree_id.
Antes de editar una hoja existente, mira su config con treeflow_get_detail(tipo leaf).`,
    capturas: `CAPTURAS (treeflow_save_capture)
Una captura es la pregunta reutilizable del slot filling: la usan los parámetros de las
intenciones. Varios parámetros pueden compartir una, así que cambiarla los afecta a todos, al
instante y sin reentrenar.
  prompt: la pregunta (admite {$variable}) · fallback: qué dice si la respuesta no sirve
  limit: cuántas veces insiste (default 1) · on_limit_action al llegar al límite:
    next_param (pasa al siguiente parámetro), respond_anyway (responde sin el dato),
    skip_to_context (salta al contexto).
  *_rich + *_blocks: la pregunta o el fallback como bloques enriquecidos.
  *_template_id: usar una plantilla de mensaje como pregunta o fallback.`,
    suites: `SUITES DE PRUEBA (treeflow_save_test_suite, treeflow_run_test_suite)
Caso: { nombre, turnos: [{ mensaje, asserts: [{ tipo, valor, nombre? }] }] }. Cada caso corre en
una sesión nueva; sus turnos, en orden.
Tipos de assert:
  intencion: la intención detectada es valor · evento: igual, para eventos
  respuesta_contiene: la respuesta contiene valor (sin distinguir mayúsculas)
  parametro: el parámetro "nombre" vale valor · slot: el slot filling está pidiendo valor
Reentrena antes de correrla si cambiaste intenciones o entidades. run_test_suite devuelve los
totales y sólo lo que falló; treeflow_compare_test_runs dice qué cambió entre dos ejecuciones.`,
};
export function registerGuideTools() {
    const topics = Object.keys(GUIDE);
    return [
        {
            name: 'treeflow_guide',
            description: `Guía de referencia de Treeflow, por tema. Consúltala antes de escribir algo que no conozcas bien: ${topics.join(', ')}.`,
            inputSchema: {
                type: 'object',
                properties: { tema: { type: 'string', enum: topics } },
                required: ['tema'],
            },
            handler: async (a) => {
                const text = GUIDE[a.tema];
                if (!text)
                    throw new Error(`Tema desconocido. Hay: ${topics.join(', ')}.`);
                return ok(text);
            },
        },
    ];
}
//# sourceMappingURL=guide.js.map