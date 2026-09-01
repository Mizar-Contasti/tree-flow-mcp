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
      timeout: 45000,
    });
  }

  // --- 1. TREES / BOTS ---
  async listTrees() {
    const response = await this.client.get('/trees/');
    return response.data;
  }

  async getTree(treeId: string) {
    const response = await this.client.get(`/trees/${treeId}`);
    return response.data;
  }

  async getTreeData(treeId: string) {
    const [tree, branches, intents, entities, templates] = await Promise.all([
      this.getTree(treeId),
      this.listBranches(treeId).catch(() => []),
      this.listIntents(treeId).catch(() => []),
      this.listEntities(treeId).catch(() => []),
      this.listMessageTemplates(treeId).catch(() => []),
    ]);
    return {
      tree,
      branches,
      intents,
      entities,
      templates,
    };
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

  // --- 2. BRANCHES (Canvas Flujos) ---
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

  // --- 3. LEAFS (Nodos del Canvas) ---
  async listLeafs(branchId: string) {
    const response = await this.client.get(`/design/branches/${branchId}/leafs`);
    return response.data;
  }

  async createLeaf(branchId: string, data: { name?: string; leaf_type: string; canvas_position?: any; config?: any; is_start?: boolean }) {
    const response = await this.client.post(`/design/branches/${branchId}/leafs`, data);
    return response.data;
  }

  async updateLeaf(leafId: string, data: { name?: string; leaf_type?: string; canvas_position?: any; config?: any; is_start?: boolean }) {
    const response = await this.client.put(`/design/leafs/${leafId}`, data);
    return response.data;
  }

  async deleteLeaf(leafId: string) {
    const response = await this.client.delete(`/design/leafs/${leafId}`);
    return response.data;
  }

  // --- 4. INTENTS (NLU) ---
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

  // --- 5. ENTITIES (NLU) ---
  async listEntities(treeId: string) {
    const response = await this.client.get(`/trees/${treeId}/entities`);
    return response.data;
  }

  async createEntity(treeId: string, data: { name: string; type?: string; values?: any[]; pattern?: string }) {
    const response = await this.client.post(`/trees/${treeId}/entities`, data);
    return response.data;
  }

  async updateEntity(treeId: string, entityId: string, data: { name?: string; type?: string; values?: any[]; pattern?: string }) {
    const response = await this.client.put(`/trees/${treeId}/entities/${entityId}`, data);
    return response.data;
  }

  async deleteEntity(treeId: string, entityId: string) {
    const response = await this.client.delete(`/trees/${treeId}/entities/${entityId}`);
    return response.data;
  }

  // --- 6. MESSAGE TEMPLATES ---
  async listMessageTemplates(treeId: string) {
    const response = await this.client.get(`/design/trees/${treeId}/templates`);
    return response.data;
  }

  async createMessageTemplate(treeId: string, data: { name: string; text?: string; description?: string; responses?: any[] }) {
    const response = await this.client.post(`/design/trees/${treeId}/templates`, data);
    return response.data;
  }

  async updateMessageTemplate(templateId: string, data: { name?: string; text?: string; description?: string; responses?: any[] }) {
    const response = await this.client.put(`/design/templates/${templateId}`, data);
    return response.data;
  }

  async deleteMessageTemplate(templateId: string) {
    const response = await this.client.delete(`/design/templates/${templateId}`);
    return response.data;
  }

  // --- 7. FERTILIZERS / HERRAMIENTAS / KNOWLEDGE BASE ---
  async listFertilizers(treeId: string) {
    const response = await this.client.get(`/api/fertilizers/${treeId}`);
    return response.data;
  }

  async updateFertilizerConfig(treeId: string, data: any) {
    const response = await this.client.put(`/api/fertilizers/${treeId}`, data);
    return response.data;
  }

  // --- 8. INTEGRACIONES & CANALES (Injertos) ---
  async listIntegrations(treeId: string) {
    const tree = await this.getTree(treeId);
    return {
      tree_id: treeId,
      injertos: tree.injertos || {},
    };
  }

  async configureIntegration(treeId: string, integrationKey: string, enabled: boolean, config?: any) {
    const tree = await this.getTree(treeId);
    const injertos = { ...(tree.injertos || {}) };
    injertos[integrationKey] = {
      ...(injertos[integrationKey] || {}),
      enabled,
      ...(config ? { config } : {}),
    };
    return await this.updateTree(treeId, { injertos });
  }

  // --- 9. VOZ (Voice STT/TTS) ---
  async getVoiceConfig(treeId: string) {
    const response = await this.client.get(`/api/voice/config/${treeId}`);
    return response.data;
  }

  async updateVoiceConfig(treeId: string, data: Record<string, any>) {
    const response = await this.client.post(`/api/voice/config/${treeId}`, data);
    return response.data;
  }

  // --- 10. ENTRENAMIENTO & HISTORIAL ML ---
  async triggerTraining(treeId: string) {
    const response = await this.client.post(`/train/${treeId}`);
    return response.data;
  }

  async getTrainingStatus(treeId: string) {
    const response = await this.client.get(`/train/status/${treeId}`);
    return response.data;
  }

  async listTrainingHistory(treeId: string, page = 1, pageSize = 10) {
    const response = await this.client.get(`/api/training-history/${treeId}`, {
      params: { page, page_size: pageSize },
    });
    return response.data;
  }

  // --- 11. CONVERSACIONES & SIMULADOR ---
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

  async getConversation(treeId: string, sessionId: string) {
    const response = await this.client.get(`/api/trees/${treeId}/conversations/${sessionId}`);
    return response.data;
  }

  // --- 12. AUDITORÍA & CAMBIOS ---
  async listChangeHistory(treeId: string, limit = 50) {
    const response = await this.client.get(`/api/change-history/${treeId}`, {
      params: { limit },
    });
    return response.data;
  }

  // --- 13. BACKUPS & RESTORE ---
  async listBackups(treeId: string) {
    const response = await this.client.get(`/api/backup/${treeId}`);
    return response.data;
  }

  async createBackup(treeId: string, note?: string) {
    const response = await this.client.post(`/api/backup/${treeId}`, { note });
    return response.data;
  }

  // --- 14. USUARIOS DEL WORKSPACE ---
  async listUsers() {
    const response = await this.client.get(`/users/${this.workspaceId}`);
    return response.data;
  }

  async createUser(data: { username: string; email: string; role: string; name?: string }) {
    const response = await this.client.post(`/users/${this.workspaceId}`, data);
    return response.data;
  }

  async updateUser(userId: string, data: { role?: string; is_active?: boolean }) {
    const response = await this.client.put(`/users/${userId}`, data);
    return response.data;
  }

  async deleteUser(userId: string) {
    const response = await this.client.delete(`/users/${userId}`);
    return response.data;
  }

  // --- 15. CREDENCIALES ---
  async listCredentials() {
    const response = await this.client.get('/api/credentials/');
    return response.data;
  }
}
