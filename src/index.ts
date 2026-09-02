#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { TreeflowClient } from './client/treeflowClient.js';
import { registerTreeTools } from './tools/trees.js';
import { registerBranchTools } from './tools/branches.js';
import { registerLeafTools } from './tools/leafs.js';
import { registerIntentTools } from './tools/intents.js';
import { registerEntityTools } from './tools/entities.js';
import { registerTemplateTools } from './tools/templates.js';
import { registerFertilizerTools } from './tools/fertilizers.js';
import { registerIntegrationTools } from './tools/integrations.js';
import { registerVoiceTools } from './tools/voice.js';
import { registerTrainingTools } from './tools/training.js';
import { registerDiagnosticTools } from './tools/diagnostics.js';
import { registerHistoryTools } from './tools/history.js';
import { registerUserTools } from './tools/users.js';

// Reglas que ninguna descripción de herramienta puede transmitir por sí sola:
// aplican al servicio completo y evitan los errores más caros (sobre todo
// olvidar el reentrenamiento, que deja los cambios sin efecto en silencio).
const INSTRUCTIONS = `Treeflow es una plataforma de chatbots NLU. Un "árbol" (tree) es un bot.

DOS SUBSISTEMAS DISTINTOS, no los confundas:
1. Canvas visual: Ramas (branches) son contenedores de flujo; Hojas (leafs) son
   los nodos dentro de una rama (message, intent, trigger_context, condition...).
   Al crear una rama se genera sola una hoja "Start".
2. NLU: Intenciones (intents) tienen frases de entrenamiento; Entidades (entities)
   tienen valores y sinónimos. Son los datos con los que se entrena el modelo.
Ramas/Hojas NO son sinónimo de Intenciones/Entidades: conviven pero sirven a cosas
distintas.

REENTRENAMIENTO OBLIGATORIO: después de crear, modificar o borrar intenciones o
entidades, llama a treeflow_trigger_training. Si no lo haces, el motor NLU sigue
usando el modelo viejo y tus cambios no surten efecto, sin aviso ni error.
Confirma con treeflow_get_training_status: can_use debe quedar en true.

EXPLORAR: usa treeflow_get_tree_data para obtener la estructura completa de un bot
(ramas, hojas, intenciones, entidades y plantillas) en una sola llamada, en vez de
encadenar varios list.

PATRONES: dentro de las frases de una intención, las entidades se referencian con
arroba, por ejemplo "quiero una @tipo_habitacion".

ACTUALIZACIONES: en update sólo hace falta mandar el campo que cambia; el resto se
conserva.

WORKSPACE: sale del API Key. No le pidas al usuario un workspace ni un ID de
workspace.

ANTES DE CAMBIOS GRANDES: treeflow_create_backup deja un snapshot restaurable.

BORRADOS: eliminar bots o usuarios no está disponible a propósito, por ser
irreversible. Si el usuario lo pide, dile que lo haga desde el panel de Treeflow.`;

async function main() {
  const client = new TreeflowClient();

  const server = new Server(
    {
      name: 'treeflow-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
      instructions: INSTRUCTIONS,
    }
  );

  // Recolectar todas las herramientas disponibles (Catálogo completo de Treeflow)
  const allTools = [
    ...registerTreeTools(client),
    ...registerBranchTools(client),
    ...registerLeafTools(client),
    ...registerIntentTools(client),
    ...registerEntityTools(client),
    ...registerTemplateTools(client),
    ...registerFertilizerTools(client),
    ...registerIntegrationTools(client),
    ...registerVoiceTools(client),
    ...registerTrainingTools(client),
    ...registerDiagnosticTools(client),
    ...registerHistoryTools(client),
    ...registerUserTools(client),
  ];

  const toolsMap = new Map<string, (args: any) => Promise<any>>();
  const toolsList = allTools.map((t) => {
    toolsMap.set(t.name, t.handler);
    return {
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    };
  });

  // Handler para listar herramientas
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: toolsList,
    };
  });

  // Handler para ejecutar herramientas
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const handler = toolsMap.get(name);

    if (!handler) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Herramienta desconocida "${name}"`,
          },
        ],
        isError: true,
      };
    }

    try {
      return await handler(args || {});
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || 'Error desconocido';
      return {
        content: [
          {
            type: 'text',
            text: `Error ejecutando ${name}: ${typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`🚀 Treeflow MCP Server running (${toolsList.length} tools registered)`);
}

main().catch((err) => {
  console.error('Fatal error running Treeflow MCP Server:', err);
  process.exit(1);
});
