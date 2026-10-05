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
            entities?: undefined;
            entity_id?: undefined;
            name?: undefined;
            type?: undefined;
            add_values?: undefined;
            remove_values?: undefined;
            values?: undefined;
            pattern?: undefined;
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
            entities: {
                type: string;
                items: {
                    type: string;
                    properties: {
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
                                    synonyms: {
                                        type: string;
                                        items: {
                                            type: string;
                                        };
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
                    };
                    required: string[];
                };
            };
            entity_id?: undefined;
            name?: undefined;
            type?: undefined;
            add_values?: undefined;
            remove_values?: undefined;
            values?: undefined;
            pattern?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        entities: {
            name: string;
            type?: string;
            values?: any[];
            pattern?: string;
        }[];
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
            add_values: {
                type: string;
                description: string;
                items: {
                    type: string;
                    properties: {
                        key: {
                            type: string;
                        };
                        synonyms: {
                            type: string;
                            items: {
                                type: string;
                            };
                        };
                    };
                    required: string[];
                };
            };
            remove_values: {
                type: string;
                items: {
                    type: string;
                };
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
                        };
                        value: {
                            type: string;
                        };
                        synonyms: {
                            type: string;
                            items: {
                                type: string;
                            };
                        };
                        entity: {
                            type: string;
                        };
                    };
                };
            };
            pattern: {
                type: string;
                description: string;
            };
            entities?: undefined;
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
        add_values?: any[];
        remove_values?: string[];
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
})[];
