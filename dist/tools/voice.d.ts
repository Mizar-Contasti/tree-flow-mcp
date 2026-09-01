import { TreeflowClient } from '../client/treeflowClient.js';
export declare function registerVoiceTools(client: TreeflowClient): ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            tree_id: {
                type: string;
                description: string;
            };
            stt_enabled?: undefined;
            stt_model?: undefined;
            stt_language?: undefined;
            stt_save_audio?: undefined;
            tts_enabled?: undefined;
            tts_voice?: undefined;
            tts_speed?: undefined;
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
            stt_enabled: {
                type: string;
                description: string;
            };
            stt_model: {
                type: string;
                description: string;
            };
            stt_language: {
                type: string;
                description: string;
            };
            stt_save_audio: {
                type: string;
                description: string;
            };
            tts_enabled: {
                type: string;
                description: string;
            };
            tts_voice: {
                type: string;
                description: string;
            };
            tts_speed: {
                type: string;
                description: string;
            };
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
