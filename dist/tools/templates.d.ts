import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerTemplateTools(client: TreeflowClient): {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            tree_id: {
                type: string;
                description: string;
            };
            template_id: {
                type: string;
                description: string;
            };
            name: {
                type: string;
                description: string;
            };
            text: {
                type: string;
                description: string;
            };
            description: {
                type: string;
            };
            responses: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
        };
        required: string[];
    };
    handler: (args: {
        tree_id: string;
        template_id?: string;
        name?: string;
        text?: string;
        description?: string;
        responses?: any[];
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
}[];
