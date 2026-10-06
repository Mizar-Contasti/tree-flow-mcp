import { TreeflowClient } from '../client/treeflowClient.js';
declare const KINDS: readonly ["branch", "leaf", "intent", "entity", "template", "tool", "script", "capture", "transfer", "test_suite"];
type Kind = (typeof KINDS)[number];
export declare function registerDeleteTools(client: TreeflowClient): {
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
                enum: ("intent" | "entity" | "tool" | "branch" | "leaf" | "template" | "script" | "capture" | "transfer" | "test_suite")[];
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
