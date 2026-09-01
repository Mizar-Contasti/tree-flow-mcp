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
