import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerSuiteTools(client: TreeflowClient): ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            tree_id: {
                type: string;
                description?: undefined;
            };
            suite_id?: undefined;
            name?: undefined;
            description?: undefined;
            cases?: undefined;
            csv?: undefined;
            modo?: undefined;
            limit?: undefined;
            run_id?: undefined;
            other_run_id?: undefined;
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
            suite_id: {
                type: string;
                description?: undefined;
            };
            tree_id?: undefined;
            name?: undefined;
            description?: undefined;
            cases?: undefined;
            csv?: undefined;
            modo?: undefined;
            limit?: undefined;
            run_id?: undefined;
            other_run_id?: undefined;
        };
        required: string[];
    };
    handler: (a: {
        suite_id: string;
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
            suite_id: {
                type: string;
                description: string;
            };
            name: {
                type: string;
                description: string;
            };
            description: {
                type: string;
            };
            cases: {
                type: string;
                description: string;
                items: {
                    type: string;
                    properties: {
                        nombre: {
                            type: string;
                        };
                        turnos: {
                            type: string;
                            items: {
                                type: string;
                                properties: {
                                    mensaje: {
                                        type: string;
                                        description: string;
                                    };
                                    asserts: {
                                        type: string;
                                        items: {
                                            type: string;
                                            properties: {
                                                tipo: {
                                                    type: string;
                                                    enum: string[];
                                                };
                                                valor: {
                                                    type: string;
                                                    description: string;
                                                };
                                                nombre: {
                                                    type: string;
                                                    description: string;
                                                };
                                            };
                                            required: string[];
                                        };
                                    };
                                };
                                required: string[];
                            };
                        };
                    };
                    required: string[];
                };
            };
            csv?: undefined;
            modo?: undefined;
            limit?: undefined;
            run_id?: undefined;
            other_run_id?: undefined;
        };
        required?: undefined;
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
            suite_id: {
                type: string;
                description?: undefined;
            };
            csv: {
                type: string;
                description: string;
            };
            modo: {
                type: string;
                enum: string[];
            };
            tree_id?: undefined;
            name?: undefined;
            description?: undefined;
            cases?: undefined;
            limit?: undefined;
            run_id?: undefined;
            other_run_id?: undefined;
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
            suite_id: {
                type: string;
                description?: undefined;
            };
            limit: {
                type: string;
                description: string;
            };
            tree_id?: undefined;
            name?: undefined;
            description?: undefined;
            cases?: undefined;
            csv?: undefined;
            modo?: undefined;
            run_id?: undefined;
            other_run_id?: undefined;
        };
        required: string[];
    };
    handler: (a: {
        suite_id: string;
        limit?: number;
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
            run_id: {
                type: string;
                description?: undefined;
            };
            tree_id?: undefined;
            suite_id?: undefined;
            name?: undefined;
            description?: undefined;
            cases?: undefined;
            csv?: undefined;
            modo?: undefined;
            limit?: undefined;
            other_run_id?: undefined;
        };
        required: string[];
    };
    handler: (a: {
        run_id: string;
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
            run_id: {
                type: string;
                description: string;
            };
            other_run_id: {
                type: string;
                description: string;
            };
            tree_id?: undefined;
            suite_id?: undefined;
            name?: undefined;
            description?: undefined;
            cases?: undefined;
            csv?: undefined;
            modo?: undefined;
            limit?: undefined;
        };
        required: string[];
    };
    handler: (a: {
        run_id: string;
        other_run_id: string;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
})[];
