import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerEntityTools(client: TreeflowClient): ({
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
            values?: undefined;
            entity_id?: undefined;
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
            values: {
                type: string;
                description: string;
                items: {
                    type: string;
                    properties: {
                        value: {
                            type: string;
                            description: string;
                        };
                        synonyms: {
                            type: string;
                            items: {
                                type: string;
                            };
                            description: string;
                        };
                    };
                    required: string[];
                };
            };
            entity_id?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        name: string;
        values: Array<{
            value: string;
            synonyms: string[];
        }>;
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
            entity_id: {
                type: string;
                description: string;
            };
            name: {
                type: string;
                description: string;
            };
            values: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        value: {
                            type: string;
                            description?: undefined;
                        };
                        synonyms: {
                            type: string;
                            items: {
                                type: string;
                            };
                            description?: undefined;
                        };
                    };
                    required: string[];
                };
                description?: undefined;
            };
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        entity_id: string;
        name?: string;
        values?: Array<{
            value: string;
            synonyms: string[];
        }>;
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
            entity_id: {
                type: string;
                description: string;
            };
            name?: undefined;
            values?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        entity_id: string;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
})[];
