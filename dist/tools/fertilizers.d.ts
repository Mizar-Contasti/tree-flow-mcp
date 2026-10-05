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
            tool_id?: undefined;
            name?: undefined;
            url?: undefined;
            method?: undefined;
            description?: undefined;
            body?: undefined;
            timeout?: undefined;
            enabled?: undefined;
            authType?: undefined;
            authConfig?: undefined;
            inputVariables?: undefined;
            outputVariables?: undefined;
            errorMessage?: undefined;
            status?: undefined;
            test_values?: undefined;
            limit?: undefined;
            offset?: undefined;
            success?: undefined;
            tool_name?: undefined;
            search?: undefined;
            date_from?: undefined;
            date_to?: undefined;
            script_id?: undefined;
            code?: undefined;
            language?: undefined;
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
            tool_id: {
                type: string;
                description: string;
            };
            name: {
                type: string;
                description: string;
            };
            url: {
                type: string;
                description: string;
            };
            method: {
                type: string;
                enum: string[];
                description: string;
            };
            description: {
                type: string;
            };
            body: {
                type: string;
                description: string;
            };
            timeout: {
                type: string;
                description: string;
            };
            enabled: {
                type: string;
            };
            authType: {
                type: string;
                enum: string[];
            };
            authConfig: {
                type: string;
                description: string;
            };
            inputVariables: {
                description: string;
                type: string;
                items: {
                    type: string;
                    properties: {
                        name: {
                            type: string;
                        };
                        type: {
                            type: string;
                            enum: string[];
                        };
                        description: {
                            type: string;
                        };
                        jsonPath: {
                            type: string;
                            description: string;
                        };
                        testValue: {
                            type: string;
                            description: string;
                        };
                        fallbackValue: {
                            type: string;
                            description: string;
                        };
                    };
                    required: string[];
                };
            };
            outputVariables: {
                description: string;
                type: string;
                items: {
                    type: string;
                    properties: {
                        name: {
                            type: string;
                        };
                        type: {
                            type: string;
                            enum: string[];
                        };
                        description: {
                            type: string;
                        };
                        jsonPath: {
                            type: string;
                            description: string;
                        };
                        testValue: {
                            type: string;
                            description: string;
                        };
                        fallbackValue: {
                            type: string;
                            description: string;
                        };
                    };
                    required: string[];
                };
            };
            errorMessage: {
                type: string;
                description: string;
            };
            status: {
                type: string;
                enum: string[];
                description: string;
            };
            test_values?: undefined;
            limit?: undefined;
            offset?: undefined;
            success?: undefined;
            tool_name?: undefined;
            search?: undefined;
            date_from?: undefined;
            date_to?: undefined;
            script_id?: undefined;
            code?: undefined;
            language?: undefined;
        };
        required: string[];
    };
    handler: (a: any) => Promise<{
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
                description?: undefined;
            };
            tool_id: {
                type: string;
                description: string;
            };
            test_values: {
                type: string;
                description: string;
            };
            name?: undefined;
            url?: undefined;
            method?: undefined;
            description?: undefined;
            body?: undefined;
            timeout?: undefined;
            enabled?: undefined;
            authType?: undefined;
            authConfig?: undefined;
            inputVariables?: undefined;
            outputVariables?: undefined;
            errorMessage?: undefined;
            status?: undefined;
            limit?: undefined;
            offset?: undefined;
            success?: undefined;
            tool_name?: undefined;
            search?: undefined;
            date_from?: undefined;
            date_to?: undefined;
            script_id?: undefined;
            code?: undefined;
            language?: undefined;
        };
        required: string[];
    };
    handler: (a: any) => Promise<{
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
                description?: undefined;
            };
            limit: {
                type: string;
                description: string;
            };
            offset: {
                type: string;
            };
            success: {
                type: string;
                description: string;
            };
            tool_name: {
                type: string;
            };
            search: {
                type: string;
                description: string;
            };
            date_from: {
                type: string;
                description: string;
            };
            date_to: {
                type: string;
                description: string;
            };
            tool_id?: undefined;
            name?: undefined;
            url?: undefined;
            method?: undefined;
            description?: undefined;
            body?: undefined;
            timeout?: undefined;
            enabled?: undefined;
            authType?: undefined;
            authConfig?: undefined;
            inputVariables?: undefined;
            outputVariables?: undefined;
            errorMessage?: undefined;
            status?: undefined;
            test_values?: undefined;
            script_id?: undefined;
            code?: undefined;
            language?: undefined;
        };
        required: string[];
    };
    handler: (a: any) => Promise<{
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
                description?: undefined;
            };
            script_id: {
                type: string;
                description: string;
            };
            name: {
                type: string;
                description: string;
            };
            code: {
                type: string;
                description: string;
            };
            language: {
                type: string;
                enum: string[];
                description: string;
            };
            description: {
                type: string;
            };
            timeout: {
                type: string;
                description: string;
            };
            enabled: {
                type: string;
            };
            inputVariables: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        name: {
                            type: string;
                        };
                        type: {
                            type: string;
                            enum: string[];
                        };
                        description: {
                            type: string;
                        };
                        jsonPath: {
                            type: string;
                            description: string;
                        };
                        testValue: {
                            type: string;
                            description: string;
                        };
                        fallbackValue: {
                            type: string;
                            description: string;
                        };
                    };
                    required: string[];
                };
            };
            outputVariables: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        name: {
                            type: string;
                        };
                        type: {
                            type: string;
                            enum: string[];
                        };
                        description: {
                            type: string;
                        };
                        jsonPath: {
                            type: string;
                            description: string;
                        };
                        testValue: {
                            type: string;
                            description: string;
                        };
                        fallbackValue: {
                            type: string;
                            description: string;
                        };
                    };
                    required: string[];
                };
            };
            errorMessage: {
                type: string;
                description?: undefined;
            };
            status: {
                type: string;
                enum: string[];
                description: string;
            };
            tool_id?: undefined;
            url?: undefined;
            method?: undefined;
            body?: undefined;
            authType?: undefined;
            authConfig?: undefined;
            test_values?: undefined;
            limit?: undefined;
            offset?: undefined;
            success?: undefined;
            tool_name?: undefined;
            search?: undefined;
            date_from?: undefined;
            date_to?: undefined;
        };
        required: string[];
    };
    handler: (a: any) => Promise<{
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
                description?: undefined;
            };
            script_id: {
                type: string;
                description: string;
            };
            test_values: {
                type: string;
                description: string;
            };
            tool_id?: undefined;
            name?: undefined;
            url?: undefined;
            method?: undefined;
            description?: undefined;
            body?: undefined;
            timeout?: undefined;
            enabled?: undefined;
            authType?: undefined;
            authConfig?: undefined;
            inputVariables?: undefined;
            outputVariables?: undefined;
            errorMessage?: undefined;
            status?: undefined;
            limit?: undefined;
            offset?: undefined;
            success?: undefined;
            tool_name?: undefined;
            search?: undefined;
            date_from?: undefined;
            date_to?: undefined;
            code?: undefined;
            language?: undefined;
        };
        required: string[];
    };
    handler: (a: any) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
})[];
