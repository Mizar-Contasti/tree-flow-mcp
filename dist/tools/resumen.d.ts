export declare const DETAIL_HINT = "Detalle completo de una pieza: treeflow_get_detail(tree_id, tipo, ref).";
/** Texto en una sola línea, recortado a `max` caracteres. */
export declare function clip(value: unknown, max?: number): string;
export interface CanvasNames {
    leaves: Map<string, string>;
    templates: Map<string, string>;
}
export declare function canvasNames(branches: any[], templates?: any[]): CanvasNames;
/** Una hoja en una línea: qué es, qué dice, qué escucha y a dónde va. */
export declare function leafLine(leaf: any, names: CanvasNames): string;
export declare function branchLine(branch: any, names?: CanvasNames): string;
export declare function branchOutline(branch: any, names: CanvasNames): string;
/** Lista de ramas sin sus hojas (las hojas sólo se cuentan). */
export declare function branchesSummary(branches: any[]): string;
export declare function intentLine(intent: any): string;
export declare function intentsSummary(intents: any[]): string;
export declare function entityLine(entity: any): string;
export declare function entitiesSummary(entities: any[]): string;
export declare function templateLine(template: any): string;
export declare function templatesSummary(templates: any[]): string;
export declare function treeHeader(tree: any): string;
export declare function treeOutline(data: {
    tree: any;
    branches: any[];
    intents: any[];
    entities: any[];
    templates: any[];
}): string;
export declare const toolLine: (t: any) => string;
export declare const scriptLine: (s: any) => string;
export declare function fertilizersSummary(config: any): string;
/** Un turno simulado: qué contestó el bot, por qué, dónde quedó y cómo seguir. */
export declare function simulationSummary(r: any): string;
export declare function conversationsList(convs: any[]): string;
export declare function conversationSummary(conv: any): string;
export declare function suiteLine(suite: any): string;
/** Totales y sólo lo que falló: lo que pasó no hace falta leerlo. */
export declare function testRunSummary(run: any): string;
/** Campos de primer nivel que cambiaron entre `before` y `after`. */
export declare function changedFields(changes: any): string[];
export declare function changeLine(entry: any): string;
export declare function changeHistorySummary(entries: any[]): string;
export declare function trainingLine(item: any): string;
export declare function trainingHistorySummary(page: any): string;
export declare function toolLogLine(log: any): string;
export declare function toolLogsSummary(page: any): string;
/** Quita lo que no sirve para entender ni para editar: fechas, IDs de contexto y nulos. */
export declare function withoutNoise<T extends Record<string, any>>(obj: T): Partial<T>;
