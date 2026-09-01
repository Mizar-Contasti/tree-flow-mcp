import axios, { AxiosInstance } from 'axios';
import { getConfig } from '../config.js';

export class TreeflowClient {
  private client: AxiosInstance;
  public workspaceId: string;

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

  async getTree(treeId: string) {
    const response = await this.client.get(`/trees/${treeId}`);
    return response.data;
  }

  async createTree(data: { name: string; description?: string; purpose?: string; primary_language?: string }) {
    const response = await this.client.post('/trees/', {
      ...data,
      workspace_id: this.workspaceId,
    });
    return response.data;
  }

  async updateTree(treeId: string, data: Record<string, any>) {
    const response = await this.client.put(`/trees/${treeId}`, data);
    return response.data;
  }

  async deleteTree(treeId: string) {
    const response = await this.client.delete(`/trees/${treeId}`);
    return response.data;
  }

  // --- BRANCHES (Ramas del Canvas) ---
  async listBranches(treeId: string) {
    const response = await this.client.get(`/design/trees/${treeId}/branches`);
    return response.data;
  }

  async createBranch(treeId: string, data: { name: string; description?: string; canvas_position?: any }) {
    const response = await this.client.post(`/design/trees/${treeId}/branches`, data);
    return response.data;
  }

  async updateBranch(treeId: string, branchId: string, data: { name?: string; description?: string; canvas_position?: any }) {
    const response = await this.client.put(`/design/trees/${treeId}/branches/${branchId}`, data);
    return response.data;
  }

  async deleteBranch(treeId: string, branchId: string) {
    const response = await this.client.delete(`/design/trees/${treeId}/branches/${branchId}`);
    return response.data;
  }

  // --- LEAFS (Nodos del Canvas) ---
  async listLeafs(branchId: string) {
    const response = await this.client.get(`/design/branches/${branchId}/leafs`);
    return response.data;
  }

  async createLeaf(branchId: string, data: { leaf_type: string; canvas_position?: any; config?: any }) {
    const response = await this.client.post(`/design/branches/${branchId}/leafs`, data);
    return response.data;
  }

  async updateLeaf(leafId: string, data: { leaf_type?: string; canvas_position?: any; config?: any }) {
    const response = await this.client.put(`/design/leafs/${leafId}`, data);
    return response.data;
  }

  async deleteLeaf(leafId: string) {
    const response = await this.client.delete(`/design/leafs/${leafId}`);
    return response.data;
  }

  // --- INTENTS (NLU) ---
  async listIntents(treeId: string) {
    const response = await this.client.get(`/trees/${treeId}/intents`);
    return response.data;
  }

  async createIntent(treeId: string, data: { name: string; patterns: string[]; entities?: any[]; type?: string }) {
    const response = await this.client.post(`/trees/${treeId}/intents`, data);
    return response.data;
  }

  async updateIntent(treeId: string, intentId: string, data: { name?: string; patterns?: string[]; entities?: any[]; type?: string }) {
    const response = await this.client.put(`/trees/${treeId}/intents/${intentId}`, data);
    return response.data;
  }

  async deleteIntent(treeId: string, intentId: string) {
    const response = await this.client.delete(`/trees/${treeId}/intents/${intentId}`);
    return response.data;
  }

  // --- ENTITIES (NLU) ---
  async listEntities(treeId: string) {
    const response = await this.client.get(`/trees/${treeId}/entities`);
    return response.data;
  }

  async createEntity(treeId: string, data: { name: string; values: Array<{ value: string; synonyms: string[] }> }) {
    const response = await this.client.post(`/trees/${treeId}/entities`, data);
    return response.data;
  }

  async updateEntity(treeId: string, entityId: string, data: { name?: string; values?: Array<{ value: string; synonyms: string[] }> }) {
    const response = await this.client.put(`/trees/${treeId}/entities/${entityId}`, data);
    return response.data;
  }

  async deleteEntity(treeId: string, entityId: string) {
    const response = await this.client.delete(`/trees/${treeId}/entities/${entityId}`);
    return response.data;
  }

  // --- MESSAGE TEMPLATES ---
  async listMessageTemplates(treeId: string) {
    const response = await this.client.get(`/design/trees/${treeId}/templates`);
    return response.data;
  }

  async createMessageTemplate(treeId: string, data: { name: string; template: string; variations?: string[] }) {
    const response = await this.client.post(`/design/trees/${treeId}/templates`, data);
    return response.data;
  }

  async updateMessageTemplate(templateId: string, data: { name?: string; template?: string; variations?: string[] }) {
    const response = await this.client.put(`/design/templates/${templateId}`, data);
    return response.data;
  }

  async deleteMessageTemplate(templateId: string) {
    const response = await this.client.delete(`/design/templates/${templateId}`);
    return response.data;
  }

  // --- TRAINING ---
  async triggerTraining(treeId: string) {
    const response = await this.client.post(`/train/${treeId}`);
    return response.data;
  }

  async getTrainingStatus(treeId: string) {
    const response = await this.client.get(`/train/status/${treeId}`);
    return response.data;
  }

  // --- CONVERSATION / SIMULATION ---
  async simulateChatMessage(treeId: string, message: string, sessionId?: string) {
    const response = await this.client.post('/api/message', {
      tree_id: treeId,
      message,
      session_id: sessionId || `mcp_sim_${Date.now()}`,
    });
    return response.data;
  }

  async listConversations(treeId: string) {
    const response = await this.client.get(`/api/trees/${treeId}/conversations`);
    return response.data;
  }
}
