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

- **Resume primero y da el detalle aparte.** `treeflow_get_tree_data` devuelve el esquema
  del bot en texto (una línea por hoja, intención o entidad, con su ID) y
  `treeflow_get_detail` da el detalle completo de una sola pieza.
- **Edita mandando sólo lo que cambia**, sin obligar a leer antes: el `config` de una hoja
  se combina por claves, y las frases y valores se añaden o quitan con `add_` / `remove_`.
- **Crea en lote**: varias intenciones, entidades u hojas enlazadas en una llamada.
- **Responde corto**: las escrituras devuelven una línea con el ID; el entrenamiento espera
  y devuelve el resultado final.
- **Carga sólo los grupos de herramientas que hacen falta.**

Medido sobre un bot de 148 hojas y 101 intenciones (detalle en
[`docs/plan-eficiencia-tokens.md`](docs/plan-eficiencia-tokens.md)):

| | 1.1.0 | 1.2.0 |
|---|---|---|
| Catálogo e instrucciones, en cada llamada | ~14,650 tokens | ~7,100 tokens |
| `treeflow_get_tree_data` | 426,573 caracteres | 41,347 caracteres |
| `treeflow_export_tree` | 14.6 M caracteres en la conversación | una ruta a un archivo |
| `treeflow_simulate_message` | 2,024 caracteres | 490 caracteres |

### Grupos de herramientas

| Grupo | Por defecto | Qué trae |
|---|---|---|
| **base** | siempre | bots, ramas, hojas, intenciones, entidades, plantillas, detalle, borrar, guía, entrenar, simular y conversaciones |
| **capturas** | sí | las preguntas reutilizables del slot filling |
| **respaldos** | sí | snapshots, restaurar, exportar e importar |
| apis | no | las APIs y scripts que el bot ejecuta, sus pruebas y sus logs |
| pruebas | no | suites de prueba y sus ejecuciones |
| atencion | no | transferencia a humano y mesa de ayuda (sólo lectura) |
| historial | no | historial de cambios y de entrenamientos, y analíticas |
| admin | no | canales, voz, usuarios y credenciales |

- `"TREEFLOW_TOOLSETS": "apis,pruebas"` carga la base más esos grupos (sustituye a los de
  por defecto: si los quieres también, nómbralos).
- `"TREEFLOW_TOOLSETS": "todo"` carga las 67 herramientas.
- A mitad de una conversación, el modelo puede activar un grupo con
  `treeflow_enable_tools`. El servidor avisa al cliente (`tools/list_changed`); si tu
  cliente no recarga la lista, añade el grupo a la variable y reinícialo.

---

## 🛠️ Herramientas

### Base
* `treeflow_list_trees` / `treeflow_get_tree` / `treeflow_create_tree` / `treeflow_update_tree`: los bots del workspace.
* `treeflow_get_tree_data`: el esquema de todo el bot en una llamada.
* `treeflow_get_detail(tipo, ref)`: el detalle de una hoja, intención, entidad, plantilla, API o script, por ID o nombre.
* `treeflow_list_branches` / `treeflow_create_branch` / `treeflow_update_branch`: las ramas (flujos) del canvas. Una rama nueva trae su hoja Start.
* `treeflow_list_leafs` / `treeflow_create_leaf` / `treeflow_update_leaf`: las hojas. `create_leaf` recibe una lista y las enlaza entre sí con `"ref:<ref>"`; `update_leaf` combina el config (una clave en `null` se borra).
* `treeflow_list_intents` / `treeflow_create_intent` / `treeflow_update_intent`: intenciones NLU. `create_intent` recibe una lista; `update_intent` acepta `add_patterns` / `remove_patterns`.
* `treeflow_list_entities` / `treeflow_create_entity` / `treeflow_update_entity`: entidades. Igual, con `add_values` / `remove_values`.
* `treeflow_list_message_templates` / `treeflow_save_message_template`: plantillas de mensaje.
* `treeflow_delete(tipo, ref)`: borra una rama, hoja, intención, entidad, plantilla, API, script, captura, transferencia o suite.
* `treeflow_trigger_training` / `treeflow_get_training_status`: reentrenar (espera a que termine) y consultar el estado.
* `treeflow_simulate_message` / `treeflow_list_conversations` / `treeflow_get_conversation`: probar el bot y leer conversaciones.
* `treeflow_guide(tema)`: referencia de plantillas, APIs, scripts, hojas, capturas y suites.

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
* `treeflow_list_change_history` (con `change_id`, el antes/después de un cambio), `treeflow_list_training_history`, `treeflow_get_conversation_analytics`.

### admin
* `treeflow_list_integrations` / `treeflow_configure_integration`: canales. El token de Telegram se conecta desde el panel.
* `treeflow_get_voice_config` / `treeflow_update_voice_config`.
* `treeflow_list_users` / `treeflow_create_user` / `treeflow_update_user` / `treeflow_list_credentials`.

> El borrado de bots y de usuarios **no** se expone: son operaciones irreversibles que se hacen desde el panel de Treeflow. Tampoco se puede tomar, responder ni cerrar una atención de la mesa de ayuda.

---

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
```

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
