import { TreeflowClient } from './client/treeflowClient.js';
export interface ToolDef {
    name: string;
    description: string;
    inputSchema: Record<string, any>;
    handler: (args: any) => Promise<any>;
}
export declare const TOOLSETS: Record<string, {
    label: string;
    match: RegExp;
}>;
export declare const DEFAULT_TOOLSETS: string[];
export declare function toolsetOf(toolName: string): string;
/**
 * Grupos activos según TREEFLOW_TOOLSETS. Vacía: la base y los de por defecto. Una lista
 * ("apis,pruebas") sustituye a los de por defecto; "todo" los activa todos.
 */
export declare function parseToolsets(value: string | undefined): {
    active: Set<string>;
    unknown: string[];
};
export declare function buildInstructions(active: Set<string>): string;
/** Las instrucciones con todos los grupos activos: sirve para medirlas y probarlas. */
export declare const INSTRUCTIONS: string;
/**
 * La herramienta que activa grupos a mitad de una conversación. Sólo existe mientras quede
 * alguno inactivo; `onChange` avisa al cliente para que recargue la lista.
 */
export declare function enableToolsTool(active: Set<string>, allTools: ToolDef[], onChange: () => Promise<void>): ToolDef | undefined;
export declare function buildToolGroups(client: TreeflowClient): Record<string, ToolDef[]>;
export declare function buildTools(client: TreeflowClient): ToolDef[];
