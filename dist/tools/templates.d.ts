import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerTemplateTools(client: TreeflowClient): ({
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
            template?: undefined;
            variations?: undefined;
            template_id?: undefined;
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
            template: {
                type: string;
                description: string;
            };
            variations: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            template_id?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        name: string;
        template: string;
        variations?: string[];
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
            template_id: {
                type: string;
                description: string;
            };
            name: {
                type: string;
                description: string;
            };
            template: {
                type: string;
                description: string;
            };
            variations: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            tree_id?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        template_id: string;
        name?: string;
        template?: string;
        variations?: string[];
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
            template_id: {
                type: string;
                description: string;
            };
            tree_id?: undefined;
            name?: undefined;
            template?: undefined;
            variations?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        template_id: string;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
})[];
