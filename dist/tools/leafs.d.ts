import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerLeafTools(client: TreeflowClient): ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            branch_id: {
                type: string;
                description: string;
            };
            leaf_type?: undefined;
            config?: undefined;
            canvas_position?: undefined;
            leaf_id?: undefined;
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
            leaf_type: {
                type: string;
                description: string;
            };
            config: {
                type: string;
                description: string;
            };
            canvas_position: {
                type: string;
                description: string;
            };
            leaf_id?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        branch_id: string;
        leaf_type: string;
        config?: any;
        canvas_position?: any;
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
            leaf_id: {
                type: string;
                description: string;
            };
            config: {
                type: string;
                description: string;
            };
            canvas_position: {
                type: string;
                description: string;
            };
            branch_id?: undefined;
            leaf_type?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        leaf_id: string;
        config?: any;
        canvas_position?: any;
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
            leaf_id: {
                type: string;
                description: string;
            };
            branch_id?: undefined;
            leaf_type?: undefined;
            config?: undefined;
            canvas_position?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        leaf_id: string;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
})[];
