import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerIntegrationTools(client: TreeflowClient): ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            tree_id: {
                type: string;
                description: string;
            };
            integration_key?: undefined;
            enabled?: undefined;
            config?: undefined;
        };
        required: string[];
    };
    handler: (args: {
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
                description: string;
            };
            integration_key: {
                type: string;
                description: string;
            };
            enabled: {
                type: string;
                description: string;
            };
            config: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        integration_key: string;
        enabled: boolean;
        config?: any;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
})[];
