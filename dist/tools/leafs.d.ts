import { TreeflowClient } from '../client/treeflowClient.js';
export interface NewLeaf {
    ref?: string;
    leaf_type: string;
    name?: string;
    config?: Record<string, any>;
    position_x?: number;
    position_y?: number;
    is_start?: boolean;
}
/** Sustituye cada "ref:<ref>" del valor (a cualquier profundidad) por el ID asignado. */
export declare function resolveRefs(value: any, ids: Map<string, string>): any;
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
            leaves: {
                type: string;
                description: string;
                items: {
                    type: string;
                    properties: {
                        ref: {
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
                        };
                        position_y: {
                            type: string;
                        };
                        is_start: {
                            type: string;
                        };
                    };
                    required: string[];
                };
            };
            leaf_id?: undefined;
            tree_id?: undefined;
            name?: undefined;
            leaf_type?: undefined;
            config?: undefined;
            replace_config?: undefined;
            position_x?: undefined;
            position_y?: undefined;
            is_start?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        branch_id: string;
        leaves: NewLeaf[];
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
            branch_id: {
                type: string;
                description: string;
            };
            tree_id: {
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
            replace_config: {
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
            leaves?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        leaf_id: string;
        branch_id?: string;
        tree_id?: string;
        name?: string;
        leaf_type?: string;
        config?: any;
        replace_config?: boolean;
        position_x?: number;
        position_y?: number;
        is_start?: boolean;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
})[];
