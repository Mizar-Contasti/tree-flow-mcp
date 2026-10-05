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
- [ ] `update_leaf` combina el `config` nuevo con el guardado: sólo cambian las claves
      que se mandan, `null` borra una clave y `replace_config: true` sustituye todo.
- [ ] Revisar las demás actualizaciones (plantillas, árbol, voz, integraciones, suites)
      y dejar dicho en cada descripción qué listas se sustituyen completas.
- [ ] Secretos en la URL de una API (`?key=…`, `token=…`): hoy salen enteros al modelo,
      porque `maskSecrets` sólo mira campos con nombre de secreto. Enmascararlos al leer
      **y** restaurarlos al guardar, para que un `update_tool` con la URL enmascarada no
      escriba `***` encima de la clave real.
- [ ] Corregir la regla de las instrucciones para que diga la verdad.

Listo cuando: en dev, cambiar sólo el `messageText` de una hoja conserva sus
`intents`, su `nextLeafId` y sus `customResponses`.

### Fase 3 — Respuestas cortas
- [ ] Todas las respuestas en JSON compacto, por una sola función.
- [ ] Las escrituras devuelven un acuse corto (ID, nombre y lo imprescindible para el
      siguiente paso; por ejemplo, la hoja Start de una rama nueva).
- [ ] Topes por defecto en conversaciones y mesa de ayuda.
- [ ] Revisar el tamaño de `simulate_message`, `get_conversation` y `run_test_suite`.

Listo cuando: ninguna escritura devuelve el objeto completo y ningún listado es ilimitado.

### Fase 4 — Menos vueltas
- [ ] `trigger_training` espera a que el entrenamiento termine y devuelve el estado final.
- [ ] Crear varias intenciones o entidades en una llamada.
- [ ] Crear varias hojas de una rama en una llamada, enlazadas entre sí.

Listo cuando: un flujo nuevo de varias hojas se arma en una o dos llamadas.

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
| 2 | pendiente | |
| 3 | pendiente | |
| 4 | pendiente | |
| 5 | pendiente | |
| 6 | pendiente | |
