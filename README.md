# 🌲 Treeflow MCP Server

Conecta **Claude Desktop**, **Claude Code** o **Cursor** directamente a tu plataforma de **Treeflow** para crear, modificar, diseñar y entrenar chatbots en lenguaje natural desde el chat de Claude.

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

> **Nota:** Si tu Treeflow está en un servidor o dominio propio (ej. `https://app.midominio.com`), cambia `"TREEFLOW_URL"` por la URL de tu instancia.

---

### Paso 3: Reinicia Claude Desktop y ¡listo!
Cierra y vuelve a abrir Claude Desktop. Verás el icono del martillo 🛠️ indicando que Treeflow está conectado.

---

## 💬 Ejemplos de lo que puedes pedirle a Claude

* *"Lista los bots disponibles en mi workspace de Treeflow."*
* *"Crea un nuevo bot para un restaurante italiano con propósito 'restaurante' en idioma español."*
* *"Agrega una intención llamada 'reservar_mesa' con 5 frases de entrenamiento y lánzale un entrenamiento."*
* *"En el bot de Ventas, crea una rama en el canvas llamada 'Bienvenida' y añade un nodo de mensaje de saludo."*
* *"Simula un mensaje de prueba que diga '¿Tienen mesas disponibles para hoy?' y dime qué intención detectó."*

---

## 🛠️ ¿Qué puede hacer Claude con este servidor MCP?

| Módulo | Acciones que Claude puede realizar |
| :--- | :--- |
| **🤖 Bots (Árboles)** | Listar, crear, inspeccionar, actualizar y eliminar bots. |
| **🌿 Canvas de Flujos** | Crear ramas (*Branches*), agregar nodos (*Leafs* de mensajes, inputs, condiciones, webhooks) y organizar el lienzo. |
| **🧠 NLU & Entrenamiento** | Crear intenciones con frases de entrenamiento, definir entidades con sinónimos y disparar entrenamientos del modelo. |
| **💬 Respuestas** | Crear y editar plantillas de mensajes y respuestas dinámicas. |
| **⚡ Diagnóstico & Pruebas** | Simular conversaciones en tiempo real y ver resultados de detección. |
