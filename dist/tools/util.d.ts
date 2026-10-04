export declare function ok(result: unknown): {
    content: {
        type: string;
        text: string;
    }[];
};
export declare const variableSchema: {
    type: string;
    items: {
        type: string;
        properties: {
            name: {
                type: string;
                description: string;
            };
            type: {
                type: string;
                enum: string[];
                description: string;
            };
            description: {
                type: string;
            };
            jsonPath: {
                type: string;
                description: string;
            };
            testValue: {
                type: string;
                description: string;
            };
            fallbackValue: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
