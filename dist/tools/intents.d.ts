import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerIntentTools(client: TreeflowClient): ({
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
            patterns?: undefined;
            entities?: undefined;
            type?: undefined;
            intent_id?: undefined;
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
            patterns: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            entities: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            type: {
                type: string;
                description: string;
            };
            intent_id?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        name: string;
        patterns: string[];
        entities?: any[];
        type?: string;
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
            intent_id: {
                type: string;
                description: string;
            };
            name: {
                type: string;
                description: string;
            };
            patterns: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            entities: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            type?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        intent_id: string;
        name?: string;
        patterns?: string[];
        entities?: any[];
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
            intent_id: {
                type: string;
                description: string;
            };
            name?: undefined;
            patterns?: undefined;
            entities?: undefined;
            type?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        intent_id: string;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
})[];
