# 🌲 Treeflow MCP Server

Conecta **Claude Desktop**, **Claude Code**, **Cursor** o cualquier cliente MCP directamente a tu plataforma **Treeflow** para administrar, diseñar, entrenar y diagnosticar chatbots inteligentes usando lenguaje natural.

---

## ⚡ Guía Rápida de Conexión (3 Pasos)

### Paso 1: Genera tu clave de API en Treeflow
1. Abre tu panel de **Treeflow** en el navegador.
2. Ve a **Cuentas** ➡️ Pestaña **Claves de API**.
3. Haz clic en **"Nueva Clave de API"**, asígnala a tu usuario y **copia la clave generada** (`tf_live_...`).

---

### Paso 2: Pega la configuración en Claude Desktop
Abre el archivo de configuración de Claude en tu computadora:

* 🪟 **Windows:** Presiona `Win + R`, pega `%APPDATA%\Claude\claude_desktop_config.json` y presiona Enter.
* 🍎 **Mac:** Abre `~/Library/Application Support/Claude/claude_desktop_config.json`

Pega el siguiente bloque dentro de `"mcpServers"` (reemplaza `TREEFLOW_API_KEY` con tu clave del Paso 1):

```json
{
  "mcpServers": {
    "treeflow": {
      "command": "npx",
      "args": ["-y", "github:Mizar-Contasti/tree-flow-mcp"],
      "env": {
        "TREEFLOW_URL": "http://localhost:8000",
        "TREEFLOW_API_KEY": "tf_live_tu_clave_aqui",
        "TREEFLOW_WORKSPACE_ID": "botsmexico"
      }
    }
  }
}
```

> **Nota:** Si tu Treeflow está en un servidor o dominio propio (ej. `https://api.midominio.com`), cambia `"TREEFLOW_URL"` por la URL de tu instancia.

| Variable | Qué es |
|---|---|
| `TREEFLOW_URL` | URL base de tu API de Treeflow (sin barra final). Default: `http://localhost:8000` |
| `TREEFLOW_API_KEY` | **Obligatoria.** La clave `tf_live_...` del Paso 1. El backend deriva de ella tu workspace y tu rol |
| `TREEFLOW_WORKSPACE_ID` | **Obligatoria.** El slug de tu workspace (el mismo con el que inicias sesión). Debe ser el dueño de la clave |
| `TREEFLOW_TOOLSETS` | Opcional. Qué grupos de herramientas cargar (ver abajo). Vacía: la base, capturas y respaldos |
| `TREEFLOW_EXPORT_DIR` | Opcional. Dónde guarda `treeflow_export_tree` los JSON. Default: `~/treeflow-exports` |

---

### Paso 3: Reinicia Claude Desktop y ¡listo!
Cierra y vuelve a abrir Claude Desktop. Verás el icono del martillo 🛠️ indicando que Treeflow está conectado.

---

## 🪶 Pensado para gastar pocos tokens

Cada vez que el modelo llama a una herramienta, el cliente le vuelve a mandar **todo**: el
catálogo de herramientas, las instrucciones y la conversación entera con cada resultado
anterior. Por eso este MCP:

- **Resume primero y da el detalle aparte.** `treeflow_get_tree_data` devuelve el bot en
  texto, por secciones (una línea por hoja, intención o entidad), y `treeflow_get_detail` da
  el detalle completo de una sola pieza.
- **IDs cortos y bots por nombre.** Los IDs salen con 8 caracteres y se aceptan así de
  vuelta; `tree_id` acepta también el nombre del bot.
- **Edita mandando sólo lo que cambia**, sin obligar a leer antes: el `config` de una hoja
  se combina por claves, y frases, valores y rutas se añaden o quitan con `add_` / `remove_`.
- **Crea en lote**: varias intenciones, entidades u hojas enlazadas en una llamada, y las
  hojas nuevas se conectan desde una existente en la misma llamada.
- **Responde corto**: las escrituras devuelven una línea con el ID; el entrenamiento espera,
  y con `probar` entrena y prueba en una llamada.
- **Carga sólo los grupos de herramientas que hacen falta.**

Medido con sesiones reales de Claude (Sonnet 5.5) sobre las mismas tareas
(`scripts/sesion-real.mjs`; detalle en [`docs/plan-eficiencia-tokens.md`](docs/plan-eficiencia-tokens.md)):

| Tarea | 1.1.0 | 1.2.0 | 1.3.0 |
|---|---|---|---|
| Explorar un bot de 148 hojas | 281,059 tokens · 8 llamadas · **no la resolvía** | 101,723 · 4 | **51,329 · 3** |
| Construir y probar una opción | 494,392 tokens · 10 llamadas | 154,268 · 7 | **58,096 · 4** |

### Grupos de herramientas

| Grupo | Por defecto | Qué trae |
|---|---|---|
| **base** | siempre | bots, ramas, hojas, intenciones, entidades, plantillas, detalle, borrar, guía, entrenar y simular |
| **capturas** | sí | las preguntas reutilizables del slot filling |
| **respaldos** | sí | snapshots, restaurar, exportar e importar |
| apis | no | las APIs y scripts que el bot ejecuta, sus pruebas y sus logs |
| pruebas | no | suites de prueba y sus ejecuciones |
| atencion | no | transferencia a humano y mesa de ayuda (sólo lectura) |
| historial | no | conversaciones reales, historial de cambios y de entrenamientos, y analíticas |
| admin | no | configuración del bot (umbrales, NLP), canales, voz, usuarios y credenciales |

- `"TREEFLOW_TOOLSETS": "apis,pruebas"` carga la base más esos grupos (sustituye a los de
  por defecto: si los quieres también, nómbralos).
- `"TREEFLOW_TOOLSETS": "todo"` carga las 62 herramientas.
- A mitad de una conversación, el modelo puede activar un grupo con
  `treeflow_enable_tools`. El servidor avisa al cliente (`tools/list_changed`); si tu
  cliente no recarga la lista, añade el grupo a la variable y reinícialo.

---

## 🛠️ Herramientas

### Base
* `treeflow_list_trees` / `treeflow_create_tree`: los bots del workspace. En las demás herramientas, `tree_id` acepta el nombre del bot.
* `treeflow_get_tree_data(secciones, rama)`: el bot por secciones (`canvas`, `ramas`, `intenciones`, `entidades`, `plantillas`); por defecto canvas e intenciones. `rama` limita el canvas a una.
* `treeflow_get_detail(tipo, ref)`: el detalle de una hoja, intención, entidad, plantilla, API o script, por ID o nombre.
* `treeflow_create_branch` / `treeflow_update_branch`: las ramas (flujos) del canvas. Una rama nueva trae su hoja Start.
* `treeflow_create_leaf` / `treeflow_update_leaf`: las hojas. `create_leaf` recibe una lista, las enlaza entre sí con `"ref:<ref>"` y las conecta desde una hoja existente con `connect`; `update_leaf` combina el config (una clave en `null` se borra) y acepta `add_routes` / `remove_routes`.
* `treeflow_create_intent` / `treeflow_update_intent`: intenciones NLU. `create_intent` recibe una lista; `update_intent` acepta `add_patterns` / `remove_patterns`. Cada parámetro es `{ parameterName, entity, required, prompt }`, con la entidad por nombre (`color`, `sys.number`): el MCP la resuelve a su ID.
* `treeflow_create_entity` / `treeflow_update_entity`: entidades. Igual, con `add_values` / `remove_values`.
* `treeflow_save_message_template`: plantillas de mensaje: un texto, o bloques enriquecidos (botones, tarjetas…) dentro de un `payload`.
* `treeflow_delete(tipo, ref)`: borra una rama, hoja, intención, entidad, plantilla, API, script, captura, transferencia o suite.
* `treeflow_trigger_training` / `treeflow_get_training_status`: reentrenar (espera a que termine; con `probar`, prueba mensajes al terminar) y consultar el estado.
* `treeflow_simulate_message`: probar el bot, siguiendo una conversación con su `session_id`.
* `treeflow_guide(tema)`: referencia de plantillas, bloques enriquecidos, APIs, scripts, hojas, capturas y suites.

### Capturas
* `treeflow_list_captures` / `treeflow_get_capture` / `treeflow_save_capture`.

### Respaldos
* `treeflow_list_backups` / `treeflow_create_backup`: snapshots del bot.
* `treeflow_restore_snapshot`: restaura un snapshot **sobrescribiendo el estado actual**; exige `confirm: true` y crea antes un snapshot de seguridad.
* `treeflow_export_tree`: guarda el bot completo en un JSON local y devuelve la ruta. `treeflow_import_tree`: crea un bot **nuevo** desde ese archivo.

### apis
* `treeflow_list_fertilizers`: el webhook principal, las APIs y los scripts.
* `treeflow_save_tool` / `treeflow_test_tool`: crear o modificar una API y probarla con el mismo ejecutor de la conversación.
* `treeflow_save_script` / `treeflow_test_script`: scripts Python o Node.js.
* `treeflow_list_tool_logs`: historial de ejecuciones.

### pruebas
* `treeflow_list_test_suites` / `treeflow_get_test_suite` / `treeflow_save_test_suite`, `treeflow_import_test_suite_csv` / `treeflow_export_test_suite_csv`.
* `treeflow_run_test_suite`: corre la suite y devuelve los totales y sólo lo que falló.
* `treeflow_list_test_runs` / `treeflow_get_test_run` / `treeflow_compare_test_runs`.

### atencion
* `treeflow_list_transfers` / `treeflow_save_transfer` / `treeflow_test_transfer`: transferencia a un asesor.
* `treeflow_get_live_chat_queue` / `treeflow_get_live_chat_history` / `treeflow_get_live_chat_session`: la mesa de ayuda, sólo lectura.

### historial
* `treeflow_list_conversations` / `treeflow_get_conversation`: las conversaciones reales del bot.
* `treeflow_list_change_history` (con `change_id`, el antes/después de un cambio), `treeflow_list_training_history`, `treeflow_get_conversation_analytics`.

### admin
* `treeflow_get_tree` / `treeflow_update_tree`: la configuración del bot (umbrales, modo NLP, orden de detección).
* `treeflow_list_integrations` / `treeflow_configure_integration`: canales. El token de Telegram se conecta desde el panel.
* `treeflow_get_voice_config` / `treeflow_update_voice_config`.
* `treeflow_list_users` / `treeflow_create_user` / `treeflow_update_user` / `treeflow_list_credentials`.

> El borrado de bots y de usuarios **no** se expone: son operaciones irreversibles que se hacen desde el panel de Treeflow. Tampoco se puede tomar, responder ni cerrar una atención de la mesa de ayuda.

---

## 🔁 Cambios de la 1.3.0 que rompen con la 1.2.0

| Antes | Ahora |
|---|---|
| `list_branches`, `list_leafs`, `list_intents`, `list_entities`, `list_message_templates` | `get_tree_data` con `secciones` (y `rama`) |
| los IDs salían completos (36 caracteres) | salen con 8; los completos se siguen aceptando |
| `get_tree` / `update_tree` en la base | en el grupo **admin** |
| `list_conversations` / `get_conversation` en la base | en el grupo **historial** |

## 🔁 Cambios de la 1.2.0 que rompen con la 1.1.0

| Antes | Ahora |
|---|---|
| `create_tool` + `update_tool` (y lo mismo con script, capture, transfer, message_template, test_suite) | `save_tool` y compañía: sin ID crean, con ID modifican |
| `delete_branch`, `delete_leaf`, `delete_intent`… (10 herramientas) | `treeflow_delete(tree_id, tipo, ref)` |
| `create_leaf` con una hoja | `create_leaf` con `leaves: [...]` |
| `create_intent` / `create_entity` con una pieza | con `intents: [...]` / `entities: [...]` |
| `update_leaf` sustituía el `config` entero | lo combina con el guardado; necesita `branch_id` o `tree_id` (o `replace_config: true`) |
| `get_tree_data` y los `list_*` devolvían JSON completo | resúmenes en texto; el detalle con `get_detail` |
| `export_tree` devolvía el JSON en la conversación | lo guarda en un archivo; `import_tree` acepta `archivo` |
| `trigger_training` volvía al instante | espera a que termine, y fuerza por defecto |
| las 80 herramientas siempre cargadas | grupos: ver `TREEFLOW_TOOLSETS` |

---

## 🧪 Desarrollo

```sh
npm install
npm test                 # compila y corre las pruebas (sin red)
npm run medir            # cuánto pesa el catálogo; con --arbol "Nombre" mide también las lecturas
node scripts/e2e-dev.mjs # de punta a punta contra un backend real, sobre un bot de pruebas propio
node scripts/sesion-real.mjs --tarea explorar --etiqueta prueba   # una sesión real de Claude, medida
```

`scripts/sesion-real.mjs` le da una tarea a Claude con el MCP conectado, por el CLI de Claude
Code (`claude auth login` antes), y registra los tokens de cada llamada, las herramientas
usadas y lo que devolvió cada una. Con `--mcp <carpeta>` mide otra versión y con
`--comparar a.json b.json` pone dos corridas lado a lado. Gasta uso real de la cuenta;
`--tope` le pone un máximo en dólares.

`npm run medir -- --arbol` y `scripts/e2e-dev.mjs` leen la conexión de las variables de
entorno o de un `.env` en la raíz del repo (está en `.gitignore`). El de punta a punta crea
o reutiliza el bot "MCP pruebas (Claude)" y no toca ningún otro.

**El `dist/` va en el repo**: `npx github:…` ejecuta lo que hay commiteado, sin compilar.
Después de cambiar `src/`, corre `npm run build` y commitea `dist/` junto con el cambio.

### Validación de rutas

Cada llamada del cliente HTTP se valida contra el `openapi.json` real del backend, para que
ninguna herramienta apunte a una ruta inexistente:

```sh
npm run build
TREEFLOW_URL=https://api.tu-treeflow.com npm run validate:routes
```

El script (`scripts/validate-routes.mjs`) extrae todas las llamadas de
`src/client/treeflowClient.ts`, las normaliza y las contrasta con las rutas y métodos que
expone el backend. Sale con código `1` si alguna ruta no existe o si el método no coincide.
También acepta un spec local:

```sh
node scripts/validate-routes.mjs --spec ./openapi.json
```

Córrelo antes de cada release y después de tocar el backend: es la red de seguridad contra
el desfase entre el MCP y la API.
