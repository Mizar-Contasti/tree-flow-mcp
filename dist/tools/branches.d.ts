import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerBranchTools(client: TreeflowClient): ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            tree_id: {
                type: string;
                description: string;
            };
            name?: undefined;
            description?: undefined;
            is_default?: undefined;
            branch_id?: undefined;
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
            name: {
                type: string;
                description: string;
            };
            description: {
                type: string;
                description: string;
            };
            is_default: {
                type: string;
                description: string;
            };
            branch_id?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        name: string;
        description?: string;
        is_default?: boolean;
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
            branch_id: {
                type: string;
                description: string;
            };
            name: {
                type: string;
                description: string;
            };
            description: {
                type: string;
                description: string;
            };
            is_default: {
                type: string;
                description: string;
            };
            tree_id?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        branch_id: string;
        name?: string;
        description?: string;
        is_default?: boolean;
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
            branch_id: {
                type: string;
                description: string;
            };
            tree_id?: undefined;
            name?: undefined;
            description?: undefined;
            is_default?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        branch_id: string;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
})[];
