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
true, false y null se escriben en minúscula (o True/False/None): {$pagado == true ? "sí" : "no"}.
Un texto roto se rechaza con un 422 que explica el hueco (un {{ }} viejo, una expresión que no compila, un
  {$ sin cerrar): corrígelo y vuelve a guardar. Hoy lo revisan los textos de los nodos, los parámetros de las
  intenciones y las APIs; las plantillas de mensaje y las capturas se guardan SIN revisar, así que ahí escribe
  {$x} bien a la primera.
{{ }} YA NO EXISTE: no falla, imprime otra cosa ({{$x}} sale como "{Ana}"). Usa {$x}.`,
    bloques: `BLOQUES ENRIQUECIDOS (treeflow_save_message_template)
Las responses de una plantilla son variantes: { type: "text", value: "Hola {$nombre}" } o
  { type: "payload", value: [bloque, bloque…] }. platform opcional: sin él es el canal general;
  web, telegram, whatsapp… dan a ese canal su propia respuesta.
De cada canal sale UNA variante al azar: un texto y un payload del mismo canal no salen juntos.
  Para texto con botones, todo en un payload: [párrafo, botones].
Bloque: { type, items: [...] } (align "vertical" u "horizontal", default vertical).
  paragraph   items [{ text }]
  buttons, quick_replies   items [{ label, type, payload }]; type: text (envía el texto de
              payload), postback (valor oculto), link (payload es la URL), event (nombre del evento)
  image       items [{ url, alt? }], layout single|grid
  card, carousel   items [{ title, subtitle?, imageUrl?, actions?: [botón] }]
  video, audio, file   items [{ url }] (file además filename)
  accordion   items [{ title, content }]
  dropdown    items [{ label, value }], placeholder, buttonLabel, actionType postback|text
  location    items [{ lat, long, title? }] · html  items [{ html }] · divider  items [] (una línea, mismo mensaje)
  message_break  items [] — «Nuevo mensaje»: lo que va después sale en otra burbuja (otro mensaje en
              WhatsApp, Telegram…). Úsalo para no pegar un html y el párrafo que lo sigue.
Ej.: [{ "type": "payload", "value": [{ "type": "paragraph", "items": [{ "text": "¿Qué deseas?" }] },
  { "type": "buttons", "items": [{ "label": "Ver menú", "type": "text", "payload": "ver menú" }] }] }]
Los textos de los bloques admiten {$variable}. En las capturas, prompt_blocks y fallback_blocks
  son listas de bloques, y prompt_responses y fallback_responses, variantes como éstas.`,
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
treeflow_test_script lo ejecuta en caliente y devuelve outputs, stdout, stderr y tiempo.
Tipo de cada variable: auto (el valor tal cual llega de la conversación, sin convertirlo), string,
  number, boolean, object, array. Con string/number el valor se convierte antes de llegar al script.
Un script corre UNA vez por turno desde un mismo nodo, aunque una condición vuelva a pasar por él.
Planes: en una instancia con el ejecutor aislado los scripts son de todos los planes; en el Treeflow
  de la nube sólo del Enterprise (si no, la prueba responde 403 «Ejecutar scripts no está disponible
  en tu plan»). Sus salidas quedan como {$nombre} para mensajes y condiciones.`,
    hojas: `HOJAS DEL CANVAS (treeflow_create_leaf, treeflow_update_leaf)
Tipos y claves de config habituales:
  intent: responde cuando se detecta una intención. intentName, messageText (o messageTemplateId
    con isCustomResponse: false), nextLeafId (a dónde pasa después), toolIds / scriptIds.
  trigger_context: un punto de espera que escucha intenciones y eventos y salta a otra hoja.
    intents: [{ name, targetLeafId }], events: [{ name, targetLeafId }], contextName.
  event: responde a un evento como sys.no-match. eventName, messageText, nextLeafId.
  condition: elige el camino por las variables, sin esperar al usuario: config.rules + elseLeafId
    (treeflow_guide("condiciones")).
Una rama nueva trae su hoja Start (trigger_context).
Para que el motor detecte una intención, alguna hoja trigger_context alcanzable debe escucharla.
Al crear varias, enlázalas con "ref:<ref>" en cualquier valor del config (nextLeafId, targetLeafId),
  y conéctalas desde una hoja existente con connect: [{ from, name, to: "ref:<ref>" }].
update_leaf combina el config por claves: manda sólo las que cambian; una en null se borra; las
  listas (intents, events) se sustituyen completas. Una ruta suelta: add_routes / remove_routes.
  Hace falta branch_id o tree_id.
Antes de editar una hoja existente, mira su config con treeflow_get_detail(tipo leaf).
Una API, script o consulta SQL se usa en una hoja poniendo su ID en config.toolIds / scriptIds
  (la consulta SQL va en toolIds, como una API); config.toolMappings {id: {inputs, outputs}} renombra
  variables. Corren cuando el turno llega a la hoja, antes de sus reglas.
Límites: 200 hojas por rama, config de hasta 500 KB, posiciones entre -1.000.000 y 1.000.000. Un nombre
  de hoja no puede quedar vacío. Si varias personas editan, tu guardado no pisa el lienzo de ellas: el
  lienzo detecta el cambio y lo junta.`,
    condiciones: `CONDICIONES (reglas en los nodos; treeflow_save_condition, treeflow_list_conditions)
Cuándo: el bot debe decir otra cosa o ir a otro nodo según lo que ya sabe ($variables de parámetros,
APIs o scripts). Dos listas en el config de un nodo (intent, event…). Gana la PRIMERA regla que se
cumple; si ninguna, lo de siempre (el «si no»: el mensaje o nextLeafId normal del nodo).
  Respuesta (qué dice): config.respuestasCondicionales = [{ name?, expression, messageTemplateId }]
    o con texto propio: { expression, messageText: "Hola {$nombre}" } (sin messageTemplateId)
  Transición (a dónde va): config.rules = [{ name?, expression, targetLeafId }]  (en create_leaf, "ref:<ref>")
  Un nodo de tipo condition no dice nada: sólo elige el camino con config.rules + elseLeafId (ya no sale en
    el menú del editor y sigue funcionando; para lo nuevo, mejor reglas en la Transición del nodo que ya habla).
  Condición guardada: una regla con nombre que se reutiliza. Crea la condición con save_condition y en
    la regla pon { condicion: "<nombre o ID>", messageTemplateId } o { condicion, targetLeafId }: toma su
    expresión y nombre; al editarla se actualiza en todos sus nodos y borrarla deja las reglas con la
    expresión que tenían. list_conditions dice en cuántos nodos se usa cada una.
  Una regla a medias (sin expression, sin destino o sin mensaje) no se guarda: el 422 dice el nodo y
    qué falta. Se evalúan con las variables ya capturadas, tras las APIs y scripts del nodo.
Expresiones (el lenguaje de las plantillas, sin llaves; un error de sintaxis se rechaza al guardar):
  $edad >= 18 · $plan == "pro" · $n == 5 (compara número aunque esté guardado como texto)
  "vip" in $nota (busca dentro del texto) · $nombre.startswith("A") · $pagado == true
  $ciudad == "" (vacío; una variable que no existe cuenta como vacía) · not $nota
  $a > 1 and ($b == "x" or $c)
  $veces >= 3: cuántas veces pasó por ese nodo (sólo en reglas de Transición y nodos condition)
Ejemplo completo: la condición "mayor" ($edad >= 18) y un nodo que, si es mayor, pasa al nodo Adulto
y si no al Menor:
  save_condition(tree_id, name: "mayor", expression: "$edad >= 18")
  update_leaf(leaf_id, branch_id, config: { rules: [{ condicion: "mayor", targetLeafId: <Adulto> }],
    nextLeafId: <Menor> })
y que además salude distinto: config: { respuestasCondicionales: [{ condicion: "mayor",
  messageText: "Bienvenido, adulto" }] }  (si no: el mensaje normal del nodo).
Las listas se sustituyen completas: para añadir una regla, lee el nodo con treeflow_get_detail y
reenvía la lista con la nueva. «Agregar condicionales» (treeflow_update_tree condicionales) sólo
enciende el editor de reglas; las reglas funcionan igual apagado.`,
    sql: `SQL (treeflow_save_sql_connection, treeflow_save_sql_query, treeflow_test_sql_query)
El bot consulta o escribe en la base del CLIENTE (PostgreSQL, MySQL/MariaDB o SQL Server) y usa lo que
vuelve como {$variables}. Dos piezas: una conexión (nombre, motor, host, puerto, base, usuario,
contraseña) y consultas que la nombran. Mismo nombre de conexión en Dev y Prod: las consultas viajan
entre ambientes y respaldos, las contraseñas nunca.
Variables: {$email} en el SQL, SIN comillas, igual en los tres motores. No se pegan en el texto: van
  como parámetros, así que un texto raro del usuario sólo es un dato. Entre comillas ('{$x}'), en un
  comentario o en un identificador se rechaza al guardar. Para buscar "contiene": postgres
  ILIKE '%' || {$q} || '%' · mysql LIKE CONCAT('%', {$q}, '%') · sqlserver LIKE '%' + {$q} + '%'.
  Entradas: inputVariables [{ name, testValue, fallbackValue }] (el fallback si la variable viene vacía).
Salidas: outputVariables [{ name, jsonPath? }]. Sin jsonPath, name es una COLUMNA de la PRIMERA fila.
  Rutas especiales: total (filas devueltas), afectadas (filas cambiadas por INSERT/UPDATE/DELETE; en un
  SELECT de MySQL sale un número enorme sin sentido: ahí usa total),
  filas.0.col, filas.1.col… Sin filas: la salida no existe y se usa su fallbackValue; sin ninguna salida
  el estado es sin_datos. Un valor largo se recorta a 4000 caracteres; máx. 500 filas, 32 KB de SQL,
  timeout 1-60 s, 2 consultas a la vez por workspace.
Motores (cambia el dialecto, no las variables):
  postgres   SELECT nombre, saldo FROM clientes WHERE email = {$email} LIMIT 1
             INSERT INTO pedidos (cliente, total) VALUES ({$cliente}, {$total}) RETURNING id
             WHERE nombre ILIKE '%' || {$q} || '%' · puerto 5432
  mysql      SELECT nombre, saldo FROM clientes WHERE email = {$email} LIMIT 1
             UPDATE citas SET estado = 'cancelada' WHERE id = {$cita} · puerto 3306 · identificadores entre comillas invertidas
             (no hay RETURNING: lee el id con otra consulta)
  sqlserver  SELECT TOP 1 nombre, saldo FROM clientes WHERE email = {$email}
             INSERT INTO pedidos (cliente, total) OUTPUT INSERTED.id VALUES ({$cliente}, {$total})
             puerto 1433 · identificadores [x] · el SSL aún no está disponible: ssl=false
Contar para decidir un camino: SELECT COUNT(*) AS existe FROM usuarios WHERE email = {$email}, salida
  "existe", y en la Transición del nodo una regla $existe > 0 → siguiente paso; el «si no» pide el
  correo otra vez (treeflow_guide("condiciones")). La consulta corre antes de evaluar las reglas.
Pasos: save_sql_connection → test_sql_connection → save_sql_query → test_sql_query (ejecuta de verdad:
  un UPDATE cambia datos) → ponerla en un nodo: update_leaf config.toolIds [id de la consulta].
Seguridad: sólo direcciones públicas (no localhost, ni redes privadas ni la base de Treeflow; una
  instancia puede abrir su red privada con SQL_PERMITIR_RED_PRIVADA). Usa un usuario de la base con sólo
  los permisos necesarios. Una conexión que usan consultas no se borra: cámbialas antes.
Errores típicos: «Una variable no puede ir entre comillas», «Cambiaste adónde se conecta … vuelve a
  escribir la contraseña», «inténtalo en un momento» (3ª consulta a la vez).`,
    capturas: `CAPTURAS (treeflow_save_capture)
Una captura es la pregunta reutilizable del slot filling: la usan los parámetros de las
intenciones. Varios parámetros pueden compartir una, así que cambiarla los afecta a todos, al
instante y sin reentrenar.
  prompt: la pregunta (admite {$variable}) · fallback: qué dice si la respuesta no sirve
  limit: cuántas veces insiste (default 1) · on_limit_action al llegar al límite:
    next_param (pasa al siguiente parámetro), respond_anyway (responde sin el dato),
    skip_to_context (salta al contexto).
  *_rich + *_blocks: la pregunta o el fallback como bloques enriquecidos (treeflow_guide("bloques")).
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