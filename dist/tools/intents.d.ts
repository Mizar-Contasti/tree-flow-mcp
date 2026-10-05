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
            intents?: undefined;
            intent_id?: undefined;
            name?: undefined;
            add_patterns?: undefined;
            remove_patterns?: undefined;
            patterns?: undefined;
            entities?: undefined;
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
            intents: {
                type: string;
                items: {
                    type: string;
                    properties: {
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
                            description: string;
                            type: string;
                            items: {
                                type: string;
                                properties: {
                                    name: {
                                        type: string;
                                        description: string;
                                    };
                                    entity_name: {
                                        type: string;
                                        description: string;
                                    };
                                    required: {
                                        type: string;
                                        description: string;
                                    };
                                    prompt: {
                                        type: string;
                                        description: string;
                                    };
                                };
                                required: string[];
                            };
                        };
                        type: {
                            type: string;
                            description: string;
                        };
                    };
                    required: string[];
                };
            };
            intent_id?: undefined;
            name?: undefined;
            add_patterns?: undefined;
            remove_patterns?: undefined;
            patterns?: undefined;
            entities?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        intents: {
            name: string;
            patterns: string[];
            entities?: any[];
            type?: string;
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
            intent_id: {
                type: string;
                description: string;
            };
            name: {
                type: string;
                description: string;
            };
            add_patterns: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            remove_patterns: {
                type: string;
                items: {
                    type: string;
                };
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
                description: string;
                type: string;
                items: {
                    type: string;
                    properties: {
                        name: {
                            type: string;
                            description: string;
                        };
                        entity_name: {
                            type: string;
                            description: string;
                        };
                        required: {
                            type: string;
                            description: string;
                        };
                        prompt: {
                            type: string;
                            description: string;
                        };
                    };
                    required: string[];
                };
            };
            intents?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        intent_id: string;
        name?: string;
        patterns?: string[];
        entities?: any[];
        add_patterns?: string[];
        remove_patterns?: string[];
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
})[];
