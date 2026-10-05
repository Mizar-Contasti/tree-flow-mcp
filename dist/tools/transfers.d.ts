import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerTransferTools(client: TreeflowClient): ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            tree_id: {
                type: string;
            };
            config_id?: undefined;
            endpoint_url?: undefined;
            auth_token?: undefined;
            custom_headers?: undefined;
            history_format?: undefined;
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
            name: {
                type: string;
                description: string;
            };
            description: {
                type: string;
            };
            endpoint_url: {
                type: string;
                description: string;
            };
            auth_token: {
                type: string;
                description: string;
            };
            custom_headers: {
                type: string;
                description: string;
            };
            include_history: {
                type: string;
                description: string;
            };
            history_format: {
                type: string;
                enum: string[];
                description: string;
            };
            agent_stops_listening: {
                type: string;
                description: string;
            };
            persist_widget_chat: {
                type: string;
                description: string;
            };
            transfer_message: {
                type: string;
                description: string;
            };
            is_active: {
                type: string;
            };
            tree_id: {
                type: string;
            };
            config_id: {
                type: string;
                description: string;
            };
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
            config_id: {
                type: string;
                description?: undefined;
            };
            endpoint_url: {
                type: string;
            };
            auth_token: {
                type: string;
            };
            custom_headers: {
                type: string;
            };
            history_format: {
                type: string;
                enum: string[];
            };
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
