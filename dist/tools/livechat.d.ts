import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerLiveChatTools(client: TreeflowClient): ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            tree_id: {
                type: string;
                description: string;
            };
            desde?: undefined;
            hasta?: undefined;
            estado?: undefined;
            q?: undefined;
            limit?: undefined;
            offset?: undefined;
            session_id?: undefined;
        };
        required?: undefined;
    };
    handler: (a: {
        tree_id?: string;
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
                description?: undefined;
            };
            desde: {
                type: string;
                description: string;
            };
            hasta: {
                type: string;
                description: string;
            };
            estado: {
                type: string;
            };
            q: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                description: string;
            };
            offset: {
                type: string;
            };
            session_id?: undefined;
        };
        required?: undefined;
    };
    handler: (a: any) => Promise<{
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
            session_id: {
                type: string;
            };
            tree_id?: undefined;
            desde?: undefined;
            hasta?: undefined;
            estado?: undefined;
            q?: undefined;
            limit?: undefined;
            offset?: undefined;
        };
        required: string[];
    };
    handler: (a: {
        session_id: string;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
})[];
