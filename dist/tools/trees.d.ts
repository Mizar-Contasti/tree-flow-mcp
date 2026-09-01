import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerTreeTools(client: TreeflowClient): ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            tree_id?: undefined;
            name?: undefined;
            description?: undefined;
            purpose?: undefined;
            primary_language?: undefined;
            webhook_url?: undefined;
            nlp_mode?: undefined;
            sentiment_analysis_enabled?: undefined;
            ml_confidence_threshold?: undefined;
            fuzzy_confidence_threshold?: undefined;
            mode?: undefined;
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
            tree_id: {
                type: string;
                description: string;
            };
            name?: undefined;
            description?: undefined;
            purpose?: undefined;
            primary_language?: undefined;
            webhook_url?: undefined;
            nlp_mode?: undefined;
            sentiment_analysis_enabled?: undefined;
            ml_confidence_threshold?: undefined;
            fuzzy_confidence_threshold?: undefined;
            mode?: undefined;
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
            name: {
                type: string;
                description: string;
            };
            description: {
                type: string;
                description: string;
            };
            purpose: {
                type: string;
                description: string;
            };
            primary_language: {
                type: string;
                description: string;
            };
            tree_id?: undefined;
            webhook_url?: undefined;
            nlp_mode?: undefined;
            sentiment_analysis_enabled?: undefined;
            ml_confidence_threshold?: undefined;
            fuzzy_confidence_threshold?: undefined;
            mode?: undefined;
        };
        required: string[];
    };
    handler: (args: {
        name: string;
        description?: string;
        purpose?: string;
        primary_language?: string;
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
            description: {
                type: string;
                description: string;
            };
            purpose: {
                type: string;
                description: string;
            };
            webhook_url: {
                type: string;
                description: string;
            };
            nlp_mode: {
                type: string;
                description: string;
            };
            sentiment_analysis_enabled: {
                type: string;
                description: string;
            };
            ml_confidence_threshold: {
                type: string;
                description: string;
            };
            fuzzy_confidence_threshold: {
                type: string;
                description: string;
            };
            mode: {
                type: string;
                description: string;
            };
            primary_language?: undefined;
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
})[];
