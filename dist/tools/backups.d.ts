import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerBackupTools(client: TreeflowClient): ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            tree_id: {
                type: string;
            };
            include_conversations: {
                type: string;
                description: string;
            };
            archivo?: undefined;
            backup?: undefined;
            snapshot_id?: undefined;
            confirm?: undefined;
        };
        required: string[];
    };
    handler: (a: {
        tree_id: string;
        include_conversations?: boolean;
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
            archivo: {
                type: string;
                description: string;
            };
            backup: {
                type: string;
                description: string;
            };
            tree_id?: undefined;
            include_conversations?: undefined;
            snapshot_id?: undefined;
            confirm?: undefined;
        };
        required?: undefined;
    };
    handler: (a: {
        archivo?: string;
        backup?: Record<string, any>;
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
            snapshot_id: {
                type: string;
                description: string;
            };
            confirm: {
                type: string;
                description: string;
            };
            include_conversations?: undefined;
            archivo?: undefined;
            backup?: undefined;
        };
        required: string[];
    };
    handler: (a: {
        tree_id: string;
        snapshot_id: string;
        confirm: boolean;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
})[];
