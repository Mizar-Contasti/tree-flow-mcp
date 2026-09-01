import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerFertilizerTools(client: TreeflowClient): ({
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
            fertilizer_type?: undefined;
            config?: undefined;
            fertilizer_id?: undefined;
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
            fertilizer_type: {
                type: string;
                description: string;
            };
            config: {
                type: string;
                description: string;
            };
            fertilizer_id?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        name: string;
        fertilizer_type: string;
        config: any;
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
            fertilizer_id: {
                type: string;
                description: string;
            };
            name?: undefined;
            fertilizer_type?: undefined;
            config?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        fertilizer_id: string;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
})[];
