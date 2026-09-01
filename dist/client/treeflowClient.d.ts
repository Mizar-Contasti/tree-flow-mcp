export declare class TreeflowClient {
    private client;
    workspaceId: string;
    constructor();
    listTrees(): Promise<any>;
    getTree(treeId: string): Promise<any>;
    createTree(data: {
        name: string;
        description?: string;
        purpose?: string;
        primary_language?: string;
    }): Promise<any>;
    updateTree(treeId: string, data: Record<string, any>): Promise<any>;
    deleteTree(treeId: string): Promise<any>;
    listBranches(treeId: string): Promise<any>;
    createBranch(treeId: string, data: {
        name: string;
        description?: string;
        canvas_position?: any;
    }): Promise<any>;
    updateBranch(treeId: string, branchId: string, data: {
        name?: string;
        description?: string;
        canvas_position?: any;
    }): Promise<any>;
    deleteBranch(treeId: string, branchId: string): Promise<any>;
    listLeafs(branchId: string): Promise<any>;
    createLeaf(branchId: string, data: {
        leaf_type: string;
        canvas_position?: any;
        config?: any;
    }): Promise<any>;
    updateLeaf(leafId: string, data: {
        leaf_type?: string;
        canvas_position?: any;
        config?: any;
    }): Promise<any>;
    deleteLeaf(leafId: string): Promise<any>;
    listIntents(treeId: string): Promise<any>;
    createIntent(treeId: string, data: {
        name: string;
        patterns: string[];
        entities?: any[];
        type?: string;
    }): Promise<any>;
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
        values: Array<{
            value: string;
            synonyms: string[];
        }>;
    }): Promise<any>;
    updateEntity(treeId: string, entityId: string, data: {
        name?: string;
        values?: Array<{
            value: string;
            synonyms: string[];
        }>;
    }): Promise<any>;
    deleteEntity(treeId: string, entityId: string): Promise<any>;
    listMessageTemplates(treeId: string): Promise<any>;
    createMessageTemplate(treeId: string, data: {
        name: string;
        template: string;
        variations?: string[];
    }): Promise<any>;
    updateMessageTemplate(templateId: string, data: {
        name?: string;
        template?: string;
        variations?: string[];
    }): Promise<any>;
    deleteMessageTemplate(templateId: string): Promise<any>;
    triggerTraining(treeId: string): Promise<any>;
    getTrainingStatus(treeId: string): Promise<any>;
    simulateChatMessage(treeId: string, message: string, sessionId?: string): Promise<any>;
    listConversations(treeId: string): Promise<any>;
}
