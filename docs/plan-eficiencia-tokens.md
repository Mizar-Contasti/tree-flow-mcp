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
el MCP queda sin entidad. Pendiente de corregir aparte.

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
- [ ] Grupos de herramientas (`TREEFLOW_TOOLSETS`). **Pendiente de decidir**: qué grupo
      viene activo por defecto.
- [ ] Juntar `create_X`/`update_X` donde repiten esquema.
- [ ] La documentación larga pasa a una herramienta de ayuda que se consulta cuando hace
      falta.

Listo cuando: el catálogo por defecto ronda los 5,000 tokens.

### Fase 6 — Cierre
- [ ] README con los cambios de nombres y de comportamiento.
- [ ] Versión 1.2.0.
- [ ] Medición final contra la línea base y prueba completa en dev.
- [ ] Push a `main`, **sólo con el visto bueno de Mizar**: cambia el MCP de dev y de prod
      en el siguiente reinicio de Claude Desktop.

## Estado

| Fase | Estado | Resultado |
|---|---|---|
| 0 | hecha | Línea base medida contra la API real; `npm test` y `npm run medir` |
| 1 | hecha | `get_tree_data` 426,573 → 41,347 car. (9.7%); `export_tree` 14.6 M → 339; ninguna otra lectura pasa de 9,400 |
| 2 | hecha | `scripts/e2e-dev.mjs` pasa contra dev: editar una clave conserva las demás en hojas, intenciones, entidades y canales |
| 3 | hecha | Escrituras de 350–850 a 90–230 car.; `simulate_message` 2,024 → 490; `list_trees` 3,691 → 444 |
| 4 | hecha | Un flujo de 3 hojas enlazadas en 1 llamada; entrenar en 1 llamada en vez de 1 + N consultas |
| 5 | pendiente | |
| 6 | pendiente | |
