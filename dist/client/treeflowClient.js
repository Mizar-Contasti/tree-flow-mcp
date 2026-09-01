import axios from 'axios';
import { getConfig } from '../config.js';
export class TreeflowClient {
    client;
    workspaceId;
    constructor() {
        const config = getConfig();
        this.workspaceId = config.workspaceId;
        this.client = axios.create({
            baseURL: config.baseUrl,
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'X-API-Key': config.apiKey,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
    }
    // --- TREES / BOTS ---
    async listTrees() {
        const response = await this.client.get('/trees/');
        return response.data;
    }
    async getTree(treeId) {
        const response = await this.client.get(`/trees/${treeId}`);
        return response.data;
    }
    async createTree(data) {
        const response = await this.client.post('/trees/', {
            ...data,
            workspace_id: this.workspaceId,
        });
        return response.data;
    }
    async updateTree(treeId, data) {
        const response = await this.client.put(`/trees/${treeId}`, data);
        return response.data;
    }
    async deleteTree(treeId) {
        const response = await this.client.delete(`/trees/${treeId}`);
        return response.data;
    }
    // --- BRANCHES (Ramas del Canvas) ---
    async listBranches(treeId) {
        const response = await this.client.get(`/design/trees/${treeId}/branches`);
        return response.data;
    }
    async createBranch(treeId, data) {
        const response = await this.client.post(`/design/trees/${treeId}/branches`, data);
        return response.data;
    }
    async updateBranch(treeId, branchId, data) {
        const response = await this.client.put(`/design/trees/${treeId}/branches/${branchId}`, data);
        return response.data;
    }
    async deleteBranch(treeId, branchId) {
        const response = await this.client.delete(`/design/trees/${treeId}/branches/${branchId}`);
        return response.data;
    }
    // --- LEAFS (Nodos del Canvas) ---
    async listLeafs(branchId) {
        const response = await this.client.get(`/design/branches/${branchId}/leafs`);
        return response.data;
    }
    async createLeaf(branchId, data) {
        const response = await this.client.post(`/design/branches/${branchId}/leafs`, data);
        return response.data;
    }
    async updateLeaf(leafId, data) {
        const response = await this.client.put(`/design/leafs/${leafId}`, data);
        return response.data;
    }
    async deleteLeaf(leafId) {
        const response = await this.client.delete(`/design/leafs/${leafId}`);
        return response.data;
    }
    // --- INTENTS (NLU) ---
    async listIntents(treeId) {
        const response = await this.client.get(`/trees/${treeId}/intents`);
        return response.data;
    }
    async createIntent(treeId, data) {
        const response = await this.client.post(`/trees/${treeId}/intents`, data);
        return response.data;
    }
    async updateIntent(treeId, intentId, data) {
        const response = await this.client.put(`/trees/${treeId}/intents/${intentId}`, data);
        return response.data;
    }
    async deleteIntent(treeId, intentId) {
        const response = await this.client.delete(`/trees/${treeId}/intents/${intentId}`);
        return response.data;
    }
    // --- ENTITIES (NLU) ---
    async listEntities(treeId) {
        const response = await this.client.get(`/trees/${treeId}/entities`);
        return response.data;
    }
    async createEntity(treeId, data) {
        const response = await this.client.post(`/trees/${treeId}/entities`, data);
        return response.data;
    }
    async updateEntity(treeId, entityId, data) {
        const response = await this.client.put(`/trees/${treeId}/entities/${entityId}`, data);
        return response.data;
    }
    async deleteEntity(treeId, entityId) {
        const response = await this.client.delete(`/trees/${treeId}/entities/${entityId}`);
        return response.data;
    }
    // --- MESSAGE TEMPLATES ---
    async listMessageTemplates(treeId) {
        const response = await this.client.get(`/design/trees/${treeId}/templates`);
        return response.data;
    }
    async createMessageTemplate(treeId, data) {
        const response = await this.client.post(`/design/trees/${treeId}/templates`, data);
        return response.data;
    }
    async updateMessageTemplate(templateId, data) {
        const response = await this.client.put(`/design/templates/${templateId}`, data);
        return response.data;
    }
    async deleteMessageTemplate(templateId) {
        const response = await this.client.delete(`/design/templates/${templateId}`);
        return response.data;
    }
    // --- TRAINING ---
    async triggerTraining(treeId) {
        const response = await this.client.post(`/train/${treeId}`);
        return response.data;
    }
    async getTrainingStatus(treeId) {
        const response = await this.client.get(`/train/status/${treeId}`);
        return response.data;
    }
    // --- CONVERSATION / SIMULATION ---
    async simulateChatMessage(treeId, message, sessionId) {
        const response = await this.client.post('/api/message', {
            tree_id: treeId,
            message,
            session_id: sessionId || `mcp_sim_${Date.now()}`,
        });
        return response.data;
    }
    async listConversations(treeId) {
        const response = await this.client.get(`/api/trees/${treeId}/conversations`);
        return response.data;
    }
}
//# sourceMappingURL=treeflowClient.js.map