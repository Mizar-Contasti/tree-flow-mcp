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
    const response = await this.client.get('/trees');
    return response.data;
  }

  // El backend no expone GET /trees/{id}: se resuelve desde el listado del workspace.
  async getTree(treeId: string) {
    const trees = await this.listTrees();
    const tree = (trees || []).find((t: any) => t.tree_id === treeId);
    if (!tree) {
      throw new Error(`No existe el árbol ${treeId} en el workspace ${this.workspaceId}.`);
    }
    return tree;
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
    const response = await this.client.post('/trees', data);
    return response.data;
  }

  async updateTree(treeId: string, data: Record<string, any>) {
    const response = await this.client.put(`/trees/${treeId}`, data);
    return response.data;
  }

  // --- 2. BRANCHES (Canvas Flujos) ---
  async listBranches(treeId: string) {
    const response = await this.client.get(`/design/${treeId}/branches`);
    return response.data;
  }

  async createBranch(treeId: string, data: { name: string; description?: string; is_default?: boolean }) {
    const response = await this.client.post(`/design/${treeId}/branches`, data);
    return response.data;
  }

  async getBranch(branchId: string) {
    const response = await this.client.get(`/design/branches/${branchId}`);
    return response.data;
  }

  async updateBranch(branchId: string, data: { name?: string; description?: string; is_default?: boolean }) {
    const response = await this.client.put(`/design/branches/${branchId}`, data);
    return response.data;
  }

  async deleteBranch(branchId: string) {
    const response = await this.client.delete(`/design/branches/${branchId}`);
    return response.data;
  }

  // --- 3. LEAFS (Nodos del Canvas) ---
  // El backend no expone un listado propio: las leaves vienen embebidas en la rama.
  async listLeafs(branchId: string) {
    const branch = await this.getBranch(branchId);
    return branch?.leaves ?? [];
  }

  async createLeaf(
    branchId: string,
    data: { name?: string; type: string; position_x?: number; position_y?: number; config?: any; is_start?: boolean }
  ) {
    const response = await this.client.post(`/design/branches/${branchId}/leaves`, {
      name: data.name || data.type,
      type: data.type,
      position_x: data.position_x ?? 0,
      position_y: data.position_y ?? 0,
      config: data.config ?? {},
      ...(data.is_start !== undefined ? { is_start: data.is_start } : {}),
    });
    return response.data;
  }

  async updateLeaf(
    leafId: string,
    data: { name?: string; type?: string; position_x?: number; position_y?: number; config?: any; is_start?: boolean }
  ) {
    const body: Record<string, any> = {};
    for (const key of ['name', 'type', 'position_x', 'position_y', 'config', 'is_start'] as const) {
      if (data[key] !== undefined) body[key] = data[key];
    }
    const response = await this.client.put(`/design/leaves/${leafId}`, body);
    return response.data;
  }

  async deleteLeaf(leafId: string) {
    const response = await this.client.delete(`/design/leaves/${leafId}`);
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
    const response = await this.client.get(`/design/${treeId}/messages`);
    return response.data;
  }

  async createMessageTemplate(treeId: string, data: { name: string; text?: string; description?: string; responses?: any[] }) {
    const response = await this.client.post(`/design/${treeId}/messages`, data);
    return response.data;
  }

  async updateMessageTemplate(templateId: string, data: { name?: string; text?: string; description?: string; responses?: any[] }) {
    const response = await this.client.put(`/design/messages/${templateId}`, data);
    return response.data;
  }

  async deleteMessageTemplate(templateId: string) {
    const response = await this.client.delete(`/design/messages/${templateId}`);
    return response.data;
  }

  // --- 7. FERTILIZERS / HERRAMIENTAS / KNOWLEDGE BASE ---
  async listFertilizers(treeId: string) {
    const response = await this.client.get(`/api/fertilizers/${treeId}`);
    return response.data;
  }

  // El backend guarda la config completa vía POST (no hay PUT sobre la colección).
  // FertilizerConfig exige tree_id y workspace_id en el cuerpo.
  async updateFertilizerConfig(treeId: string, data: any) {
    const response = await this.client.post(`/api/fertilizers/${treeId}`, {
      ...data,
      tree_id: treeId,
      workspace_id: this.workspaceId,
    });
    return response.data;
  }

  // --- 8. INTEGRACIONES & CANALES (Injertos) ---
  async listIntegrations(treeId: string) {
    const response = await this.client.get(`/bots/${treeId}/injertos`);
    return {
      tree_id: treeId,
      injertos: response.data?.injertos ?? response.data ?? {},
    };
  }

  async configureIntegration(treeId: string, integrationKey: string, enabled: boolean, config?: any) {
    const current = await this.listIntegrations(treeId);
    const injertos = { ...(current.injertos || {}) };
    injertos[integrationKey] = {
      ...(injertos[integrationKey] || {}),
      enabled,
      ...(config ? { config } : {}),
    };
    const response = await this.client.put(`/bots/${treeId}/injertos`, injertos);
    return response.data;
  }

  // --- 9. VOZ (Voice STT/TTS) ---
  async getVoiceConfig(treeId: string) {
    const response = await this.client.get(`/bots/${treeId}/voice-config`);
    return response.data;
  }

  async updateVoiceConfig(treeId: string, data: Record<string, any>) {
    const response = await this.client.put(`/bots/${treeId}/voice-config`, data);
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
    const response = await this.client.get('/api/training-history/', {
      params: { tree_id: treeId, page, page_size: pageSize },
    });
    return response.data;
  }

  // --- 11. CONVERSACIONES & SIMULADOR ---
  async simulateChatMessage(treeId: string, message: string, sessionId?: string) {
    const response = await this.client.post('/message', {
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
    const response = await this.client.get(`/api/trees/${treeId}/history`, {
      params: { limit },
    });
    return response.data;
  }

  // --- 13. BACKUPS & RESTORE ---
  async listBackups(treeId: string) {
    const response = await this.client.get(`/api/backup/trees/${treeId}/backups`);
    return response.data;
  }

  async createBackup(treeId: string, note?: string) {
    const response = await this.client.post(`/api/backup/trees/${treeId}/backups/create`, { note });
    return response.data;
  }

  // --- 14. USUARIOS DEL WORKSPACE ---
  // El workspace sale del API Key: el backend filtra por el del portador.
  async listUsers() {
    const response = await this.client.get('/users/');
    return response.data;
  }

  async createUser(data: { username?: string; email: string; role: string; name?: string }) {
    const response = await this.client.post('/users/', {
      name: data.name || data.username,
      email: data.email,
      role: data.role,
      workspace_id: this.workspaceId,
    });
    return response.data;
  }

  async updateUser(userId: string, data: { role?: string; is_active?: boolean }) {
    const response = await this.client.put(`/users/${userId}`, data);
    return response.data;
  }

  // --- 15. CREDENCIALES ---
  async listCredentials() {
    const response = await this.client.get('/api/credentials/');
    return response.data;
  }
}
