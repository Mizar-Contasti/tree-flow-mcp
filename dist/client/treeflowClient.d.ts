export declare class TreeflowClient {
    private client;
    workspaceId: string;
    constructor();
    listTrees(): Promise<any>;
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
        name?: string;
        type: string;
        position_x?: number;
        position_y?: number;
        config?: any;
        is_start?: boolean;
    }): Promise<any>;
    updateLeaf(leafId: string, data: {
        name?: string;
        type?: string;
        position_x?: number;
        position_y?: number;
        config?: any;
        is_start?: boolean;
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
    listIntegrations(treeId: string): Promise<{
        tree_id: string;
        injertos: any;
    }>;
    configureIntegration(treeId: string, integrationKey: string, enabled: boolean, config?: any): Promise<any>;
    getVoiceConfig(treeId: string): Promise<any>;
    updateVoiceConfig(treeId: string, data: Record<string, any>): Promise<any>;
    triggerTraining(treeId: string): Promise<any>;
    getTrainingStatus(treeId: string): Promise<any>;
    listTrainingHistory(treeId: string, page?: number, pageSize?: number): Promise<any>;
    simulateChatMessage(treeId: string, message: string, sessionId?: string): Promise<any>;
    listConversations(treeId: string): Promise<any>;
    getConversation(treeId: string, sessionId: string): Promise<any>;
    listChangeHistory(treeId: string, limit?: number): Promise<any>;
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
