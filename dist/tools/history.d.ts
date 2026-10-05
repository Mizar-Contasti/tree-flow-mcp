import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerHistoryTools(client: TreeflowClient): ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            tree_id: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                description: string;
            };
            offset: {
                type: string;
                description: string;
            };
            entity_type: {
                type: string;
                description: string;
            };
            action: {
                type: string;
                enum: string[];
            };
            change_id: {
                type: string;
                description: string;
            };
            page?: undefined;
            page_size?: undefined;
            note?: undefined;
            start_date?: undefined;
            end_date?: undefined;
            intent?: undefined;
            branch?: undefined;
            include_console?: undefined;
            max_depth?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        limit?: number;
        offset?: number;
        entity_type?: string;
        action?: string;
        change_id?: string;
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
            page: {
                type: string;
                description: string;
            };
            page_size: {
                type: string;
                description: string;
            };
            limit?: undefined;
            offset?: undefined;
            entity_type?: undefined;
            action?: undefined;
            change_id?: undefined;
            note?: undefined;
            start_date?: undefined;
            end_date?: undefined;
            intent?: undefined;
            branch?: undefined;
            include_console?: undefined;
            max_depth?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        page?: number;
        page_size?: number;
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
            limit?: undefined;
            offset?: undefined;
            entity_type?: undefined;
            action?: undefined;
            change_id?: undefined;
            page?: undefined;
            page_size?: undefined;
            note?: undefined;
            start_date?: undefined;
            end_date?: undefined;
            intent?: undefined;
            branch?: undefined;
            include_console?: undefined;
            max_depth?: undefined;
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
            note: {
                type: string;
                description: string;
            };
            limit?: undefined;
            offset?: undefined;
            entity_type?: undefined;
            action?: undefined;
            change_id?: undefined;
            page?: undefined;
            page_size?: undefined;
            start_date?: undefined;
            end_date?: undefined;
            intent?: undefined;
            branch?: undefined;
            include_console?: undefined;
            max_depth?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        note?: string;
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
            start_date: {
                type: string;
                description: string;
            };
            end_date: {
                type: string;
                description: string;
            };
            intent: {
                type: string;
                description: string;
            };
            branch: {
                type: string;
                description: string;
            };
            include_console: {
                type: string;
                description: string;
            };
            max_depth: {
                type: string;
                description: string;
            };
            limit?: undefined;
            offset?: undefined;
            entity_type?: undefined;
            action?: undefined;
            change_id?: undefined;
            page?: undefined;
            page_size?: undefined;
            note?: undefined;
        };
        required: string[];
    };
    handler: (args: any) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
})[];
