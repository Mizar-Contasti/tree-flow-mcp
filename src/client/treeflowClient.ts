import axios, { AxiosInstance } from 'axios';
import { randomUUID } from 'node:crypto';
import { getConfig } from '../config.js';

// Descarta las claves sin valor para no pisar el estado actual con undefined.
function pickDefined<T extends Record<string, any>>(data: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

/** Combina un config por claves de primer nivel: lo enviado pisa lo guardado y null lo quita. */
export function mergeConfig(current: Record<string, any>, patch: Record<string, any>) {
  const out: Record<string, any> = { ...current };
  for (const [k, v] of Object.entries(patch ?? {})) {
    if (v === null) delete out[k];
    else out[k] = v;
  }
  return out;
}

/** Aplica altas y bajas a una lista de textos sin duplicar ni tocar el resto. */
export function editList(current: string[], add: string[] = [], remove: string[] = []) {
  const drop = new Set(remove.map((s) => s.trim()));
  const out = current.filter((s) => !drop.has(s.trim()));
  for (const s of add) if (!out.some((x) => x.trim() === s.trim())) out.push(s);
  return out;
}

// El backend valida los valores de entidad como { key, synonyms }.
// Se acepta `value` como alias de `key` por comodidad al dictarlos.
function normalizeEntityValues(values?: any[]) {
  return (values || []).map((v) => ({
    key: v?.key ?? v?.value ?? '',
    synonyms: v?.synonyms ?? [],
    ...(v?.entity ? { entity: v.entity } : {}),
  }));
}


// ── Herramientas (APIs) y scripts ─────────────────────────────────────────
// La app guarda cada herramienta con campos planos (url, method, body, authType,
// authConfig, inputVariables…), no como { type, config }. Una herramienta con otra
// forma aparece en la lista pero el motor no sabe ejecutarla.

export interface ToolVariableInput {
  name: string;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  jsonPath?: string;
  testValue?: string;
  fallbackValue?: string;
}

function toVariables(vars?: ToolVariableInput[]) {
  return (vars || []).map((v) => ({
    id: randomUUID(),
    name: v.name,
    type: v.type ?? 'string',
    description: v.description ?? '',
    jsonPath: v.jsonPath ?? '',
    ...(v.testValue !== undefined ? { testValue: v.testValue } : {}),
    ...(v.fallbackValue !== undefined ? { fallbackValue: v.fallbackValue } : {}),
  }));
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

// Oculta secretos en lo que se devuelve al modelo. Los valores reales siguen en el
// servidor y las actualizaciones los conservan: se parte siempre de la config guardada.
export const MASK = '***';
export function maskSecrets<T>(value: T): T {
  const secretKeys = new Set(['password', 'token', 'secretPhrase', 'auth_token', 'api_key', 'apiKey']);
  const walk = (v: any, key?: string): any => {
    if (Array.isArray(v)) return v.map((x) => walk(x));
    if (v && typeof v === 'object') {
      const out: Record<string, any> = {};
      for (const [k, x] of Object.entries(v)) out[k] = walk(x, k);
      // authConfig.value guarda la clave de una API de tipo apiKey
      if ('key' in out && 'value' in out && (v as any).value) out.value = MASK;
      return out;
    }
    if (key && secretKeys.has(key) && typeof v === 'string' && v) return MASK;
    if (key && /url$/i.test(key) && typeof v === 'string') return maskUrl(v);
    return v;
  };
  return walk(value);
}

// Una clave también puede ir en la URL (?key=…, &access_token=…). Se reconoce por el
// nombre del parámetro; un valor con { $variable } no es un secreto sino una plantilla.
const SECRET_PARAM = /(^|[^a-z])(api_?key|key|token|access_?token|secret|password|passwd|pwd|signature|sig|auth|credentials?)$/i;
const QUERY_PARAM = /([?&])([^=&#]+)=([^&#]*)/g;

export function maskUrl(url: string): string {
  return url.replace(QUERY_PARAM, (m, sep, name, value) =>
    value && value !== MASK && SECRET_PARAM.test(name) && !value.includes('{') ? `${sep}${name}=${MASK}` : m
  );
}

/** Devuelve a la URL nueva los secretos que llegaron enmascarados, tomándolos de la guardada. */
export function unmaskUrl(next: string, saved: string | undefined): string {
  const old = new Map<string, string>();
  for (const [, , name, value] of (saved ?? '').matchAll(QUERY_PARAM)) old.set(name, value);
  return next.replace(QUERY_PARAM, (m, sep, name, value) =>
    value === MASK && old.has(name) ? `${sep}${name}=${old.get(name)}` : m
  );
}

/** Quita los valores enmascarados de un parche: un *** que vuelve del modelo no es un dato nuevo. */
export function withoutMasked<T extends Record<string, any>>(patch: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(patch ?? {})) if (v !== MASK) out[k] = v;
  return out as Partial<T>;
}

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

  // El modelo suele conocer el bot por su nombre: aceptarlo ahorra la vuelta de
  // treeflow_list_trees sólo para traducirlo. El listado se recuerda un minuto.
  private treesCache?: { at: number; trees: any[] };

  async resolveTreeId(ref: string): Promise<string> {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref)) return ref;
    if (!this.treesCache || Date.now() - this.treesCache.at > 60_000) {
      this.treesCache = { at: Date.now(), trees: await this.listTrees() };
    }
    const wanted = ref.trim().toLowerCase();
    // Un ID corto (8 o 12 hexadecimales) se busca como prefijo del ID; lo demás, como nombre.
    const byPrefix = /^[0-9a-f]{8}([0-9a-f]{4})?$/.test(wanted);
    const matches = this.treesCache.trees.filter((t: any) =>
      byPrefix ? String(t.tree_id).replace(/-/g, '').startsWith(wanted) : String(t.name).trim().toLowerCase() === wanted
    );
    if (matches.length === 1) return matches[0].tree_id;
    if (matches.length > 1) throw new Error(`Hay ${matches.length} bots llamados "${ref}": usa su ID.`);
    this.treesCache = undefined; // quizá es nuevo: la próxima vez se vuelve a listar
    throw new Error(`No existe un bot llamado "${ref}" en el workspace. treeflow_list_trees muestra los que hay.`);
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

  // Con `id` la hoja nace con ese UUID: permite enlazar hojas nuevas entre sí antes de crearlas.
  async createLeaf(
    branchId: string,
    data: { id?: string; name?: string; type: string; position_x?: number; position_y?: number; config?: any; is_start?: boolean }
  ) {
    const response = await this.client.post(`/design/branches/${branchId}/leaves`, {
      ...(data.id ? { id: data.id } : {}),
      name: data.name || data.type,
      type: data.type,
      position_x: data.position_x ?? 0,
      position_y: data.position_y ?? 0,
      config: data.config ?? {},
      ...(data.is_start !== undefined ? { is_start: data.is_start } : {}),
    });
    return response.data;
  }

  // No hay GET de una hoja suelta: se busca en su rama o, sin rama, en todo el bot.
  async findLeaf(leafId: string, where: { branchId?: string; treeId?: string }) {
    const branches = where.branchId ? [await this.getBranch(where.branchId)] : await this.listBranches(where.treeId!);
    for (const branch of branches) {
      const leaf = branch?.leaves?.find((l: any) => l.id === leafId);
      if (leaf) return leaf;
    }
    throw new Error(`No existe la hoja ${leafId} en ${where.branchId ? `la rama ${where.branchId}` : `el bot ${where.treeId}`}.`);
  }

  // El PUT del backend sustituye el config entero. Para que mandar sólo lo que cambia no
  // borre el resto, se parte del guardado: cada clave enviada lo pisa y null la quita.
  async updateLeaf(
    leafId: string,
    data: { name?: string; type?: string; position_x?: number; position_y?: number; config?: any; is_start?: boolean },
    options: { branchId?: string; treeId?: string; replaceConfig?: boolean } = {}
  ) {
    const body: Record<string, any> = {};
    for (const key of ['name', 'type', 'position_x', 'position_y', 'config', 'is_start'] as const) {
      if (data[key] !== undefined) body[key] = data[key];
    }
    if (body.config !== undefined && !options.replaceConfig) {
      if (!options.branchId && !options.treeId) {
        throw new Error(
          'Para cambiar config sin borrar lo demás hace falta branch_id o tree_id (para leer el config guardado). ' +
          'Si de verdad quieres sustituirlo entero, manda replace_config: true.'
        );
      }
      const current = await this.findLeaf(leafId, options);
      body.config = mergeConfig(current.config ?? {}, body.config);
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

  // IntentSchema exige id y type en la creación.
  async createIntent(treeId: string, data: { name: string; patterns: string[]; entities?: any[]; type?: string }) {
    const response = await this.client.post(`/trees/${treeId}/intents`, {
      id: randomUUID(),
      name: data.name,
      type: data.type || 'conversational',
      patterns: data.patterns,
      entities: data.entities ?? [],
    });
    return response.data;
  }

  async getIntent(treeId: string, intentId: string) {
    const response = await this.client.get(`/trees/${treeId}/intents/${intentId}`);
    return response.data;
  }

  // IntentUpdate es un reemplazo completo (exige name, type y patterns),
  // asi que se parte del estado actual y encima van los campos recibidos.
  async updateIntent(
    treeId: string,
    intentId: string,
    data: { name?: string; patterns?: string[]; entities?: any[]; type?: string; add_patterns?: string[]; remove_patterns?: string[] }
  ) {
    const current = await this.getIntent(treeId, intentId);
    const { add_patterns, remove_patterns, ...fields } = data;
    const body: Record<string, any> = { ...current, ...pickDefined(fields) };
    if (add_patterns?.length || remove_patterns?.length) {
      body.patterns = editList(body.patterns ?? [], add_patterns, remove_patterns);
    }
    // displayPatterns va una a una con patterns. Si cambian las frases, reenviar las
    // guardadas dejaría en pantalla frases viejas: sin ellas el backend las regenera.
    if (JSON.stringify(body.patterns) !== JSON.stringify(current?.patterns)) delete body.displayPatterns;
    const response = await this.client.put(`/trees/${treeId}/intents/${intentId}`, body);
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

  // EntitySchema exige id, name y type; los valores van como { key, synonyms }.
  async createEntity(treeId: string, data: { name: string; type?: string; values?: any[]; pattern?: string }) {
    const response = await this.client.post(`/trees/${treeId}/entities`, {
      id: randomUUID(),
      name: data.name,
      type: data.type || 'simple',
      values: normalizeEntityValues(data.values),
      ...(data.pattern ? { pattern: data.pattern } : {}),
    });
    return response.data;
  }

  // Ojo: la lectura de una entidad suelta sólo existe bajo /entities,
  // no bajo el alias /trees que usan el resto de operaciones.
  async getEntity(treeId: string, entityId: string) {
    const response = await this.client.get(`/entities/${treeId}/${entityId}`);
    return response.data;
  }

  // EntityUpdate tambien es un reemplazo completo (exige name y type).
  async updateEntity(
    treeId: string,
    entityId: string,
    data: { name?: string; type?: string; values?: any[]; pattern?: string; add_values?: any[]; remove_values?: string[] }
  ) {
    const current = await this.getEntity(treeId, entityId);
    const { add_values, remove_values, ...fields } = data;
    let values = normalizeEntityValues(fields.values ?? current?.values);
    if (remove_values?.length) {
      const drop = new Set(remove_values.map((k) => k.trim()));
      values = values.filter((v) => !drop.has(String(v.key).trim()));
    }
    // Un valor que ya existe no se duplica: se le suman los sinónimos nuevos.
    for (const v of normalizeEntityValues(add_values)) {
      const same = values.find((x) => x.key === v.key);
      if (same) same.synonyms = [...new Set([...(same.synonyms ?? []), ...v.synonyms])];
      else values.push(v);
    }
    const response = await this.client.put(`/trees/${treeId}/entities/${entityId}`, {
      ...current,
      ...pickDefined(fields),
      values,
    });
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

  // Config guardada lista para volver a enviarse: las tools y scripts van en las
  // claves que el backend lee (`additionalFertilizers` y `scripts`).
  private async loadFertilizerConfig(treeId: string) {
    const current = await this.listFertilizers(treeId);
    const { custom_scripts: _legacy, ...rest } = current || {};
    return {
      ...rest,
      additionalFertilizers: [...(current?.additionalFertilizers || current?.additional_tools || [])],
      scripts: [...(current?.scripts || current?.custom_scripts || [])],
    };
  }

  private saveFertilizerConfig(treeId: string, config: any) {
    return this.updateFertilizerConfig(treeId, config);
  }

  private pickById<T extends { id: string; name?: string }>(list: T[], idOrName: string): T | undefined {
    return list.find((x) => x.id === idOrName) || list.find((x) => x.name === idOrName);
  }

  async createTool(treeId: string, input: ToolInput & { name: string; url: string }) {
    const config = await this.loadFertilizerConfig(treeId);
    const tool = {
      id: randomUUID(),
      name: input.name,
      description: input.description ?? '',
      url: input.url,
      method: input.method ?? 'POST',
      timeout: input.timeout ?? 30000,
      body: input.body ?? '{}',
      authType: input.authType ?? 'none',
      authConfig: input.authConfig ?? {},
      inputVariables: toVariables(input.inputVariables),
      outputVariables: toVariables(input.outputVariables),
      lastResponse: '',
      enabled: input.enabled ?? true,
      status: 'unconfigured',
      deployedDate: null,
      ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
    };
    config.additionalFertilizers.push(tool);
    await this.saveFertilizerConfig(treeId, config);
    // El backend sanea el nombre (únicos, sin espacios): se relee para devolver el real.
    const saved = await this.loadFertilizerConfig(treeId);
    return saved.additionalFertilizers.find((t: any) => t.id === tool.id) ?? tool;
  }

  async updateTool(treeId: string, toolId: string, patch: ToolInput & { status?: string }) {
    const config = await this.loadFertilizerConfig(treeId);
    const tool = this.pickById<any>(config.additionalFertilizers, toolId);
    if (!tool) throw new Error(`No existe la herramienta "${toolId}" en el bot ${treeId}.`);
    const { inputVariables, outputVariables, authConfig, ...simple } = patch;
    const savedUrl = tool.url;
    Object.assign(tool, withoutMasked(pickDefined(simple)));
    // Lo que el modelo leyó enmascarado y devuelve tal cual no debe pisar el valor real.
    if (typeof simple.url === 'string') tool.url = unmaskUrl(simple.url, savedUrl);
    if (authConfig !== undefined) tool.authConfig = { ...(tool.authConfig || {}), ...withoutMasked(authConfig) };
    if (inputVariables !== undefined) tool.inputVariables = toVariables(inputVariables);
    if (outputVariables !== undefined) tool.outputVariables = toVariables(outputVariables);
    // Cualquier cambio invalida la validación anterior, como en el editor de la app.
    if (patch.status === undefined) tool.status = 'unconfigured';
    await this.saveFertilizerConfig(treeId, config);
    const saved = await this.loadFertilizerConfig(treeId);
    return saved.additionalFertilizers.find((t: any) => t.id === tool.id) ?? tool;
  }

  async deleteTool(treeId: string, toolId: string) {
    const config = await this.loadFertilizerConfig(treeId);
    const tool = this.pickById<any>(config.additionalFertilizers, toolId);
    if (!tool) throw new Error(`No existe la herramienta "${toolId}" en el bot ${treeId}.`);
    config.additionalFertilizers = config.additionalFertilizers.filter((t: any) => t.id !== tool.id);
    await this.saveFertilizerConfig(treeId, config);
    return { deleted: tool.id, name: tool.name };
  }

  /** Prueba la herramienta guardada con el mismo ejecutor que usa la conversación. */
  async testTool(treeId: string, toolId: string, testValues?: Record<string, string>) {
    const config = await this.loadFertilizerConfig(treeId);
    const tool = this.pickById<any>(config.additionalFertilizers, toolId);
    if (!tool) throw new Error(`No existe la herramienta "${toolId}" en el bot ${treeId}.`);
    const toTest = {
      ...tool,
      inputVariables: (tool.inputVariables || []).map((v: any) => ({
        ...v,
        ...(testValues && testValues[v.name] !== undefined ? { testValue: testValues[v.name] } : {}),
      })),
    };
    const response = await this.client.post(`/api/fertilizers/${treeId}/tools/test`, { tool: toTest });
    return response.data;
  }

  async createScript(treeId: string, input: ScriptInput & { name: string; code: string }) {
    const config = await this.loadFertilizerConfig(treeId);
    const script = {
      id: randomUUID(),
      name: input.name,
      description: input.description ?? '',
      language: input.language ?? 'python',
      code: input.code,
      timeout: input.timeout ?? 5000,
      inputVariables: toVariables(input.inputVariables),
      outputVariables: toVariables(input.outputVariables),
      status: 'unconfigured',
      deployedDate: null,
      lastResponse: '',
      enabled: input.enabled ?? true,
      ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
    };
    config.scripts.push(script);
    await this.saveFertilizerConfig(treeId, config);
    const saved = await this.loadFertilizerConfig(treeId);
    return saved.scripts.find((x: any) => x.id === script.id) ?? script;
  }

  async updateScript(treeId: string, scriptId: string, patch: ScriptInput & { status?: string }) {
    const config = await this.loadFertilizerConfig(treeId);
    const script = this.pickById<any>(config.scripts, scriptId);
    if (!script) throw new Error(`No existe el script "${scriptId}" en el bot ${treeId}.`);
    const { inputVariables, outputVariables, ...simple } = patch;
    Object.assign(script, pickDefined(simple));
    if (inputVariables !== undefined) script.inputVariables = toVariables(inputVariables);
    if (outputVariables !== undefined) script.outputVariables = toVariables(outputVariables);
    if (patch.status === undefined) script.status = 'unconfigured';
    await this.saveFertilizerConfig(treeId, config);
    const saved = await this.loadFertilizerConfig(treeId);
    return saved.scripts.find((x: any) => x.id === script.id) ?? script;
  }

  async deleteScript(treeId: string, scriptId: string) {
    const config = await this.loadFertilizerConfig(treeId);
    const script = this.pickById<any>(config.scripts, scriptId);
    if (!script) throw new Error(`No existe el script "${scriptId}" en el bot ${treeId}.`);
    config.scripts = config.scripts.filter((x: any) => x.id !== script.id);
    await this.saveFertilizerConfig(treeId, config);
    return { deleted: script.id, name: script.name };
  }

  /** Ejecuta el script guardado en caliente. */
  async testScript(treeId: string, scriptId: string, testValues?: Record<string, string>) {
    const config = await this.loadFertilizerConfig(treeId);
    const script = this.pickById<any>(config.scripts, scriptId);
    if (!script) throw new Error(`No existe el script "${scriptId}" en el bot ${treeId}.`);
    const response = await this.client.post(`/api/fertilizers/${treeId}/scripts/test`, {
      name: script.name,
      language: script.language,
      code: script.code,
      timeout: script.timeout || 5000,
      inputVariables: (script.inputVariables || []).map((v: any) => ({
        ...v,
        ...(testValues && testValues[v.name] !== undefined ? { testValue: testValues[v.name] } : {}),
      })),
      outputVariables: script.outputVariables || [],
      sessionParams: {},
    });
    return response.data;
  }

  async listToolLogs(treeId: string, params: { limit?: number; offset?: number; success?: boolean; tool_name?: string; search?: string; date_from?: string; date_to?: string } = {}) {
    const response = await this.client.get(`/api/fertilizers/${treeId}/tool-logs`, { params: pickDefined(params) });
    return response.data;
  }

  // --- 7b. CAPTURAS (preguntas reutilizables del slot filling) ---
  async listCaptures(treeId: string) {
    const response = await this.client.get(`/trees/${treeId}/captures`);
    return response.data;
  }

  async getCapture(treeId: string, ref: string) {
    const response = await this.client.get(`/trees/${treeId}/captures/${encodeURIComponent(ref)}`);
    return response.data;
  }

  async createCapture(treeId: string, data: Record<string, any>) {
    const response = await this.client.post(`/trees/${treeId}/captures`, data);
    return response.data;
  }

  // El PUT del backend sustituye la captura entera: se parte de la guardada y se
  // aplica sólo lo que cambia, para no borrar campos que el usuario no mencionó.
  async updateCapture(treeId: string, ref: string, patch: Record<string, any>) {
    const current = await this.getCapture(treeId, ref);
    const keep = [
      'name', 'prompt', 'prompt_rich', 'prompt_blocks', 'prompt_responses', 'prompt_template_id',
      'fallback', 'fallback_rich', 'fallback_blocks', 'fallback_responses', 'fallback_template_id',
      'limit', 'on_limit_action',
    ];
    const base: Record<string, any> = {};
    for (const k of keep) if (current?.[k] !== undefined) base[k] = current[k];
    const response = await this.client.put(`/trees/${treeId}/captures/${encodeURIComponent(ref)}`, { ...base, ...pickDefined(patch) });
    return response.data;
  }

  async deleteCapture(treeId: string, ref: string) {
    const response = await this.client.delete(`/trees/${treeId}/captures/${encodeURIComponent(ref)}`);
    return response.data;
  }

  // --- 7c. TRANSFERENCIA A HUMANO ---
  async listTransfers(treeId: string) {
    const response = await this.client.get(`/api/integrations/transfers/${treeId}`);
    return response.data;
  }

  async createTransfer(treeId: string, data: Record<string, any>) {
    const response = await this.client.post(`/api/integrations/transfers/${treeId}`, data);
    return response.data;
  }

  // Igual que las capturas: el PUT exige el cuerpo completo (el nombre es obligatorio).
  async updateTransfer(treeId: string, configId: string, patch: Record<string, any>) {
    const current = await this.client.get(`/api/integrations/transfers/${treeId}/${configId}`).then((r) => r.data);
    const keep = [
      'name', 'description', 'endpoint_url', 'auth_token', 'custom_headers', 'include_history',
      'history_format', 'agent_stops_listening', 'persist_widget_chat', 'transfer_message', 'is_active',
    ];
    const base: Record<string, any> = {};
    for (const k of keep) if (current?.[k] !== undefined && current?.[k] !== null) base[k] = current[k];
    const changes: Record<string, any> = withoutMasked(pickDefined(patch));
    if (typeof changes.endpoint_url === 'string') changes.endpoint_url = unmaskUrl(changes.endpoint_url, current?.endpoint_url);
    const response = await this.client.put(`/api/integrations/transfers/${treeId}/${configId}`, { ...base, ...changes });
    return response.data;
  }

  async deleteTransfer(treeId: string, configId: string) {
    const response = await this.client.delete(`/api/integrations/transfers/${treeId}/${configId}`);
    return response.data;
  }

  async testTransfer(treeId: string, configId: string, data: Record<string, any> = {}) {
    const response = await this.client.post(`/api/integrations/transfers/${treeId}/${configId}/test`, data);
    return response.data;
  }

  // --- 7d. MESA DE AYUDA (chat en vivo): sólo lectura ---
  // Responder, tomar o cerrar una atención es actuar como operador frente a un
  // cliente real: eso se hace desde la mesa de ayuda, no desde un asistente.
  async getLiveChatQueue(treeId?: string) {
    const response = await this.client.get('/api/live-chat/queue', { params: pickDefined({ tree_id: treeId }) });
    return response.data;
  }

  async getLiveChatHistory(params: { tree_id?: string; desde?: string; hasta?: string; estado?: string; q?: string; limit?: number; offset?: number } = {}) {
    const response = await this.client.get('/api/live-chat/history', { params: pickDefined(params) });
    return response.data;
  }

  async getLiveChatSession(sessionId: string) {
    const response = await this.client.get(`/api/live-chat/sessions/${sessionId}`);
    return response.data;
  }

  // --- 7e. SUITES DE PRUEBA DEL BOT ---
  async listTestSuites(treeId: string) {
    const response = await this.client.get(`/trees/${treeId}/test-suites`);
    return response.data;
  }

  async createTestSuite(treeId: string, data: { name: string; description?: string; cases?: any[] }) {
    const response = await this.client.post(`/trees/${treeId}/test-suites`, data);
    return response.data;
  }

  async getTestSuite(suiteId: string) {
    const response = await this.client.get(`/test-suites/${suiteId}`);
    return response.data;
  }

  async updateTestSuite(suiteId: string, data: { name?: string; description?: string; cases?: any[] }) {
    const response = await this.client.put(`/test-suites/${suiteId}`, data);
    return response.data;
  }

  async deleteTestSuite(suiteId: string) {
    const response = await this.client.delete(`/test-suites/${suiteId}`);
    return response.data;
  }

  async importTestSuiteCsv(suiteId: string, csv: string, modo: 'reemplazar' | 'agregar' = 'reemplazar') {
    const response = await this.client.post(`/test-suites/${suiteId}/import-csv`, { csv, modo });
    return response.data;
  }

  async exportTestSuiteCsv(suiteId: string): Promise<string> {
    const response = await this.client.get(`/test-suites/${suiteId}/export-csv`, { responseType: 'text' });
    return response.data;
  }

  async runTestSuite(suiteId: string) {
    const response = await this.client.post(`/test-suites/${suiteId}/run`);
    return response.data;
  }

  async listTestRuns(suiteId: string, limit = 20) {
    const response = await this.client.get(`/test-suites/${suiteId}/runs`, { params: { limit } });
    return response.data;
  }

  async getTestRun(runId: string) {
    const response = await this.client.get(`/test-runs/${runId}`);
    return response.data;
  }

  async compareTestRuns(runId: string, otherRunId: string) {
    const response = await this.client.get(`/test-runs/${runId}/compare/${otherRunId}`);
    return response.data;
  }

  // --- 7f. ANALÍTICAS DE CONVERSACIONES ---
  async getConversationAnalytics(treeId: string, params: { start_date?: number; end_date?: number; intent?: string; branch?: string; include_console?: boolean; max_depth?: number } = {}) {
    const response = await this.client.get(`/api/trees/${treeId}/conversations/analytics`, { params: pickDefined(params) });
    return response.data;
  }

  // --- 7g. EXPORTAR / IMPORTAR / RESTAURAR ---
  async exportTree(treeId: string, includeConversations = false) {
    const response = await this.client.get(`/api/backup/trees/${treeId}/export`, {
      params: { include_conversations: includeConversations },
    });
    return response.data;
  }

  /** Crea un árbol NUEVO a partir de un export; no toca el existente. */
  async importTree(backup: Record<string, any>, options?: Record<string, any>) {
    const form = new FormData();
    form.append('file', new Blob([JSON.stringify(backup)], { type: 'application/json' }), 'treeflow_backup.json');
    if (options) form.append('options', JSON.stringify(options));
    const response = await this.client.post('/api/backup/trees/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      maxBodyLength: Infinity,
    });
    return response.data;
  }

  async restoreSnapshot(treeId: string, snapshotId: string) {
    const response = await this.client.post(`/api/backup/trees/${treeId}/snapshots/${snapshotId}/restore`);
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

  // La configuración de cada canal vive plana en su injerto (injertos.web.primaryColor,
  // injertos.telegram.token…): anidarla bajo `config` la guardaba donde nadie la lee.
  // Los secretos enmascarados que vuelvan como *** los restaura el backend.
  async configureIntegration(treeId: string, integrationKey: string, enabled: boolean, config?: any) {
    const current = await this.listIntegrations(treeId);
    const injertos = { ...(current.injertos || {}) };
    const existing = injertos[integrationKey];
    injertos[integrationKey] = {
      ...mergeConfig(existing && typeof existing === 'object' ? existing : {}, withoutMasked(config && typeof config === 'object' ? config : {})),
      enabled,
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
  async triggerTraining(treeId: string, force = false) {
    const response = await this.client.post(`/train/${treeId}`, undefined, { params: force ? { force: true } : {} });
    return response.data;
  }

  /**
   * Entrena y espera a que termine, para que el modelo no tenga que consultar el estado
   * una y otra vez (cada consulta es otra llamada que reenvía toda la conversación).
   */
  async trainAndWait(treeId: string, options: { force?: boolean; timeoutMs?: number; pollMs?: number } = {}) {
    const { force = false, timeoutMs = 90_000, pollMs = 1_500 } = options;
    const started = Date.now();
    const queued = await this.triggerTraining(treeId, force);
    if (queued?.status === 'skipped') return { outcome: 'skipped' as const, queued, status: await this.getTrainingStatus(treeId) };
    let status = await this.getTrainingStatus(treeId);
    while (['pendiente', 'en_proceso'].includes(status?.status) && Date.now() - started < timeoutMs) {
      await new Promise((r) => setTimeout(r, pollMs));
      status = await this.getTrainingStatus(treeId);
    }
    const running = ['pendiente', 'en_proceso'].includes(status?.status);
    // El error, si lo hubo, sólo está en el historial.
    const last = running ? undefined : (await this.listTrainingHistory(treeId, 1, 1).catch(() => undefined))?.items?.[0];
    return { outcome: running ? ('running' as const) : ('finished' as const), queued, status, last, seconds: (Date.now() - started) / 1000 };
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
  // El motor espera un evento tipado: { type, value }, no { message }.
  async simulateChatMessage(treeId: string, message: string, sessionId?: string) {
    const response = await this.client.post('/message', {
      type: 'text',
      value: message,
      tree_id: treeId,
      session_id: sessionId || `mcp_sim_${Date.now()}`,
      source: 'mcp',
    });
    return response.data;
  }

  // Sin limit el backend devuelve todas las conversaciones del bot.
  async listConversations(
    treeId: string,
    params: { limit?: number; offset?: number; intent?: string; message?: string; start_date?: number; end_date?: number } = {}
  ) {
    const response = await this.client.get(`/api/trees/${treeId}/conversations`, { params: { limit: 20, ...pickDefined(params) } });
    return response.data;
  }

  async getConversation(treeId: string, sessionId: string) {
    const response = await this.client.get(`/api/trees/${treeId}/conversations/${sessionId}`);
    return response.data;
  }

  // --- 12. AUDITORÍA & CAMBIOS ---
  async listChangeHistory(treeId: string, params: { limit?: number; offset?: number; entity_type?: string; action?: string } = {}) {
    const response = await this.client.get(`/api/trees/${treeId}/history`, {
      params: { limit: 20, ...pickDefined(params) },
    });
    return response.data;
  }

  // --- 13. BACKUPS & RESTORE ---
  // Se usan los snapshots de la BD, no /backups: esos ultimos escriben un
  // archivo en el disco local del servidor (ruta relativa, sin volumen ni
  // endpoint de borrado) y no son los que muestra el panel.
  async listBackups(treeId: string) {
    const response = await this.client.get(`/api/backup/trees/${treeId}/snapshots`);
    return response.data;
  }

  // El endpoint recibe los campos como formulario, no como JSON.
  async createBackup(treeId: string, note?: string) {
    const form = new URLSearchParams();
    if (note) form.append('label', note);
    form.append('is_auto', 'false');
    const response = await this.client.post(`/api/backup/trees/${treeId}/snapshots`, form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
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
