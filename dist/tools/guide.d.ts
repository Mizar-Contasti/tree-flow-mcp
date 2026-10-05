export declare const GUIDE: Record<string, string>;
export declare function registerGuideTools(): {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            tema: {
                type: string;
                enum: string[];
            };
        };
        required: string[];
    };
    handler: (a: {
        tema: string;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
}[];
