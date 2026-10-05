import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerDiagnosticTools(client: TreeflowClient): ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            tree_id: {
                type: string;
                description: string;
            };
            message: {
                type: string;
                description: string;
            };
            session_id: {
                type: string;
                description: string;
            };
            limit?: undefined;
            offset?: undefined;
            intent?: undefined;
            start_date?: undefined;
            end_date?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        message: string;
        session_id?: string;
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
            limit: {
                type: string;
                description: string;
            };
            offset: {
                type: string;
                description: string;
            };
            intent: {
                type: string;
                description: string;
            };
            message: {
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
            session_id?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        [key: string]: any;
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
            session_id: {
                type: string;
                description: string;
            };
            message?: undefined;
            limit?: undefined;
            offset?: undefined;
            intent?: undefined;
            start_date?: undefined;
            end_date?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        session_id: string;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
})[];
