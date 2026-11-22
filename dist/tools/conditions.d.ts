import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerConditionTools(client: TreeflowClient): ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            tree_id: {
                type: string;
            };
            condition_ref?: undefined;
            name?: undefined;
            expression?: undefined;
            description?: undefined;
        };
        required: string[];
    };
    handler: (a: {
        tree_id: string;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            tree_id: {
                type: string;
            };
            condition_ref: {
                type: string;
                description: string;
            };
            name: {
                type: string;
                description: string;
            };
            expression: {
                type: string;
                description: string;
            };
            description: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (a: {
        tree_id: string;
        condition_ref?: string;
        name?: string;
        expression?: string;
        description?: string | null;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
})[];
