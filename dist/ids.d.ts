export declare const isFullId: (v: unknown) => v is string;
/** El ID corto de un UUID, registrándolo. Si dos UUID empiezan igual, el segundo usa 12. */
export declare function shortId(full: string): string;
/** El UUID de un corto registrado, o undefined si no lo es. */
export declare const lookupShort: (v: unknown) => string | undefined;
/** Sustituye cada UUID de un texto por su ID corto. */
export declare const shortenText: (text: string) => string;
/**
 * Expande los IDs cortos de los argumentos de una herramienta, a cualquier profundidad (también
 * dentro de un config). Un corto registrado se expande donde esté; uno desconocido en un campo
 * de ID es un error, porque el backend lo rechazaría con un mensaje confuso.
 */
export declare function expandIds(value: any, key?: string): any;
/** Sólo para pruebas: empezar con el registro vacío. */
export declare function _resetIds(): void;
