export interface TreeflowConfig {
    baseUrl: string;
    apiKey: string;
    workspaceId: string;
}
export declare function getConfig(): TreeflowConfig;
