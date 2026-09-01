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
            type?: undefined;
            values?: undefined;
            pattern?: undefined;
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
            type: {
                type: string;
                enum: string[];
                description: string;
            };
            values: {
                type: string;
                description: string;
                items: {
                    type: string;
                    properties: {
                        key: {
                            type: string;
                            description: string;
                        };
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
                        entity: {
                            type: string;
                            description: string;
                        };
                    };
                };
            };
            pattern: {
                type: string;
                description: string;
            };
            entity_id?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        name: string;
        type?: string;
        values?: any[];
        pattern?: string;
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
            type: {
                type: string;
                enum: string[];
                description: string;
            };
            values: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        key: {
                            type: string;
                            description?: undefined;
                        };
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
                        entity: {
                            type: string;
                            description?: undefined;
                        };
                    };
                };
                description?: undefined;
            };
            pattern: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        entity_id: string;
        name?: string;
        type?: string;
        values?: any[];
        pattern?: string;
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
            type?: undefined;
            values?: undefined;
            pattern?: undefined;
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
