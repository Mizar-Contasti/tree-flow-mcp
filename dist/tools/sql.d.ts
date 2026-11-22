import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerSqlTools(client: TreeflowClient): ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            tree_id: {
                type: string;
            };
            connection_ref?: undefined;
            nombre?: undefined;
            new_name?: undefined;
            motor?: undefined;
            host?: undefined;
            puerto?: undefined;
            base?: undefined;
            usuario?: undefined;
            password?: undefined;
            ssl?: undefined;
            query_ref?: undefined;
            name?: undefined;
            sql?: undefined;
            connection?: undefined;
            description?: undefined;
            inputVariables?: undefined;
            outputVariables?: undefined;
            timeout?: undefined;
            maxFilas?: undefined;
            enabled?: undefined;
            errorMessage?: undefined;
            status?: undefined;
            test_values?: undefined;
        };
        required: string[];
    };
    handler: (a: {
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
            };
            connection_ref: {
                type: string;
                description: string;
            };
            nombre: {
                type: string;
                description: string;
            };
            new_name: {
                type: string;
                description: string;
            };
            motor: {
                type: string;
                enum: string[];
            };
            host: {
                type: string;
                description: string;
            };
            puerto: {
                type: string;
                description: string;
            };
            base: {
                type: string;
                description: string;
            };
            usuario: {
                type: string;
                description: string;
            };
            password: {
                type: string;
            };
            ssl: {
                type: string;
                description: string;
            };
            query_ref?: undefined;
            name?: undefined;
            sql?: undefined;
            connection?: undefined;
            description?: undefined;
            inputVariables?: undefined;
            outputVariables?: undefined;
            timeout?: undefined;
            maxFilas?: undefined;
            enabled?: undefined;
            errorMessage?: undefined;
            status?: undefined;
            test_values?: undefined;
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
            };
            connection_ref: {
                type: string;
                description: string;
            };
            nombre?: undefined;
            new_name?: undefined;
            motor?: undefined;
            host?: undefined;
            puerto?: undefined;
            base?: undefined;
            usuario?: undefined;
            password?: undefined;
            ssl?: undefined;
            query_ref?: undefined;
            name?: undefined;
            sql?: undefined;
            connection?: undefined;
            description?: undefined;
            inputVariables?: undefined;
            outputVariables?: undefined;
            timeout?: undefined;
            maxFilas?: undefined;
            enabled?: undefined;
            errorMessage?: undefined;
            status?: undefined;
            test_values?: undefined;
        };
        required: string[];
    };
    handler: (a: {
        tree_id: string;
        connection_ref: string;
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
            };
            query_ref: {
                type: string;
                description: string;
            };
            name: {
                type: string;
                description: string;
            };
            sql: {
                type: string;
                description: string;
            };
            connection: {
                type: string;
                description: string;
            };
            description: {
                type: string;
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
                            description: string;
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
                            description: string;
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
            timeout: {
                type: string;
                description: string;
            };
            maxFilas: {
                type: string;
                description: string;
            };
            enabled: {
                type: string;
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
            connection_ref?: undefined;
            nombre?: undefined;
            new_name?: undefined;
            motor?: undefined;
            host?: undefined;
            puerto?: undefined;
            base?: undefined;
            usuario?: undefined;
            password?: undefined;
            ssl?: undefined;
            test_values?: undefined;
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
            };
            query_ref: {
                type: string;
                description: string;
            };
            test_values: {
                type: string;
                description: string;
            };
            connection_ref?: undefined;
            nombre?: undefined;
            new_name?: undefined;
            motor?: undefined;
            host?: undefined;
            puerto?: undefined;
            base?: undefined;
            usuario?: undefined;
            password?: undefined;
            ssl?: undefined;
            name?: undefined;
            sql?: undefined;
            connection?: undefined;
            description?: undefined;
            inputVariables?: undefined;
            outputVariables?: undefined;
            timeout?: undefined;
            maxFilas?: undefined;
            enabled?: undefined;
            errorMessage?: undefined;
            status?: undefined;
        };
        required: string[];
    };
    handler: (a: {
        tree_id: string;
        query_ref: string;
        test_values?: Record<string, string>;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
})[];
