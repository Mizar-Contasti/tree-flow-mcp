import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerUserTools(client: TreeflowClient): ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            username?: undefined;
            email?: undefined;
            role?: undefined;
            name?: undefined;
            user_id?: undefined;
            is_active?: undefined;
        };
        required?: undefined;
    };
    handler: () => Promise<{
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
            username: {
                type: string;
                description: string;
            };
            email: {
                type: string;
                description: string;
            };
            role: {
                type: string;
                description: string;
            };
            name: {
                type: string;
                description: string;
            };
            user_id?: undefined;
            is_active?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        username: string;
        email: string;
        role: string;
        name?: string;
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
            user_id: {
                type: string;
                description: string;
            };
            role: {
                type: string;
                description: string;
            };
            is_active: {
                type: string;
                description: string;
            };
            username?: undefined;
            email?: undefined;
            name?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        user_id: string;
        role?: string;
        is_active?: boolean;
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
            user_id: {
                type: string;
                description: string;
            };
            username?: undefined;
            email?: undefined;
            role?: undefined;
            name?: undefined;
            is_active?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        user_id: string;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
})[];
