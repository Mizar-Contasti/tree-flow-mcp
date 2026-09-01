# 🌲 Treeflow MCP Server (`treeflow-mcp`)

El **Servidor MCP oficial de Treeflow** permite a **Claude Desktop**, **Claude Code**, **Cursor**, **Zed** y cualquier cliente compatible con el **Model Context Protocol (MCP)** conectarse directamente a tu plataforma Treeflow para:

* 🤖 **Crear, editar y listar Chatbots / Árboles**
* 🌿 **Diseñar el Canvas de Flujos:** Crear ramas (*Branches*) y nodos (*Leafs* de mensajes, inputs, condiciones, webhooks)
* 🧠 **Entrenar NLU:** Crear y actualizar intenciones, frases de entrenamiento y entidades (sinónimos y valores)
* 💬 **Plantillas de Respuestas:** Administrar mensajes y variaciones de texto
* ⚡ **Simulación & Diagnóstico:** Probar conversaciones y evaluar respuestas en tiempo real

---

## 🚀 Inicio Rápido con Claude Desktop

### 1. Obtén tu API Key de Treeflow
1. Abre tu panel de Treeflow.
2. Ve a **Cuentas** -> pestaña **Claves de API**.
3. Haz clic en **"Nueva Clave de API"**, asígnala a tu usuario y copia la clave generada (`tf_live_...`).

### 2. Configura Claude Desktop
Abre tu archivo de configuración de Claude Desktop:
* **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Agrega `treeflow` en `mcpServers`:

```json
{
  "mcpServers": {
    "treeflow": {
      "command": "npx",
      "args": ["-y", "treeflow-mcp"],
      "env": {
        "TREEFLOW_URL": "http://localhost:8000",
        "TREEFLOW_API_KEY": "tf_live_tu_clave_secreta_aqui",
        "TREEFLOW_WORKSPACE_ID": "tu-workspace-id"
      }
    }
  }
}
```

> **Si estás desarrollando en local:**
> Puedes ejecutar el servidor compilado directamente con `node`:
> ```json
> {
>   "mcpServers": {
>     "treeflow": {
>       "command": "node",
>       "args": ["c:/Users/GOTHICS/Documents/vibe/treeflow/mcp-server/dist/index.js"],
>       "env": {
>         "TREEFLOW_URL": "http://localhost:8000",
>         "TREEFLOW_API_KEY": "tf_live_tu_clave_secreta_aqui",
>         "TREEFLOW_WORKSPACE_ID": "botsmexico"
>       }
>     }
>   }
> }
> ```

---

## 🛠️ Catálogo de Herramientas (Tools) Disponibles

### Gestión de Bots (Árboles)
| Herramienta | Descripción |
| :--- | :--- |
| `treeflow_list_trees` | Lista todos los bots del workspace |
| `treeflow_get_tree` | Obtiene la configuración detallada de un bot |
| `treeflow_create_tree` | Crea un nuevo bot (nombre, rubro, idioma) |
| `treeflow_update_tree` | Actualiza configuraciones y modos del bot |
| `treeflow_delete_tree` | Elimina un bot permanentemente |

### Canvas & Flujos (Branches y Leafs)
| Herramienta | Descripción |
| :--- | :--- |
| `treeflow_list_branches` | Lista las ramas de un bot |
| `treeflow_create_branch` | Crea una nueva rama de flujo en el canvas |
| `treeflow_update_branch` | Modifica el nombre o descripción de una rama |
| `treeflow_delete_branch` | Elimina una rama |
| `treeflow_list_leafs` | Lista todos los nodos dentro de una rama |
| `treeflow_create_leaf` | Crea un nodo (`message`, `input`, `condition`, `action`, `webhook`) |
| `treeflow_update_leaf` | Modifica la configuración de un nodo |
| `treeflow_delete_leaf` | Elimina un nodo del canvas |

### NLU & Entrenamiento
| Herramienta | Descripción |
| :--- | :--- |
| `treeflow_list_intents` | Lista las intenciones y frases de entrenamiento |
| `treeflow_create_intent` | Crea una intención con frases de entrenamiento |
| `treeflow_update_intent` | Actualiza una intención existente |
| `treeflow_delete_intent` | Elimina una intención |
| `treeflow_list_entities` | Lista las entidades y sinónimos |
| `treeflow_create_entity` | Crea una entidad con sus valores y sinónimos |
| `treeflow_update_entity` | Actualiza valores y sinónimos |
| `treeflow_delete_entity` | Elimina una entidad |
| `treeflow_trigger_training` | Lanza el re-entrenamiento del modelo de Machine Learning |
| `treeflow_get_training_status` | Consulta el estado del entrenamiento |

### Plantillas y Simulación
| Herramienta | Descripción |
| :--- | :--- |
| `treeflow_list_message_templates` | Lista las plantillas de respuesta |
| `treeflow_create_message_template` | Crea una plantilla de respuesta con variaciones |
| `treeflow_update_message_template` | Modifica una plantilla |
| `treeflow_delete_message_template` | Elimina una plantilla |
| `treeflow_simulate_message` | Envía un mensaje de prueba para evaluar la detección del bot |
| `treeflow_list_conversations` | Lista las conversaciones recientes del bot |

---

## 💻 Desarrollo Local

```bash
cd mcp-server
npm install
npm run build
npm start
```

---

## 📄 Licencia
MIT
