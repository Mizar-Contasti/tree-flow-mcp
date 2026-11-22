import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerEnvironmentTools(client: TreeflowClient): ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            tree_id: {
                type: string;
                description?: undefined;
            };
            destino?: undefined;
            volver?: undefined;
            cancelar?: undefined;
            nota?: undefined;
            confirm?: undefined;
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
                description: string;
            };
            destino: {
                type: string;
                enum: string[];
            };
            volver: {
                type: string;
                description: string;
            };
            cancelar: {
                type: string;
                description: string;
            };
            nota: {
                type: string;
                description: string;
            };
            confirm: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (a: {
        tree_id: string;
        destino?: string;
        volver?: boolean;
        cancelar?: string;
        nota?: string;
        confirm: boolean;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
})[];
