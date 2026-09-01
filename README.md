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

Las tres variables son **obligatorias**:

| Variable | Qué es |
|---|---|
| `TREEFLOW_URL` | URL base de tu API de Treeflow (sin barra final). Default: `http://localhost:8000` |
| `TREEFLOW_API_KEY` | La clave `tf_live_...` del Paso 1. El backend deriva de ella tu workspace y tu rol |
| `TREEFLOW_WORKSPACE_ID` | El slug de tu workspace (el mismo con el que inicias sesión). Debe ser el dueño de la clave |

---

### Paso 3: Reinicia Claude Desktop y ¡listo!
Cierra y vuelve a abrir Claude Desktop. Verás el icono del martillo 🛠️ indicando que Treeflow está conectado.

---

## 🛠️ Catálogo Completo de Herramientas (45 Tools)

A continuación se detalla todo lo que Claude puede realizar en Treeflow agrupado por módulo:

### 1. 🤖 Gestión de Bots (Árboles)
* `treeflow_list_trees`: Lista todos los bots del workspace.
* `treeflow_get_tree`: Obtiene configuración detallada de un bot específico.
* `treeflow_get_tree_data`: Obtiene la estructura COMPLETA del bot en un solo llamado (ramas, nodos, intenciones, entidades y plantillas).
* `treeflow_create_tree`: Crea un nuevo bot con nombre, propósito (hotel, restaurante, clínica, etc.) e idioma principal.
* `treeflow_update_tree`: Modifica parámetros avanzados de NLP, umbrales de confianza (ML / difuso), análisis de sentimiento y modos de operación.

> El borrado de bots y de usuarios **no** se expone como herramienta: son operaciones destructivas e irreversibles que deben hacerse desde el panel de Treeflow.

### 2. 🌿 Canvas & Flujos Visuales (Branches & Leafs)
* `treeflow_list_branches`: Lista todas las ramas de conversación del canvas.
* `treeflow_create_branch`: Crea una nueva rama y su nodo de inicio.
* `treeflow_update_branch`: Modifica el nombre o descripción de una rama (sólo requiere `branch_id`).
* `treeflow_delete_branch`: Elimina una rama y todos sus nodos (sólo requiere `branch_id`).
* `treeflow_list_leafs`: Lista todos los nodos de una rama seleccionada.
* `treeflow_create_leaf`: Crea un nodo en el lienzo (`message`, `trigger_context`, `intent`, `action`, `condition`, `webhook`) con su configuración y posición `position_x` / `position_y`.
* `treeflow_update_leaf`: Modifica el contenido, posición o comportamiento de un nodo.
* `treeflow_delete_leaf`: Elimina un nodo del canvas.

### 3. 🧠 NLU: Intenciones & Extracción de Parámetros (Slots)
* `treeflow_list_intents`: Lista las intenciones NLU con sus frases y slots configurados.
* `treeflow_create_intent`: Crea una intención con frases de entrenamiento y parámetros requeridos (`entity_name`, `required`, `prompt`).
* `treeflow_update_intent`: Actualiza frases de entrenamiento, nombre o parámetros de una intención.
* `treeflow_delete_intent`: Elimina una intención.

### 4. 🏷️ NLU: Entidades & Sinónimos
* `treeflow_list_entities`: Lista todas las entidades del bot.
* `treeflow_create_entity`: Crea una entidad (`simple` con sinónimos, `composite` o `regex`).
* `treeflow_update_entity`: Modifica valores canónicos, sinónimos o patrones regex.
* `treeflow_delete_entity`: Elimina una entidad.

### 5. 💬 Respuestas & Plantillas Enriquecidas
* `treeflow_list_message_templates`: Lista las plantillas de mensaje del bot.
* `treeflow_create_message_template`: Crea plantillas con texto de respaldo y bloques enriquecidos (tarjetas, botones, carruseles, audios).
* `treeflow_update_message_template`: Actualiza una plantilla existente.
* `treeflow_delete_message_template`: Elimina una plantilla.

### 6. 🧪 Fertilizantes & Knowledge Base (RAG)
* `treeflow_list_fertilizers`: Lista herramientas adicionales, scripts y Knowledge Base configurados.
* `treeflow_create_fertilizer`: Agrega una herramienta externa, automatización o base de conocimiento.
* `treeflow_delete_fertilizer`: Elimina una herramienta o fertilizante.

### 7. 🔌 Canales & Integraciones (Injertos)
* `treeflow_list_integrations`: Consulta el estado de los canales (WhatsApp, Webchat, Telegram, Webhooks).
* `treeflow_configure_integration`: Activa, desactiva o ajusta credenciales de canales de mensajería.

### 8. 🎙️ Configuración de Voz (STT / TTS)
* `treeflow_get_voice_config`: Consulta el estado de Speech-To-Text (Whisper) y Text-To-Speech (Piper), voz y velocidad.
* `treeflow_update_voice_config`: Configura modelos de audio, idioma, voces y velocidad de reproducción.

### 9. 📈 Entrenamiento & Historial de Machine Learning
* `treeflow_trigger_training`: Dispara el re-entrenamiento del modelo NLU de Machine Learning.
* `treeflow_get_training_status`: Consulta el estado en vivo del entrenamiento.
* `treeflow_list_training_history`: Historial completo de entrenamientos con métricas y logs de error.

### 10. 💬 Simulación, Conversaciones & Diagnóstico
* `treeflow_simulate_message`: Envía un mensaje de prueba al bot y recibe la intención detectada, score, entidades extraídas, respuesta y transición de nodos.
* `treeflow_list_conversations`: Lista las conversaciones recientes registradas en el bot.
* `treeflow_get_conversation`: Obtiene todos los turnos y mensajes detallados de una sesión.

### 11. 🛡️ Auditoría & Respaldos (Backups)
* `treeflow_list_change_history`: Historial de auditoría para saber qué usuario modificó qué elemento y cuándo.
* `treeflow_list_backups`: Lista los snapshots de seguridad del bot.
* `treeflow_create_backup`: Crea un snapshot completo antes de realizar cambios importantes.

### 12. 👥 Usuarios & Credenciales del Workspace
* `treeflow_list_users`: Lista los miembros y roles del workspace.
* `treeflow_create_user`: Invita un nuevo usuario al workspace.
* `treeflow_update_user`: Modifica rol o estado de un usuario.
* `treeflow_list_credentials`: Verifica proveedores de IA activos (OpenAI, Gemini, Groq, Twilio, Meta).

---

## 💬 Ejemplos de lo que puedes pedirle a Claude

* *"Hazme un resumen completo del bot 'Soporte Comercial' usando `treeflow_get_tree_data`."*
* *"Crea una intención 'consultar_disponibilidad' con 6 frases de entrenamiento y un parámetro 'fecha' de tipo @sys.date."*
* *"Crea una rama llamada 'Flujo_Reservas', agrégale un nodo de mensaje y conéctalo al canvas."*
* *"Activa la integración de WhatsApp y configura la voz TTS en español con velocidad 1.1."*
* *"Simula una conversación enviando 'Hola quiero cancelar mi pedido' y dime qué intención detectó el bot."*
* *"Crea un respaldo de seguridad del bot antes de que empecemos a modificar los flujos."*

---

## 🧪 Desarrollo: validación de rutas

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
