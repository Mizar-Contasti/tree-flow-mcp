/** Combina un config por claves de primer nivel: lo enviado pisa lo guardado y null lo quita. */
export declare function mergeConfig(current: Record<string, any>, patch: Record<string, any>): Record<string, any>;
/** Aplica altas y bajas a una lista de textos sin duplicar ni tocar el resto. */
export declare function editList(current: string[], add?: string[], remove?: string[]): string[];
export interface ToolVariableInput {
    name: string;
    type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description?: string;
    jsonPath?: string;
    testValue?: string;
    fallbackValue?: string;
}
export interface ToolInput {
    name?: string;
    description?: string;
    url?: string;
    method?: 'POST' | 'GET' | 'PATCH' | 'DELETE' | 'PUT' | 'QUERY';
    timeout?: number;
    body?: string;
    authType?: 'none' | 'basic' | 'bearer' | 'apiKey';
    authConfig?: Record<string, any>;
    inputVariables?: ToolVariableInput[];
    outputVariables?: ToolVariableInput[];
    enabled?: boolean;
    errorMessage?: Record<string, string>;
}
export interface ScriptInput {
    name?: string;
    description?: string;
    language?: 'python' | 'node' | 'javascript';
    code?: string;
    timeout?: number;
    inputVariables?: ToolVariableInput[];
    outputVariables?: ToolVariableInput[];
    enabled?: boolean;
    errorMessage?: Record<string, string>;
}
export declare const MASK = "***";
export declare function maskSecrets<T>(value: T): T;
export declare function maskUrl(url: string): string;
/** Devuelve a la URL nueva los secretos que llegaron enmascarados, tomándolos de la guardada. */
export declare function unmaskUrl(next: string, saved: string | undefined): string;
/** Quita los valores enmascarados de un parche: un *** que vuelve del modelo no es un dato nuevo. */
export declare function withoutMasked<T extends Record<string, any>>(patch: T): Partial<T>;
export declare class TreeflowClient {
    private client;
    workspaceId: string;
    constructor();
    listTrees(): Promise<any>;
    private treesCache?;
    resolveTreeId(ref: string): Promise<string>;
    getTree(treeId: string): Promise<any>;
    getTreeData(treeId: string): Promise<{
        tree: any;
        branches: any;
        intents: any;
        entities: any;
        templates: any;
    }>;
    createTree(data: {
        name: string;
        description?: string;
        purpose?: string;
        primary_language?: string;
    }): Promise<any>;
    updateTree(treeId: string, data: Record<string, any>): Promise<any>;
    listBranches(treeId: string): Promise<any>;
    createBranch(treeId: string, data: {
        name: string;
        description?: string;
        is_default?: boolean;
    }): Promise<any>;
    getBranch(branchId: string): Promise<any>;
    updateBranch(branchId: string, data: {
        name?: string;
        description?: string;
        is_default?: boolean;
    }): Promise<any>;
    deleteBranch(branchId: string): Promise<any>;
    listLeafs(branchId: string): Promise<any>;
    createLeaf(branchId: string, data: {
        id?: string;
        name?: string;
        type: string;
        position_x?: number;
        position_y?: number;
        config?: any;
        is_start?: boolean;
    }): Promise<any>;
    findLeaf(leafId: string, where: {
        branchId?: string;
        treeId?: string;
    }): Promise<any>;
    updateLeaf(leafId: string, data: {
        name?: string;
        type?: string;
        position_x?: number;
        position_y?: number;
        config?: any;
        is_start?: boolean;
    }, options?: {
        branchId?: string;
        treeId?: string;
        replaceConfig?: boolean;
    }): Promise<any>;
    deleteLeaf(leafId: string): Promise<any>;
    listIntents(treeId: string): Promise<any>;
    createIntent(treeId: string, data: {
        name: string;
        patterns: string[];
        entities?: any[];
        type?: string;
    }): Promise<any>;
    getIntent(treeId: string, intentId: string): Promise<any>;
    updateIntent(treeId: string, intentId: string, data: {
        name?: string;
        patterns?: string[];
        entities?: any[];
        type?: string;
        add_patterns?: string[];
        remove_patterns?: string[];
    }): Promise<any>;
    deleteIntent(treeId: string, intentId: string): Promise<any>;
    listEntities(treeId: string): Promise<any>;
    createEntity(treeId: string, data: {
        name: string;
        type?: string;
        values?: any[];
        pattern?: string;
    }): Promise<any>;
    getEntity(treeId: string, entityId: string): Promise<any>;
    updateEntity(treeId: string, entityId: string, data: {
        name?: string;
        type?: string;
        values?: any[];
        pattern?: string;
        add_values?: any[];
        remove_values?: string[];
    }): Promise<any>;
    deleteEntity(treeId: string, entityId: string): Promise<any>;
    listMessageTemplates(treeId: string): Promise<any>;
    createMessageTemplate(treeId: string, data: {
        name: string;
        text?: string;
        description?: string;
        responses?: any[];
    }): Promise<any>;
    updateMessageTemplate(templateId: string, data: {
        name?: string;
        text?: string;
        description?: string;
        responses?: any[];
    }): Promise<any>;
    deleteMessageTemplate(templateId: string): Promise<any>;
    listFertilizers(treeId: string): Promise<any>;
    updateFertilizerConfig(treeId: string, data: any): Promise<any>;
    private loadFertilizerConfig;
    private saveFertilizerConfig;
    private pickById;
    createTool(treeId: string, input: ToolInput & {
        name: string;
        url: string;
    }): Promise<any>;
    updateTool(treeId: string, toolId: string, patch: ToolInput & {
        status?: string;
    }): Promise<any>;
    deleteTool(treeId: string, toolId: string): Promise<{
        deleted: any;
        name: any;
    }>;
    /** Prueba la herramienta guardada con el mismo ejecutor que usa la conversación. */
    testTool(treeId: string, toolId: string, testValues?: Record<string, string>): Promise<any>;
    createScript(treeId: string, input: ScriptInput & {
        name: string;
        code: string;
    }): Promise<any>;
    updateScript(treeId: string, scriptId: string, patch: ScriptInput & {
        status?: string;
    }): Promise<any>;
    deleteScript(treeId: string, scriptId: string): Promise<{
        deleted: any;
        name: any;
    }>;
    /** Ejecuta el script guardado en caliente. */
    testScript(treeId: string, scriptId: string, testValues?: Record<string, string>): Promise<any>;
    listToolLogs(treeId: string, params?: {
        limit?: number;
        offset?: number;
        success?: boolean;
        tool_name?: string;
        search?: string;
        date_from?: string;
        date_to?: string;
    }): Promise<any>;
    listCaptures(treeId: string): Promise<any>;
    getCapture(treeId: string, ref: string): Promise<any>;
    createCapture(treeId: string, data: Record<string, any>): Promise<any>;
    updateCapture(treeId: string, ref: string, patch: Record<string, any>): Promise<any>;
    deleteCapture(treeId: string, ref: string): Promise<any>;
    listTransfers(treeId: string): Promise<any>;
    createTransfer(treeId: string, data: Record<string, any>): Promise<any>;
    updateTransfer(treeId: string, configId: string, patch: Record<string, any>): Promise<any>;
    deleteTransfer(treeId: string, configId: string): Promise<any>;
    testTransfer(treeId: string, configId: string, data?: Record<string, any>): Promise<any>;
    getLiveChatQueue(treeId?: string): Promise<any>;
    getLiveChatHistory(params?: {
        tree_id?: string;
        desde?: string;
        hasta?: string;
        estado?: string;
        q?: string;
        limit?: number;
        offset?: number;
    }): Promise<any>;
    getLiveChatSession(sessionId: string): Promise<any>;
    listTestSuites(treeId: string): Promise<any>;
    createTestSuite(treeId: string, data: {
        name: string;
        description?: string;
        cases?: any[];
    }): Promise<any>;
    getTestSuite(suiteId: string): Promise<any>;
    updateTestSuite(suiteId: string, data: {
        name?: string;
        description?: string;
        cases?: any[];
    }): Promise<any>;
    deleteTestSuite(suiteId: string): Promise<any>;
    importTestSuiteCsv(suiteId: string, csv: string, modo?: 'reemplazar' | 'agregar'): Promise<any>;
    exportTestSuiteCsv(suiteId: string): Promise<string>;
    runTestSuite(suiteId: string): Promise<any>;
    listTestRuns(suiteId: string, limit?: number): Promise<any>;
    getTestRun(runId: string): Promise<any>;
    compareTestRuns(runId: string, otherRunId: string): Promise<any>;
    getConversationAnalytics(treeId: string, params?: {
        start_date?: number;
        end_date?: number;
        intent?: string;
        branch?: string;
        include_console?: boolean;
        max_depth?: number;
    }): Promise<any>;
    exportTree(treeId: string, includeConversations?: boolean): Promise<any>;
    /** Crea un árbol NUEVO a partir de un export; no toca el existente. */
    importTree(backup: Record<string, any>, options?: Record<string, any>): Promise<any>;
    restoreSnapshot(treeId: string, snapshotId: string): Promise<any>;
    listIntegrations(treeId: string): Promise<{
        tree_id: string;
        injertos: any;
    }>;
    configureIntegration(treeId: string, integrationKey: string, enabled: boolean, config?: any): Promise<any>;
    getVoiceConfig(treeId: string): Promise<any>;
    updateVoiceConfig(treeId: string, data: Record<string, any>): Promise<any>;
    triggerTraining(treeId: string, force?: boolean): Promise<any>;
    /**
     * Entrena y espera a que termine, para que el modelo no tenga que consultar el estado
     * una y otra vez (cada consulta es otra llamada que reenvía toda la conversación).
     */
    trainAndWait(treeId: string, options?: {
        force?: boolean;
        timeoutMs?: number;
        pollMs?: number;
    }): Promise<{
        outcome: "skipped";
        queued: any;
        status: any;
        last?: undefined;
        seconds?: undefined;
    } | {
        outcome: "running" | "finished";
        queued: any;
        status: any;
        last: any;
        seconds: number;
    }>;
    getTrainingStatus(treeId: string): Promise<any>;
    listTrainingHistory(treeId: string, page?: number, pageSize?: number): Promise<any>;
    simulateChatMessage(treeId: string, message: string, sessionId?: string): Promise<any>;
    listConversations(treeId: string, params?: {
        limit?: number;
        offset?: number;
        intent?: string;
        message?: string;
        start_date?: number;
        end_date?: number;
    }): Promise<any>;
    getConversation(treeId: string, sessionId: string): Promise<any>;
    listChangeHistory(treeId: string, params?: {
        limit?: number;
        offset?: number;
        entity_type?: string;
        action?: string;
    }): Promise<any>;
    listBackups(treeId: string): Promise<any>;
    createBackup(treeId: string, note?: string): Promise<any>;
    listUsers(): Promise<any>;
    createUser(data: {
        username?: string;
        email: string;
        role: string;
        name?: string;
    }): Promise<any>;
    updateUser(userId: string, data: {
        role?: string;
        is_active?: boolean;
    }): Promise<any>;
    listCredentials(): Promise<any>;
}
