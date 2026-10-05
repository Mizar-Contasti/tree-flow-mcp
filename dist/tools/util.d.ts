export declare function ok(result: unknown): {
    content: {
        type: string;
        text: string;
    }[];
};
/**
 * Crea varias piezas independientes en una llamada. Una que falla no detiene a las
 * demás: se informa en su línea y se sigue, para no obligar a repetir las que salieron.
 */
export declare function inBatch<T>(label: string, items: T[], nameOf: (item: T) => string, create: (item: T) => Promise<string>): Promise<string>;
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
