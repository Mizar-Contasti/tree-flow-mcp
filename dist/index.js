#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { createRequire } from 'node:module';
import { TreeflowClient } from './client/treeflowClient.js';
import { TOOLSETS, buildInstructions, buildTools, enableToolsTool, parseToolsets, toolsetOf } from './catalog.js';
// La versión sale del package.json, para no tener que acordarse de cambiarla en dos sitios.
const { version } = createRequire(import.meta.url)('../package.json');
async function main() {
    const client = new TreeflowClient();
    // Grupos activos: la base siempre, más los de TREEFLOW_TOOLSETS (o los de por defecto).
    const { active, unknown } = parseToolsets(process.env.TREEFLOW_TOOLSETS);
    if (unknown.length) {
        console.error(`TREEFLOW_TOOLSETS: no existen los grupos ${unknown.join(', ')}. Hay: ${Object.keys(TOOLSETS).join(', ')}, todo.`);
    }
    const server = new Server({
        name: 'treeflow-mcp',
        version,
    }, {
        capabilities: {
            tools: { listChanged: true },
        },
        instructions: buildInstructions(active),
    });
    // Catálogo completo de Treeflow; sólo se ofrece lo de los grupos activos.
    const allTools = buildTools(client);
    const visibleTools = () => {
        const enable = enableToolsTool(active, allTools, () => server.sendToolListChanged());
        const list = allTools.filter((t) => active.has(toolsetOf(t.name)));
        return enable ? [...list, enable] : list;
    };
    // Handler para listar herramientas
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: visibleTools().map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
        };
    });
    // Handler para ejecutar herramientas
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        const tool = visibleTools().find((t) => t.name === name);
        if (!tool) {
            const group = allTools.some((t) => t.name === name) ? toolsetOf(name) : undefined;
            return {
                content: [
                    {
                        type: 'text',
                        text: group
                            ? `Error: "${name}" es del grupo ${group}, que no está activo. Actívalo con treeflow_enable_tools.`
                            : `Error: Herramienta desconocida "${name}"`,
                    },
                ],
                isError: true,
            };
        }
        try {
            return await tool.handler(args || {});
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
    console.error(`🚀 Treeflow MCP Server running (${visibleTools().length} of ${allTools.length} tools; groups: ${[...active].join(', ')})`);
}
main().catch((err) => {
    console.error('Fatal error running Treeflow MCP Server:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map