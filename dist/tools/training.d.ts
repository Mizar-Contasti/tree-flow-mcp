import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerTrainingTools(client: TreeflowClient): ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            tree_id: {
                type: string;
                description: string;
            };
            probar: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            force: {
                type: string;
                description: string;
            };
            esperar_segundos: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        probar?: string[];
        force?: boolean;
        esperar_segundos?: number;
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
            probar?: undefined;
            force?: undefined;
            esperar_segundos?: undefined;
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
})[];
