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
            name?: undefined;
            config?: undefined;
            position_x?: undefined;
            position_y?: undefined;
            is_start?: undefined;
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
            name: {
                type: string;
                description: string;
            };
            config: {
                type: string;
                description: string;
            };
            position_x: {
                type: string;
                description: string;
            };
            position_y: {
                type: string;
                description: string;
            };
            is_start: {
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
        name?: string;
        config?: any;
        position_x?: number;
        position_y?: number;
        is_start?: boolean;
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
            name: {
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
            position_x: {
                type: string;
                description: string;
            };
            position_y: {
                type: string;
                description: string;
            };
            is_start: {
                type: string;
                description: string;
            };
            branch_id?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        leaf_id: string;
        name?: string;
        leaf_type?: string;
        config?: any;
        position_x?: number;
        position_y?: number;
        is_start?: boolean;
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
            name?: undefined;
            config?: undefined;
            position_x?: undefined;
            position_y?: undefined;
            is_start?: undefined;
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
