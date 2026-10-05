import axios from 'axios';
import { randomUUID } from 'node:crypto';
import { getConfig } from '../config.js';
// Descarta las claves sin valor para no pisar el estado actual con undefined.
function pickDefined(data) {
    const out = {};
    for (const [k, v] of Object.entries(data)) {
        if (v !== undefined)
            out[k] = v;
    }
    return out;
}
/** Combina un config por claves de primer nivel: lo enviado pisa lo guardado y null lo quita. */
export function mergeConfig(current, patch) {
    const out = { ...current };
    for (const [k, v] of Object.entries(patch ?? {})) {
        if (v === null)
            delete out[k];
        else
            out[k] = v;
    }
    return out;
}
/** Aplica altas y bajas a una lista de textos sin duplicar ni tocar el resto. */
export function editList(current, add = [], remove = []) {
    const drop = new Set(remove.map((s) => s.trim()));
    const out = current.filter((s) => !drop.has(s.trim()));
    for (const s of add)
        if (!out.some((x) => x.trim() === s.trim()))
            out.push(s);
    return out;
}
// El backend valida los valores de entidad como { key, synonyms }.
// Se acepta `value` como alias de `key` por comodidad al dictarlos.
function normalizeEntityValues(values) {
    return (values || []).map((v) => ({
        key: v?.key ?? v?.value ?? '',
        synonyms: v?.synonyms ?? [],
        ...(v?.entity ? { entity: v.entity } : {}),
    }));
}
function toVariables(vars) {
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
// Oculta secretos en lo que se devuelve al modelo. Los valores reales siguen en el
// servidor y las actualizaciones los conservan: se parte siempre de la config guardada.
export const MASK = '***';
export function maskSecrets(value) {
    const secretKeys = new Set(['password', 'token', 'secretPhrase', 'auth_token', 'api_key', 'apiKey']);
    const walk = (v, key) => {
        if (Array.isArray(v))
            return v.map((x) => walk(x));
        if (v && typeof v === 'object') {
            const out = {};
            for (const [k, x] of Object.entries(v))
                out[k] = walk(x, k);
            // authConfig.value guarda la clave de una API de tipo apiKey
            if ('key' in out && 'value' in out && v.value)
                out.value = MASK;
            return out;
        }
        if (key && secretKeys.has(key) && typeof v === 'string' && v)
            return MASK;
        if (key && /url$/i.test(key) && typeof v === 'string')
            return maskUrl(v);
        return v;
    };
    return walk(value);
}
// Una clave también puede ir en la URL (?key=…, &access_token=…). Se reconoce por el
// nombre del parámetro; un valor con { $variable } no es un secreto sino una plantilla.
const SECRET_PARAM = /(^|[^a-z])(api_?key|key|token|access_?token|secret|password|passwd|pwd|signature|sig|auth|credentials?)$/i;
const QUERY_PARAM = /([?&])([^=&#]+)=([^&#]*)/g;
export function maskUrl(url) {
    return url.replace(QUERY_PARAM, (m, sep, name, value) => value && value !== MASK && SECRET_PARAM.test(name) && !value.includes('{') ? `${sep}${name}=${MASK}` : m);
}
/** Devuelve a la URL nueva los secretos que llegaron enmascarados, tomándolos de la guardada. */
export function unmaskUrl(next, saved) {
    const old = new Map();
    for (const [, , name, value] of (saved ?? '').matchAll(QUERY_PARAM))
        old.set(name, value);
    return next.replace(QUERY_PARAM, (m, sep, name, value) => value === MASK && old.has(name) ? `${sep}${name}=${old.get(name)}` : m);
}
/** Quita los valores enmascarados de un parche: un *** que vuelve del modelo no es un dato nuevo. */
export function withoutMasked(patch) {
    const out = {};
    for (const [k, v] of Object.entries(patch ?? {}))
        if (v !== MASK)
            out[k] = v;
    return out;
}
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
            timeout: 45000,
        });
    }
    // --- 1. TREES / BOTS ---
    async listTrees() {
        const response = await this.client.get('/trees');
        return response.data;
    }
    // El backend no expone GET /trees/{id}: se resuelve desde el listado del workspace.
    async getTree(treeId) {
        const trees = await this.listTrees();
        const tree = (trees || []).find((t) => t.tree_id === treeId);
        if (!tree) {
            throw new Error(`No existe el árbol ${treeId} en el workspace ${this.workspaceId}.`);
        }
        return tree;
    }
    async getTreeData(treeId) {
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
    async createTree(data) {
        const response = await this.client.post('/trees', data);
        return response.data;
    }
    async updateTree(treeId, data) {
        const response = await this.client.put(`/trees/${treeId}`, data);
        return response.data;
    }
    // --- 2. BRANCHES (Canvas Flujos) ---
    async listBranches(treeId) {
        const response = await this.client.get(`/design/${treeId}/branches`);
        return response.data;
    }
    async createBranch(treeId, data) {
        const response = await this.client.post(`/design/${treeId}/branches`, data);
        return response.data;
    }
    async getBranch(branchId) {
        const response = await this.client.get(`/design/branches/${branchId}`);
        return response.data;
    }
    async updateBranch(branchId, data) {
        const response = await this.client.put(`/design/branches/${branchId}`, data);
        return response.data;
    }
    async deleteBranch(branchId) {
        const response = await this.client.delete(`/design/branches/${branchId}`);
        return response.data;
    }
    // --- 3. LEAFS (Nodos del Canvas) ---
    // El backend no expone un listado propio: las leaves vienen embebidas en la rama.
    async listLeafs(branchId) {
        const branch = await this.getBranch(branchId);
        return branch?.leaves ?? [];
    }
    async createLeaf(branchId, data) {
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
    // No hay GET de una hoja suelta: se busca en su rama o, sin rama, en todo el bot.
    async findLeaf(leafId, where) {
        const branches = where.branchId ? [await this.getBranch(where.branchId)] : await this.listBranches(where.treeId);
        for (const branch of branches) {
            const leaf = branch?.leaves?.find((l) => l.id === leafId);
            if (leaf)
                return leaf;
        }
        throw new Error(`No existe la hoja ${leafId} en ${where.branchId ? `la rama ${where.branchId}` : `el bot ${where.treeId}`}.`);
    }
    // El PUT del backend sustituye el config entero. Para que mandar sólo lo que cambia no
    // borre el resto, se parte del guardado: cada clave enviada lo pisa y null la quita.
    async updateLeaf(leafId, data, options = {}) {
        const body = {};
        for (const key of ['name', 'type', 'position_x', 'position_y', 'config', 'is_start']) {
            if (data[key] !== undefined)
                body[key] = data[key];
        }
        if (body.config !== undefined && !options.replaceConfig) {
            if (!options.branchId && !options.treeId) {
                throw new Error('Para cambiar config sin borrar lo demás hace falta branch_id o tree_id (para leer el config guardado). ' +
                    'Si de verdad quieres sustituirlo entero, manda replace_config: true.');
            }
            const current = await this.findLeaf(leafId, options);
            body.config = mergeConfig(current.config ?? {}, body.config);
        }
        const response = await this.client.put(`/design/leaves/${leafId}`, body);
        return response.data;
    }
    async deleteLeaf(leafId) {
        const response = await this.client.delete(`/design/leaves/${leafId}`);
        return response.data;
    }
    // --- 4. INTENTS (NLU) ---
    async listIntents(treeId) {
        const response = await this.client.get(`/trees/${treeId}/intents`);
        return response.data;
    }
    // IntentSchema exige id y type en la creación.
    async createIntent(treeId, data) {
        const response = await this.client.post(`/trees/${treeId}/intents`, {
            id: randomUUID(),
            name: data.name,
            type: data.type || 'conversational',
            patterns: data.patterns,
            entities: data.entities ?? [],
        });
        return response.data;
    }
    async getIntent(treeId, intentId) {
        const response = await this.client.get(`/trees/${treeId}/intents/${intentId}`);
        return response.data;
    }
    // IntentUpdate es un reemplazo completo (exige name, type y patterns),
    // asi que se parte del estado actual y encima van los campos recibidos.
    async updateIntent(treeId, intentId, data) {
        const current = await this.getIntent(treeId, intentId);
        const { add_patterns, remove_patterns, ...fields } = data;
        const body = { ...current, ...pickDefined(fields) };
        if (add_patterns?.length || remove_patterns?.length) {
            body.patterns = editList(body.patterns ?? [], add_patterns, remove_patterns);
        }
        // displayPatterns va una a una con patterns. Si cambian las frases, reenviar las
        // guardadas dejaría en pantalla frases viejas: sin ellas el backend las regenera.
        if (JSON.stringify(body.patterns) !== JSON.stringify(current?.patterns))
            delete body.displayPatterns;
        const response = await this.client.put(`/trees/${treeId}/intents/${intentId}`, body);
        return response.data;
    }
    async deleteIntent(treeId, intentId) {
        const response = await this.client.delete(`/trees/${treeId}/intents/${intentId}`);
        return response.data;
    }
    // --- 5. ENTITIES (NLU) ---
    async listEntities(treeId) {
        const response = await this.client.get(`/trees/${treeId}/entities`);
        return response.data;
    }
    // EntitySchema exige id, name y type; los valores van como { key, synonyms }.
    async createEntity(treeId, data) {
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
    async getEntity(treeId, entityId) {
        const response = await this.client.get(`/entities/${treeId}/${entityId}`);
        return response.data;
    }
    // EntityUpdate tambien es un reemplazo completo (exige name y type).
    async updateEntity(treeId, entityId, data) {
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
            if (same)
                same.synonyms = [...new Set([...(same.synonyms ?? []), ...v.synonyms])];
            else
                values.push(v);
        }
        const response = await this.client.put(`/trees/${treeId}/entities/${entityId}`, {
            ...current,
            ...pickDefined(fields),
            values,
        });
        return response.data;
    }
    async deleteEntity(treeId, entityId) {
        const response = await this.client.delete(`/trees/${treeId}/entities/${entityId}`);
        return response.data;
    }
    // --- 6. MESSAGE TEMPLATES ---
    async listMessageTemplates(treeId) {
        const response = await this.client.get(`/design/${treeId}/messages`);
        return response.data;
    }
    async createMessageTemplate(treeId, data) {
        const response = await this.client.post(`/design/${treeId}/messages`, data);
        return response.data;
    }
    async updateMessageTemplate(templateId, data) {
        const response = await this.client.put(`/design/messages/${templateId}`, data);
        return response.data;
    }
    async deleteMessageTemplate(templateId) {
        const response = await this.client.delete(`/design/messages/${templateId}`);
        return response.data;
    }
    // --- 7. FERTILIZERS / HERRAMIENTAS / KNOWLEDGE BASE ---
    async listFertilizers(treeId) {
        const response = await this.client.get(`/api/fertilizers/${treeId}`);
        return response.data;
    }
    // El backend guarda la config completa vía POST (no hay PUT sobre la colección).
    // FertilizerConfig exige tree_id y workspace_id en el cuerpo.
    async updateFertilizerConfig(treeId, data) {
        const response = await this.client.post(`/api/fertilizers/${treeId}`, {
            ...data,
            tree_id: treeId,
            workspace_id: this.workspaceId,
        });
        return response.data;
    }
    // Config guardada lista para volver a enviarse: las tools y scripts van en las
    // claves que el backend lee (`additionalFertilizers` y `scripts`).
    async loadFertilizerConfig(treeId) {
        const current = await this.listFertilizers(treeId);
        const { custom_scripts: _legacy, ...rest } = current || {};
        return {
            ...rest,
            additionalFertilizers: [...(current?.additionalFertilizers || current?.additional_tools || [])],
            scripts: [...(current?.scripts || current?.custom_scripts || [])],
        };
    }
    saveFertilizerConfig(treeId, config) {
        return this.updateFertilizerConfig(treeId, config);
    }
    pickById(list, idOrName) {
        return list.find((x) => x.id === idOrName) || list.find((x) => x.name === idOrName);
    }
    async createTool(treeId, input) {
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
        return saved.additionalFertilizers.find((t) => t.id === tool.id) ?? tool;
    }
    async updateTool(treeId, toolId, patch) {
        const config = await this.loadFertilizerConfig(treeId);
        const tool = this.pickById(config.additionalFertilizers, toolId);
        if (!tool)
            throw new Error(`No existe la herramienta "${toolId}" en el bot ${treeId}.`);
        const { inputVariables, outputVariables, authConfig, ...simple } = patch;
        const savedUrl = tool.url;
        Object.assign(tool, withoutMasked(pickDefined(simple)));
        // Lo que el modelo leyó enmascarado y devuelve tal cual no debe pisar el valor real.
        if (typeof simple.url === 'string')
            tool.url = unmaskUrl(simple.url, savedUrl);
        if (authConfig !== undefined)
            tool.authConfig = { ...(tool.authConfig || {}), ...withoutMasked(authConfig) };
        if (inputVariables !== undefined)
            tool.inputVariables = toVariables(inputVariables);
        if (outputVariables !== undefined)
            tool.outputVariables = toVariables(outputVariables);
        // Cualquier cambio invalida la validación anterior, como en el editor de la app.
        if (patch.status === undefined)
            tool.status = 'unconfigured';
        await this.saveFertilizerConfig(treeId, config);
        const saved = await this.loadFertilizerConfig(treeId);
        return saved.additionalFertilizers.find((t) => t.id === tool.id) ?? tool;
    }
    async deleteTool(treeId, toolId) {
        const config = await this.loadFertilizerConfig(treeId);
        const tool = this.pickById(config.additionalFertilizers, toolId);
        if (!tool)
            throw new Error(`No existe la herramienta "${toolId}" en el bot ${treeId}.`);
        config.additionalFertilizers = config.additionalFertilizers.filter((t) => t.id !== tool.id);
        await this.saveFertilizerConfig(treeId, config);
        return { deleted: tool.id, name: tool.name };
    }
    /** Prueba la herramienta guardada con el mismo ejecutor que usa la conversación. */
    async testTool(treeId, toolId, testValues) {
        const config = await this.loadFertilizerConfig(treeId);
        const tool = this.pickById(config.additionalFertilizers, toolId);
        if (!tool)
            throw new Error(`No existe la herramienta "${toolId}" en el bot ${treeId}.`);
        const toTest = {
            ...tool,
            inputVariables: (tool.inputVariables || []).map((v) => ({
                ...v,
                ...(testValues && testValues[v.name] !== undefined ? { testValue: testValues[v.name] } : {}),
            })),
        };
        const response = await this.client.post(`/api/fertilizers/${treeId}/tools/test`, { tool: toTest });
        return response.data;
    }
    async createScript(treeId, input) {
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
        return saved.scripts.find((x) => x.id === script.id) ?? script;
    }
    async updateScript(treeId, scriptId, patch) {
        const config = await this.loadFertilizerConfig(treeId);
        const script = this.pickById(config.scripts, scriptId);
        if (!script)
            throw new Error(`No existe el script "${scriptId}" en el bot ${treeId}.`);
        const { inputVariables, outputVariables, ...simple } = patch;
        Object.assign(script, pickDefined(simple));
        if (inputVariables !== undefined)
            script.inputVariables = toVariables(inputVariables);
        if (outputVariables !== undefined)
            script.outputVariables = toVariables(outputVariables);
        if (patch.status === undefined)
            script.status = 'unconfigured';
        await this.saveFertilizerConfig(treeId, config);
        const saved = await this.loadFertilizerConfig(treeId);
        return saved.scripts.find((x) => x.id === script.id) ?? script;
    }
    async deleteScript(treeId, scriptId) {
        const config = await this.loadFertilizerConfig(treeId);
        const script = this.pickById(config.scripts, scriptId);
        if (!script)
            throw new Error(`No existe el script "${scriptId}" en el bot ${treeId}.`);
        config.scripts = config.scripts.filter((x) => x.id !== script.id);
        await this.saveFertilizerConfig(treeId, config);
        return { deleted: script.id, name: script.name };
    }
    /** Ejecuta el script guardado en caliente. */
    async testScript(treeId, scriptId, testValues) {
        const config = await this.loadFertilizerConfig(treeId);
        const script = this.pickById(config.scripts, scriptId);
        if (!script)
            throw new Error(`No existe el script "${scriptId}" en el bot ${treeId}.`);
        const response = await this.client.post(`/api/fertilizers/${treeId}/scripts/test`, {
            name: script.name,
            language: script.language,
            code: script.code,
            timeout: script.timeout || 5000,
            inputVariables: (script.inputVariables || []).map((v) => ({
                ...v,
                ...(testValues && testValues[v.name] !== undefined ? { testValue: testValues[v.name] } : {}),
            })),
            outputVariables: script.outputVariables || [],
            sessionParams: {},
        });
        return response.data;
    }
    async listToolLogs(treeId, params = {}) {
        const response = await this.client.get(`/api/fertilizers/${treeId}/tool-logs`, { params: pickDefined(params) });
        return response.data;
    }
    // --- 7b. CAPTURAS (preguntas reutilizables del slot filling) ---
    async listCaptures(treeId) {
        const response = await this.client.get(`/trees/${treeId}/captures`);
        return response.data;
    }
    async getCapture(treeId, ref) {
        const response = await this.client.get(`/trees/${treeId}/captures/${encodeURIComponent(ref)}`);
        return response.data;
    }
    async createCapture(treeId, data) {
        const response = await this.client.post(`/trees/${treeId}/captures`, data);
        return response.data;
    }
    // El PUT del backend sustituye la captura entera: se parte de la guardada y se
    // aplica sólo lo que cambia, para no borrar campos que el usuario no mencionó.
    async updateCapture(treeId, ref, patch) {
        const current = await this.getCapture(treeId, ref);
        const keep = [
            'name', 'prompt', 'prompt_rich', 'prompt_blocks', 'prompt_responses', 'prompt_template_id',
            'fallback', 'fallback_rich', 'fallback_blocks', 'fallback_responses', 'fallback_template_id',
            'limit', 'on_limit_action',
        ];
        const base = {};
        for (const k of keep)
            if (current?.[k] !== undefined)
                base[k] = current[k];
        const response = await this.client.put(`/trees/${treeId}/captures/${encodeURIComponent(ref)}`, { ...base, ...pickDefined(patch) });
        return response.data;
    }
    async deleteCapture(treeId, ref) {
        const response = await this.client.delete(`/trees/${treeId}/captures/${encodeURIComponent(ref)}`);
        return response.data;
    }
    // --- 7c. TRANSFERENCIA A HUMANO ---
    async listTransfers(treeId) {
        const response = await this.client.get(`/api/integrations/transfers/${treeId}`);
        return response.data;
    }
    async createTransfer(treeId, data) {
        const response = await this.client.post(`/api/integrations/transfers/${treeId}`, data);
        return response.data;
    }
    // Igual que las capturas: el PUT exige el cuerpo completo (el nombre es obligatorio).
    async updateTransfer(treeId, configId, patch) {
        const current = await this.client.get(`/api/integrations/transfers/${treeId}/${configId}`).then((r) => r.data);
        const keep = [
            'name', 'description', 'endpoint_url', 'auth_token', 'custom_headers', 'include_history',
            'history_format', 'agent_stops_listening', 'persist_widget_chat', 'transfer_message', 'is_active',
        ];
        const base = {};
        for (const k of keep)
            if (current?.[k] !== undefined && current?.[k] !== null)
                base[k] = current[k];
        const changes = withoutMasked(pickDefined(patch));
        if (typeof changes.endpoint_url === 'string')
            changes.endpoint_url = unmaskUrl(changes.endpoint_url, current?.endpoint_url);
        const response = await this.client.put(`/api/integrations/transfers/${treeId}/${configId}`, { ...base, ...changes });
        return response.data;
    }
    async deleteTransfer(treeId, configId) {
        const response = await this.client.delete(`/api/integrations/transfers/${treeId}/${configId}`);
        return response.data;
    }
    async testTransfer(treeId, configId, data = {}) {
        const response = await this.client.post(`/api/integrations/transfers/${treeId}/${configId}/test`, data);
        return response.data;
    }
    // --- 7d. MESA DE AYUDA (chat en vivo): sólo lectura ---
    // Responder, tomar o cerrar una atención es actuar como operador frente a un
    // cliente real: eso se hace desde la mesa de ayuda, no desde un asistente.
    async getLiveChatQueue(treeId) {
        const response = await this.client.get('/api/live-chat/queue', { params: pickDefined({ tree_id: treeId }) });
        return response.data;
    }
    async getLiveChatHistory(params = {}) {
        const response = await this.client.get('/api/live-chat/history', { params: pickDefined(params) });
        return response.data;
    }
    async getLiveChatSession(sessionId) {
        const response = await this.client.get(`/api/live-chat/sessions/${sessionId}`);
        return response.data;
    }
    // --- 7e. SUITES DE PRUEBA DEL BOT ---
    async listTestSuites(treeId) {
        const response = await this.client.get(`/trees/${treeId}/test-suites`);
        return response.data;
    }
    async createTestSuite(treeId, data) {
        const response = await this.client.post(`/trees/${treeId}/test-suites`, data);
        return response.data;
    }
    async getTestSuite(suiteId) {
        const response = await this.client.get(`/test-suites/${suiteId}`);
        return response.data;
    }
    async updateTestSuite(suiteId, data) {
        const response = await this.client.put(`/test-suites/${suiteId}`, data);
        return response.data;
    }
    async deleteTestSuite(suiteId) {
        const response = await this.client.delete(`/test-suites/${suiteId}`);
        return response.data;
    }
    async importTestSuiteCsv(suiteId, csv, modo = 'reemplazar') {
        const response = await this.client.post(`/test-suites/${suiteId}/import-csv`, { csv, modo });
        return response.data;
    }
    async exportTestSuiteCsv(suiteId) {
        const response = await this.client.get(`/test-suites/${suiteId}/export-csv`, { responseType: 'text' });
        return response.data;
    }
    async runTestSuite(suiteId) {
        const response = await this.client.post(`/test-suites/${suiteId}/run`);
        return response.data;
    }
    async listTestRuns(suiteId, limit = 20) {
        const response = await this.client.get(`/test-suites/${suiteId}/runs`, { params: { limit } });
        return response.data;
    }
    async getTestRun(runId) {
        const response = await this.client.get(`/test-runs/${runId}`);
        return response.data;
    }
    async compareTestRuns(runId, otherRunId) {
        const response = await this.client.get(`/test-runs/${runId}/compare/${otherRunId}`);
        return response.data;
    }
    // --- 7f. ANALÍTICAS DE CONVERSACIONES ---
    async getConversationAnalytics(treeId, params = {}) {
        const response = await this.client.get(`/api/trees/${treeId}/conversations/analytics`, { params: pickDefined(params) });
        return response.data;
    }
    // --- 7g. EXPORTAR / IMPORTAR / RESTAURAR ---
    async exportTree(treeId, includeConversations = false) {
        const response = await this.client.get(`/api/backup/trees/${treeId}/export`, {
            params: { include_conversations: includeConversations },
        });
        return response.data;
    }
    /** Crea un árbol NUEVO a partir de un export; no toca el existente. */
    async importTree(backup, options) {
        const form = new FormData();
        form.append('file', new Blob([JSON.stringify(backup)], { type: 'application/json' }), 'treeflow_backup.json');
        if (options)
            form.append('options', JSON.stringify(options));
        const response = await this.client.post('/api/backup/trees/import', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            maxBodyLength: Infinity,
        });
        return response.data;
    }
    async restoreSnapshot(treeId, snapshotId) {
        const response = await this.client.post(`/api/backup/trees/${treeId}/snapshots/${snapshotId}/restore`);
        return response.data;
    }
    // --- 8. INTEGRACIONES & CANALES (Injertos) ---
    async listIntegrations(treeId) {
        const response = await this.client.get(`/bots/${treeId}/injertos`);
        return {
            tree_id: treeId,
            injertos: response.data?.injertos ?? response.data ?? {},
        };
    }
    // La configuración de cada canal vive plana en su injerto (injertos.web.primaryColor,
    // injertos.telegram.token…): anidarla bajo `config` la guardaba donde nadie la lee.
    // Los secretos enmascarados que vuelvan como *** los restaura el backend.
    async configureIntegration(treeId, integrationKey, enabled, config) {
        const current = await this.listIntegrations(treeId);
        const injertos = { ...(current.injertos || {}) };
        const existing = injertos[integrationKey];
        injertos[integrationKey] = {
            ...(existing && typeof existing === 'object' ? existing : {}),
            ...(config && typeof config === 'object' ? config : {}),
            enabled,
        };
        const response = await this.client.put(`/bots/${treeId}/injertos`, injertos);
        return response.data;
    }
    // --- 9. VOZ (Voice STT/TTS) ---
    async getVoiceConfig(treeId) {
        const response = await this.client.get(`/bots/${treeId}/voice-config`);
        return response.data;
    }
    async updateVoiceConfig(treeId, data) {
        const response = await this.client.put(`/bots/${treeId}/voice-config`, data);
        return response.data;
    }
    // --- 10. ENTRENAMIENTO & HISTORIAL ML ---
    async triggerTraining(treeId) {
        const response = await this.client.post(`/train/${treeId}`);
        return response.data;
    }
    async getTrainingStatus(treeId) {
        const response = await this.client.get(`/train/status/${treeId}`);
        return response.data;
    }
    async listTrainingHistory(treeId, page = 1, pageSize = 10) {
        const response = await this.client.get('/api/training-history/', {
            params: { tree_id: treeId, page, page_size: pageSize },
        });
        return response.data;
    }
    // --- 11. CONVERSACIONES & SIMULADOR ---
    // El motor espera un evento tipado: { type, value }, no { message }.
    async simulateChatMessage(treeId, message, sessionId) {
        const response = await this.client.post('/message', {
            type: 'text',
            value: message,
            tree_id: treeId,
            session_id: sessionId || `mcp_sim_${Date.now()}`,
            source: 'mcp',
        });
        return response.data;
    }
    async listConversations(treeId) {
        const response = await this.client.get(`/api/trees/${treeId}/conversations`);
        return response.data;
    }
    async getConversation(treeId, sessionId) {
        const response = await this.client.get(`/api/trees/${treeId}/conversations/${sessionId}`);
        return response.data;
    }
    // --- 12. AUDITORÍA & CAMBIOS ---
    async listChangeHistory(treeId, params = {}) {
        const response = await this.client.get(`/api/trees/${treeId}/history`, {
            params: { limit: 20, ...pickDefined(params) },
        });
        return response.data;
    }
    // --- 13. BACKUPS & RESTORE ---
    // Se usan los snapshots de la BD, no /backups: esos ultimos escriben un
    // archivo en el disco local del servidor (ruta relativa, sin volumen ni
    // endpoint de borrado) y no son los que muestra el panel.
    async listBackups(treeId) {
        const response = await this.client.get(`/api/backup/trees/${treeId}/snapshots`);
        return response.data;
    }
    // El endpoint recibe los campos como formulario, no como JSON.
    async createBackup(treeId, note) {
        const form = new URLSearchParams();
        if (note)
            form.append('label', note);
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
    async createUser(data) {
        const response = await this.client.post('/users/', {
            name: data.name || data.username,
            email: data.email,
            role: data.role,
            workspace_id: this.workspaceId,
        });
        return response.data;
    }
    async updateUser(userId, data) {
        const response = await this.client.put(`/users/${userId}`, data);
        return response.data;
    }
    // --- 15. CREDENCIALES ---
    async listCredentials() {
        const response = await this.client.get('/api/credentials/');
        return response.data;
    }
}
//# sourceMappingURL=treeflowClient.js.map