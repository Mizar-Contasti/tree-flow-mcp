# Plan: que el MCP gaste menos tokens

Quien lo usó reportó que "se le comieron los tokens rapidísimo" con un modelo y un
esfuerzo normales. Este documento explica por qué, cómo se va a corregir y en qué
orden. Cada fase se cierra con su commit en la rama `eficiencia-tokens`.

## Por qué gasta tanto

Cada vez que el modelo llama a una herramienta, el cliente le vuelve a mandar **todo**:
el catálogo de herramientas, las instrucciones y la conversación entera, con cada
resultado anterior. El gasto de una sesión es, a grandes rasgos:

    número de llamadas × (catálogo + todo lo acumulado en la conversación)

Así que hay dos palancas: **lo que queda en el contexto** y **cuántas vueltas se dan**.
El MCP fallaba en las dos.

## Línea base (1.1.0, medida el 5-oct-2026)

Árbol de referencia: "CECYTECH BUENO" de la base de dev (7 ramas, 148 hojas, 101
intenciones, 88 plantillas, 9 APIs y 5 scripts), medido contra la API real con
`scripts/medir-tokens.mjs`. Tokens estimados a 3.5 caracteres por token.

| Qué | Caracteres | Tokens aprox. |
|---|---|---|
| Catálogo (80 herramientas) | 48,131 | ~13,750 en **cada** llamada |
| Instrucciones del servidor | 3,198 | ~900 en cada llamada |
| `export_tree` | 14,645,991 | ~4,180,000: no cabe en ningún contexto |
| `get_tree_data` | 426,573 | ~122,000 |
| `list_training_history` | 304,110 | ~87,000 |
| `list_fertilizers` | 295,001 | ~84,000 |
| `list_change_history` | 179,737 | ~51,000 |
| `list_branches` | 161,696 | ~46,000 |
| `list_message_templates` | 108,381 | ~31,000 |
| `list_intents` | 96,167 | ~27,000 |
| `list_tool_logs` | 62,094 | ~18,000 |
| `list_leafs` (la rama más grande) | 48,323 | ~14,000 |
| `list_entities` | 31,705 | ~9,000 |

Qué pesa en cada una (desglose por campo):

- `export_tree`: el historial de cambios (3 M caracteres), el de entrenamientos (2.7 M) y
  los logs de webhooks (2.7 M), completos.
- `list_fertilizers`: `lastResponse` (la última respuesta de cada API, 100 mil) y los
  scripts **dos veces**, como `scripts` y como `custom_scripts` (46 mil cada uno).
- `list_training_history`: `changes_detail`, 137 mil en sólo 10 entrenamientos.
- `list_change_history`: el antes/después de cada cambio, 108 mil en 50 registros.
- `list_intents`: las frases **dos veces**, como `patterns` y `displayPatterns`.
- `list_message_templates`: los bloques `responses` completos de las 88 plantillas.
- `list_branches` y `get_tree_data`: cada rama trae todas sus hojas con su `config`
  completo; cada hoja repite IDs, fechas y posición.

Problemas encontrados:

1. **Las lecturas vuelcan todo**, y las instrucciones le dicen al modelo que empiece por
   `get_tree_data`. No hay forma de pedir un resumen primero y el detalle después.
2. **`update_leaf` reemplaza el `config` entero** (el backend hace `setattr`), pero las
   instrucciones dicen que basta mandar lo que cambia. Si el modelo manda sólo
   `messageText`, la hoja pierde sus `intents`, su `nextLeafId` y sus `customResponses`.
   Para no romper nada, el modelo tiene que leer todo antes de editar: gasta más y, si no
   lo hace, borra datos.
3. **Todo sale como JSON con sangría**: +51% de caracteres sobre el JSON compacto.
4. **Las escrituras devuelven el objeto completo**, que también se queda en la conversación.
5. **Listados sin tope**: `list_conversations` devuelve todas las conversaciones del bot.
6. **Vueltas de más**: entrenar exige consultar el estado varias veces; no hay forma de
   crear varias intenciones u hojas en una sola llamada.
7. **El catálogo pesa en cada llamada**: las 10 herramientas de APIs y scripts son el 25%
   del catálogo y casi nunca se usan; cada par `create_X`/`update_X` repite su esquema.

## Cómo se verifica

- **Medición**: `scripts/medir-tokens.mjs` mide el catálogo por módulo y el tamaño de las
  respuestas de lectura sobre un árbol. Sólo imprime tamaños, nunca contenido ni claves.
- **Pruebas**: `npm test` (`node --test`, sin dependencias nuevas) con datos sintéticos,
  no de clientes.
- **Contra dev**: cada fase se prueba contra el backend local (`localhost:8000`) con una
  clave de prueba guardada en `.env`, que está en `.gitignore`. Las escrituras se prueban
  en un bot de pruebas, nunca en los árboles existentes.
- **Rutas**: `npm run validate:routes` sigue pasando.
- **De punta a punta**: `scripts/e2e-dev.mjs` crea (o reutiliza) el bot "MCP pruebas
  (Claude)" en dev y ejercita las herramientas contra el backend real. No toca otros bots.

## Fases

### Fase 0 — Base de medición y pruebas
- [x] Clave de API de prueba en dev, en `.env` ("MCP pruebas locales (Claude)").
- [x] `scripts/medir-tokens.mjs` (`npm run medir`) y línea base registrada.
- [x] `npm test` con las primeras pruebas; el catálogo y las instrucciones pasan a
      `src/catalog.ts` para poder medirlos y probarlos sin arrancar el servidor.

Listo cuando: la línea base está medida y build + pruebas pasan.

### Fase 1 — Lecturas: resumen primero, detalle bajo demanda
- [x] `get_tree_data` devuelve un esquema en texto: una línea por hoja con su tipo, ID,
      lo que dice (recortado), qué escucha y a dónde va; intenciones, entidades y
      plantillas con sus conteos.
- [x] `list_branches` devuelve las ramas sin sus hojas; `list_leafs`, el esquema de una rama.
- [x] `list_intents`, `list_entities`, `list_message_templates` y `list_fertilizers`
      devuelven resúmenes (nombre, ID, conteos, nombres de variables), sin duplicados.
- [x] Una sola herramienta de detalle, `get_detail(tipo, ref)`, para una hoja, intención,
      entidad, plantilla, API o script, por ID o por nombre único. Una herramienta en vez
      de cinco: pesa menos en el catálogo.
- [x] Historiales: `list_change_history` resume cada cambio con los campos que tocó (el
      antes/después completo, con `change_id`) y acepta filtros; `list_training_history`
      va sin `changes_detail`; `list_tool_logs` recorta entradas y salidas, 20 por defecto.
- [x] `export_tree` guarda el JSON en `~/treeflow-exports` (o `TREEFLOW_EXPORT_DIR`) y
      devuelve la ruta y los conteos; `import_tree` acepta esa ruta.
- [x] Instrucciones: explorar con el esquema y pedir el detalle de lo que se va a tocar.

Listo cuando: `get_tree_data` del árbol de referencia pesa ≤ 10% de la línea base,
ninguna lectura de la tabla pasa de ~20,000 caracteres, y cada hoja, intención y
entidad sigue apareciendo con su ID.

### Fase 2 — Editar sin leer todo, y sin borrar
- [x] `update_leaf` combina el `config` nuevo con el guardado: sólo cambian las claves
      que se mandan, `null` borra una clave y `replace_config: true` sustituye todo.
      Necesita `branch_id` o `tree_id` para leer el guardado; sin ellos se niega en vez
      de borrar. Reproducido en dev: con 1.1.0, mandar sólo `messageText` dejaba la hoja
      sin `eventName`, `eventType` ni `isCustomResponse`.
- [x] `update_intent` acepta `add_patterns`/`remove_patterns` y `update_entity`
      `add_values`/`remove_values`: añadir una frase ya no exige leer y reenviar todas.
- [x] `update_intent` ya no reenvía las `displayPatterns` viejas al cambiar las frases
      (con el mismo número de frases, el backend las conservaba y la pantalla mostraba
      frases que el bot ya no tenía).
- [x] `configure_integration` guardaba la config anidada en `config`, donde el backend no
      la lee: ahora la combina plana en el canal. Árbol, voz y plantillas ya aceptaban
      cambios parciales; las descripciones dicen qué listas se sustituyen completas.
- [x] Secretos en la URL (`?key=…`, `token=…`) de APIs, webhook y transferencias: se
      enmascaran al leer y se restauran al guardar; un `***` que devuelva el modelo nunca
      pisa el valor real (también en `authConfig` y `auth_token`).
- [x] La regla de las instrucciones dice ahora la verdad sobre listas y config.

Hallazgo fuera de este plan: el esquema de parámetros de `create_intent`/`update_intent`
documenta `{ name, entity_name, required, prompt }`, pero el backend (`EntityDef` en
`api/intents.py`) no tiene `entity_name` y lo descarta. En los parámetros guardados,
`name` es el nombre de la **entidad** y `key`/`entityId` su ID. Un parámetro creado por
el MCP queda sin entidad. Resuelto aparte: el modelo manda `{ parameterName, entity }` con
la entidad por nombre y el cliente la guarda como el editor (`name`, `key`, `entityId`);
el e2e comprueba en dev que el slot filling pide el dato.

Listo cuando: en dev, cambiar sólo el `messageText` de una hoja conserva sus
`intents`, su `nextLeafId` y sus `customResponses`.

### Fase 3 — Respuestas cortas
- [x] Todas las respuestas en JSON compacto, por una sola función (`ok()`).
- [x] Las escrituras devuelven una línea con el ID y lo imprescindible para el siguiente
      paso: `create_branch` trae su hoja Start, `create_leaf`/`update_leaf` la línea de la
      hoja, intenciones/entidades/plantillas/APIs/scripts su línea de resumen,
      `configure_integration` sólo el canal tocado.
- [x] `list_trees` y `get_tree` sin la configuración del widget (está en
      `list_integrations`).
- [x] Topes por defecto: 20 conversaciones (con filtros) y 20 atenciones.
- [x] `simulate_message`: lo que contestó, intención, confianza, hoja, parámetros y
      `session_id`; sin sentimiento, STT ni candidatos repetidos (2,024 → 490 car.).
      `get_conversation`: un turno por línea. `run_test_suite`: totales y sólo lo que
      falló.

Efecto colateral: el catálogo creció de 48,131 a 52,686 caracteres con los parámetros y
descripciones nuevos de las fases 1–3. Recortarlo es la fase 5.

Listo cuando: ninguna escritura devuelve el objeto completo y ningún listado es ilimitado.

### Fase 4 — Menos vueltas
- [x] `trigger_training` espera a que el entrenamiento termine (hasta 90 s, ajustable) y
      devuelve el resultado final con `can_use` y, si falló, el error del historial.
      Fuerza por defecto: ver el hallazgo del reloj más abajo.
- [x] `create_intent` y `create_entity` reciben listas; una que falla no detiene a las
      demás y se informa en su línea.
- [x] `create_leaf` recibe una lista de hojas enlazadas entre sí con `"ref:<ref>"`. Los
      UUID se asignan antes de crear (el backend acepta `id`), así que todo queda enlazado
      en una pasada; un ref roto se rechaza antes de crear nada. Sin posición, las hojas
      van en fila en vez de amontonarse en (0,0).
- [x] La descripción de `create_leaf` ofrecía tipos que el motor no usa (`input`,
      `condition`, `action`, `webhook`); ahora explica `intent`, `trigger_context` y `event`.

Verificado en dev: tres hojas enlazadas en una llamada (enlaces comprobados releyéndolas),
dos intenciones y una entidad en lote, y un entrenamiento que esperó 3 s e incluyó las
intenciones nuevas.

**Hallazgo en el backend (fuera de este plan): el estado de entrenamiento compara relojes
distintos.** `training_history.completed_at` se guarda en UTC
(`datetime.now(timezone.utc).replace(tzinfo=None)` en `api/train.py`) y
`change_history.created_at` en hora local de la base (`now()`, -06 en dev); las dos
columnas son `timestamp without time zone`. `get_training_status` busca cambios
posteriores al último entrenamiento, y durante las 6 horas siguientes a cualquier
entrenamiento ningún cambio lo parece: el estado dice "updated" y `POST /train` sin
`force` **se salta el entrenamiento** aunque haya intenciones nuevas. Medido en dev:
último entrenamiento `23:47:08`, último cambio `17:47:31` del mismo día, 23 s después en
tiempo real. Falta comprobar la zona horaria de la base de producción.

### Fase 5 — Catálogo más liviano
- [x] Juntar `create_X`/`update_X` donde repetían esquema (36% del catálogo): `save_tool`,
      `save_script`, `save_capture`, `save_transfer`, `save_message_template` y
      `save_test_suite` crean sin ID y modifican con ID.
- [x] Los diez `delete_*` pasan a un solo `treeflow_delete(tree_id, tipo, ref)`.
- [x] La documentación larga pasa a `treeflow_guide(tema)`: plantillas, apis, scripts,
      hojas, capturas, suites. Las instrucciones bajan de 3,967 a ~1,700 caracteres.
- [x] Grupos de herramientas. Decidido por Mizar: por defecto, la **base** (27) más
      **capturas** y **respaldos**. Opcionales: apis, pruebas, atencion, historial, admin.
      Se eligen con `TREEFLOW_TOOLSETS` ("apis,pruebas" sustituye a los de por defecto;
      "todo" los carga todos) o, a mitad de una conversación, con `treeflow_enable_tools`,
      que avisa al cliente con `tools/list_changed`. Las instrucciones sólo nombran
      herramientas de los grupos activos.

Por llamada, por defecto: 36 herramientas, ~7,100 tokens entre catálogo e instrucciones
(1.1.0: ~14,650). Con todo activo: 67 herramientas, ~12,400. El objetivo de ~5,000 era
para la base sola, que pesa ~5,100; capturas y respaldos se añadieron a propósito.

Hallazgo fuera de este plan: `save_message_template` crea los bloques de texto como
`{type: "text", text}`, pero las plantillas guardadas los tienen como `{type, value}`, y
los formateadores del backend (`core/utils/native_rich_messages.py`) leen bloques
`{type, items}`. El backend guarda `responses` tal cual llega. La descripción ya no
documenta un formato de bloques: remite a copiar el de una plantilla existente. Falta
comprobar cómo se ve en un canal una plantilla creada por el MCP. Resuelto aparte: las
respuestas son variantes `{type: "text", value}` o `{type: "payload", value: [bloques]}`,
los bloques `{type, items}` van dentro del payload, y el formato está en
`treeflow_guide("bloques")`; el e2e comprueba en dev que el motor contesta con ella.

### Fase 6 — Cierre
- [x] README con los grupos, los cambios que rompen con 1.1.0 y cómo probar.
- [x] Versión 1.2.0; el servidor la lee del `package.json`.
- [x] Medición final contra la línea base y prueba completa en dev: 59 pruebas, 76 rutas
      válidas, 13 comprobaciones de punta a punta contra el backend real.
- [x] Push a `main` con el visto bueno de Mizar (6-oct-2026). Comprobado que
      `npx -y github:Mizar-Contasti/tree-flow-mcp` arranca la 1.2.0.

## Resultado

| | 1.1.0 | 1.2.0 |
|---|---|---|
| Catálogo + instrucciones, en cada llamada | 80 herr., ~14,650 tok | 36 herr. por defecto, ~7,100 tok |
| `export_tree` | 14,645,991 car. | 363 car. (la ruta del archivo) |
| `get_tree_data` | 426,573 car. | 41,347 car. |
| `list_training_history` | 304,110 | 1,075 |
| `list_fertilizers` | 295,001 | 2,438 |
| `list_change_history` | 179,737 | 2,587 |
| `list_branches` | 161,696 | 1,143 |
| `list_message_templates` | 108,381 | 8,863 |
| `list_intents` | 96,167 | 7,795 |
| `simulate_message` | 2,024 | 490 |
| Escrituras | el objeto completo | una línea, 90–400 car. |

Estimación de una sesión típica sobre el bot de referencia: explorar, crear dos
intenciones, armar un flujo de tres hojas, entrenar y probar tres mensajes.

- **1.1.0**: 16 llamadas (una por pieza, más consultas del entrenamiento); desde la
  segunda, cada una carga el catálogo y los ~122,000 tokens del árbol. Del orden de
  **2 millones** de tokens de entrada.
- **1.2.0**: 9 llamadas (lotes y entrenamiento que espera), cada una con ~7,100 de catálogo
  y ~11,800 del esquema. Del orden de **160,000**.

Es una cuenta gruesa: el caché del cliente abarata lo que se repite, y cada sesión es
distinta. Pero el orden de magnitud explica el reporte original.

## Medición con sesiones reales (6-oct-2026)

`scripts/sesion-real.mjs` le da una tarea a Claude (Sonnet 5.5, esfuerzo medio) con el MCP
conectado, por el CLI de Claude Code, y registra los tokens de cada llamada a la API. Misma
tarea, misma cuenta, las dos versiones; el bot de pruebas se devolvió a su estado inicial
entre corridas.

| Tarea | Versión | Llamadas | Tokens de entrada | Salida | Costo | Tiempo | ¿La resolvió? |
|---|---|---|---|---|---|---|---|
| Explorar CECYTECH (solo lectura) | 1.1.0 | 8 | 281,059 | 2,225 | $0.263 | 26 s | **No**: 2 de 3 preguntas |
| | 1.2.0 | 4 | 101,723 | 1,819 | $0.191 | 17 s | Sí |
| Construir y probar una opción | 1.1.0 | 10 | 494,392 | 5,040 | $0.359 | 41 s | Sí |
| | 1.2.0 | 7 | 154,268 | 2,575 | $0.142 | 28 s | Sí |

Lo que enseñaron:

- **Con 1.1.0 la exploración falla.** El cliente cortó `get_tree_data` (426,573 car.),
  `list_branches` y `list_message_templates` por exceder su tope de tamaño; el modelo simuló
  mensajes a ciegas, inventó una herramienta que no existe y no pudo describir las ramas.
- **Con 1.1.0 construir sólo sale bien leyendo todo**: el modelo leyó las ramas completas
  (41,604 car.) para reescribir la hoja de inicio con sus 23 rutas (4,177 car. de salida).
  No perdió datos, pero ese es el costo: 3.2× los tokens de entrada y 2× los de salida.
- **El texto cuesta el doble de lo estimado**: 1.6–1.8 caracteres por token en las
  respuestas (español, emojis, UUID) y ~2.2 en el catálogo, no 3.5. Las proporciones entre
  versiones se mantienen; las cifras absolutas de arriba se quedan cortas.
- **En 1.2.0, el costo fijo pesa la mitad**: cada llamada arranca con ~12,000 tokens
  (catálogo de 36 herramientas e instrucciones). En explorar fue el 47% de la entrada.
- **El otro gran peso es `get_tree_data`**: 23,605 tokens en CECYTECH, que se releen en cada
  llamada siguiente.
- **Toda sesión empieza con una llamada sólo para `list_trees`**, para traducir el nombre del
  bot a su ID: una vuelta completa (~14,000 tokens) que no aporta nada más.
- Con el CLI de Claude Code, una respuesta enorme se corta en vez de entrar a la conversación;
  en otros clientes puede entrar entera o reventar el contexto. Con 1.2.0 no pasa en ninguno.

Hallazgo del backend: `POST /api/backup/trees/{id}/snapshots/{snapshot_id}/restore` falla con
una API key (`'User' object has no attribute 'user_id'`), así que `treeflow_restore_snapshot`
no funciona para quien entra por el MCP.

## Fase 7 — Lo que mostraron las sesiones reales (1.3.0)

- [x] **El bot por nombre**: `tree_id` acepta el nombre (o un prefijo del ID). Quita la
      llamada de `list_trees` con la que empezaba toda sesión.
- [x] **IDs cortos**: cada UUID sale con 8 caracteres y se recuerda en el proceso; cuando el
      modelo lo devuelve, en un parámetro o dentro de un config, se expande. Un corto
      desconocido en un campo de ID es un error claro. Eran un tercio del esquema.
- [x] **`get_tree_data` por secciones** (`canvas`, `ramas`, `intenciones`, `entidades`,
      `plantillas`; por defecto las dos primeras de uso) y por `rama`. Lo no pedido se cuenta.
      Reemplaza a los cinco `list_*` del canvas y del NLU.
- [x] **Rutas sueltas**: `update_leaf` con `add_routes` / `remove_routes`, y `create_leaf`
      con `connect` para conectar las hojas nuevas desde una existente en la misma llamada.
- [x] **Entrenar y probar** en una llamada: `trigger_training` con `probar`.
- [x] `get_tree`/`update_tree` pasan a admin y las conversaciones reales a historial.

Medido con el mismo arnés, las mismas tareas y el bot de pruebas devuelto a su estado
inicial entre corridas:

| Tarea | 1.1.0 | 1.2.0 | 1.3.0 |
|---|---|---|---|
| Explorar CECYTECH | 281,059 tok · 8 llamadas · $0.263 · no la resolvía | 101,723 · 4 · $0.191 | **51,329 · 3 · $0.113** |
| Construir y probar | 494,392 tok · 10 llamadas · $0.359 | 154,268 · 7 · $0.142 | **58,096 · 4 · $0.064** |

La 1.3.0 respondió igual de completo al explorar y, al construir, creó, conectó, entrenó y
probó sin tocar lo que no debía (la hoja de inicio sólo ganó la ruta nueva). Usó IDs
cortos en todas las llamadas sin un solo error. El esquema de CECYTECH por defecto pasó de
23,605 a ~8,900 tokens.

Lo que queda por llamada es sobre todo el catálogo (~10,800 tokens con 27 herramientas):
con 3–4 llamadas por tarea, ya es la mitad de lo que se gasta.

## Estado

| Fase | Estado | Resultado |
|---|---|---|
| 0 | hecha | Línea base medida contra la API real; `npm test` y `npm run medir` |
| 1 | hecha | `get_tree_data` 426,573 → 41,347 car. (9.7%); `export_tree` 14.6 M → 339; ninguna otra lectura pasa de 9,400 |
| 2 | hecha | `scripts/e2e-dev.mjs` pasa contra dev: editar una clave conserva las demás en hojas, intenciones, entidades y canales |
| 3 | hecha | Escrituras de 350–850 a 90–230 car.; `simulate_message` 2,024 → 490; `list_trees` 3,691 → 444 |
| 4 | hecha | Un flujo de 3 hojas enlazadas en 1 llamada; entrenar en 1 llamada en vez de 1 + N consultas |
| 5 | hecha | Por llamada: ~14,650 → ~7,100 tokens (36 de 67 herramientas por defecto) |
| 6 | hecha | En `main` desde el 6-oct-2026; npx ya sirve la 1.2.0 |
| 7 | hecha, sin subir | 1.3.0: explorar −50% y construir −62% de tokens frente a 1.2.0, medido en sesiones reales |
