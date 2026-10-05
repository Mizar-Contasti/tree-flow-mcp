#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { TreeflowClient } from './client/treeflowClient.js';
import { buildTools, INSTRUCTIONS } from './catalog.js';
async function main() {
    const client = new TreeflowClient();
    const server = new Server({
        name: 'treeflow-mcp',
        version: '1.1.0',
    }, {
        capabilities: {
            tools: {},
        },
        instructions: INSTRUCTIONS,
    });
    // Recolectar todas las herramientas disponibles (Catálogo completo de Treeflow)
    const allTools = buildTools(client);
    const toolsMap = new Map();
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
        }
        catch (error) {
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
//# sourceMappingURL=index.js.map