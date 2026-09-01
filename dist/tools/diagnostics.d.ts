import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerDiagnosticTools(client: TreeflowClient): ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            tree_id: {
                type: string;
                description: string;
            };
            message: {
                type: string;
                description: string;
            };
            session_id: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        message: string;
        session_id?: string;
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
            message?: undefined;
            session_id?: undefined;
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
