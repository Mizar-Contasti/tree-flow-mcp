import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerCaptureTools(client: TreeflowClient): ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            tree_id: {
                type: string;
            };
            capture_ref?: undefined;
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
            capture_ref: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (a: {
        tree_id: string;
        capture_ref: string;
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
            prompt: {
                type: string;
                description: string;
            };
            prompt_rich: {
                type: string;
                description: string;
            };
            prompt_blocks: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            prompt_responses: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            prompt_template_id: {
                type: string;
                description: string;
            };
            fallback: {
                type: string;
                description: string;
            };
            fallback_rich: {
                type: string;
            };
            fallback_blocks: {
                type: string;
                items: {
                    type: string;
                };
            };
            fallback_responses: {
                type: string;
                items: {
                    type: string;
                };
            };
            fallback_template_id: {
                type: string;
            };
            limit: {
                type: string;
                description: string;
            };
            on_limit_action: {
                type: string;
                enum: string[];
                description: string;
            };
            tree_id: {
                type: string;
            };
            capture_ref?: undefined;
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
            name: {
                type: string;
                description: string;
            };
            prompt: {
                type: string;
                description: string;
            };
            prompt_rich: {
                type: string;
                description: string;
            };
            prompt_blocks: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            prompt_responses: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            prompt_template_id: {
                type: string;
                description: string;
            };
            fallback: {
                type: string;
                description: string;
            };
            fallback_rich: {
                type: string;
            };
            fallback_blocks: {
                type: string;
                items: {
                    type: string;
                };
            };
            fallback_responses: {
                type: string;
                items: {
                    type: string;
                };
            };
            fallback_template_id: {
                type: string;
            };
            limit: {
                type: string;
                description: string;
            };
            on_limit_action: {
                type: string;
                enum: string[];
                description: string;
            };
            tree_id: {
                type: string;
            };
            capture_ref: {
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
})[];
