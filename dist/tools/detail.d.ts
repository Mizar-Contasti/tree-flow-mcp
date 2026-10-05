import { TreeflowClient } from '../client/treeflowClient.js';
declare const KINDS: readonly ["leaf", "intent", "entity", "template", "tool", "script"];
type Kind = (typeof KINDS)[number];
export declare function registerDetailTools(client: TreeflowClient): {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            tree_id: {
                type: string;
                description: string;
            };
            tipo: {
                type: string;
                enum: ("entity" | "tool" | "intent" | "leaf" | "template" | "script")[];
            };
            ref: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (a: {
        tree_id: string;
        tipo: Kind;
        ref: string;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
}[];
export {};
