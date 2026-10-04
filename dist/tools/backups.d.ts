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
            backup: {
                type: string;
                description: string;
            };
            tree_id?: undefined;
            include_conversations?: undefined;
            snapshot_id?: undefined;
            confirm?: undefined;
        };
        required: string[];
    };
    handler: (a: {
        backup: Record<string, any>;
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
