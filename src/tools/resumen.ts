// Resúmenes en texto para el modelo: una línea por pieza, con su ID para pedir el detalle.
//
// Todo lo que devuelve una herramienta se queda en la conversación y se vuelve a mandar
// en cada llamada siguiente. Por eso las lecturas resumen y el detalle completo de una
// pieza se pide aparte, con treeflow_get_detail, sólo de lo que se va a tocar.

export const DETAIL_HINT = 'Detalle completo de una pieza: treeflow_get_detail(tree_id, tipo, ref).';

/** Texto en una sola línea, recortado a `max` caracteres. */
export function clip(value: unknown, max = 60): string {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

const list = (items: string[], max = 8) =>
  items.length > max ? `${items.slice(0, max).join(', ')} y ${items.length - max} más` : items.join(', ');

const when = (iso: unknown) => (typeof iso === 'string' ? iso.slice(0, 16).replace('T', ' ') : '?');

// ── Canvas: ramas y hojas ────────────────────────────────────────────────────

export interface CanvasNames {
  leaves: Map<string, string>;
  templates: Map<string, string>;
}

export function canvasNames(branches: any[], templates: any[] = []): CanvasNames {
  return {
    leaves: new Map(branches.flatMap((b) => (b.leaves ?? []).map((l: any) => [l.id, l.name] as [string, string]))),
    templates: new Map(templates.map((t) => [t.id, t.name] as [string, string])),
  };
}

/** Una hoja en una línea: qué es, qué dice, qué escucha y a dónde va. */
export function leafLine(leaf: any, names: CanvasNames): string {
  const c = leaf.config ?? {};
  const leafName = (id: string) => names.leaves.get(id) ?? id;
  const parts = [`- ${leaf.name} (${leaf.type}${leaf.is_start ? ', inicio' : ''}) [${leaf.id}]`];

  if (c.intentName && c.intentName !== leaf.name) parts.push(`intención ${c.intentName}`);
  if (c.eventName) parts.push(`evento ${c.eventName}`);
  if (c.contextName) parts.push(`contexto ${c.contextName}`);

  // isCustomResponse decide si habla con su propio texto o con una plantilla.
  const template = c.messageTemplateId ? names.templates.get(c.messageTemplateId) ?? c.messageTemplateId : '';
  const text = c.messageText || (typeof c.message === 'string' ? c.message : '');
  if (template && (c.isCustomResponse === false || !text)) parts.push(`plantilla ${template}`);
  else if (text) parts.push(`dice "${clip(text)}"`);

  const route = (x: any) => {
    const label = x?.name ?? x?.eventName ?? x?.event ?? x?.id ?? String(x);
    const target = x?.targetLeafId ? leafName(x.targetLeafId) : '';
    return target && target !== label ? `${label}→${target}` : label;
  };
  if (Array.isArray(c.intents) && c.intents.length) parts.push(`escucha: ${list(c.intents.map(route), 12)}`);
  if (Array.isArray(c.events) && c.events.length) parts.push(`eventos: ${list(c.events.map(route))}`);

  const tools = (c.toolIds?.length ?? 0) + (c.toolId ? 1 : 0);
  if (tools) parts.push(`${tools} API`);
  if (c.scriptIds?.length) parts.push(`${c.scriptIds.length} script`);
  if (c.llamaWebhook) parts.push('webhook');
  if (Array.isArray(c.linkedBranches) && c.linkedBranches.length) parts.push(`enlaza ${c.linkedBranches.length} rama(s)`);
  if (c.nextLeafId) parts.push(`→ ${leafName(c.nextLeafId)}`);
  return parts.join(' · ');
}

export function branchLine(branch: any, names?: CanvasNames): string {
  const leaves = branch.leaves ?? [];
  const parts = [`Rama "${branch.name}" [${branch.id}]`];
  if (branch.is_default) parts.push('por defecto');
  if (branch.start_leaf_id) parts.push(`inicio: ${names?.leaves.get(branch.start_leaf_id) ?? branch.start_leaf_id}`);
  if (Array.isArray(branch.leaves)) parts.push(`${leaves.length} hojas`);
  if (branch.description) parts.push(clip(branch.description, 80));
  return parts.join(' · ');
}

export function branchOutline(branch: any, names: CanvasNames): string {
  return [branchLine(branch, names), ...(branch.leaves ?? []).map((l: any) => `  ${leafLine(l, names)}`)].join('\n');
}

/** Lista de ramas sin sus hojas (las hojas sólo se cuentan). */
export function branchesSummary(branches: any[]): string {
  const names = canvasNames(branches);
  return [`Ramas (${branches.length}):`, ...branches.map((b) => `- ${branchLine(b, names)}`)].join('\n');
}

// ── NLU: intenciones y entidades ─────────────────────────────────────────────

export function intentLine(intent: any): string {
  const params = (intent.entities ?? []).map((p: any) => `${p.parameterName || p.name}${p.required ? '*' : ''}`);
  const parts = [`- ${intent.name} [${intent.id}]`];
  if (intent.type && intent.type !== 'conversational') parts.push(intent.type);
  parts.push(`${(intent.patterns ?? []).length} frases`);
  if (params.length) parts.push(`parámetros: ${list(params)}`);
  return parts.join(' · ');
}

export function intentsSummary(intents: any[]): string {
  return [`Intenciones (${intents.length}), * = parámetro obligatorio:`, ...intents.map(intentLine)].join('\n');
}

export function entityLine(entity: any): string {
  const parts = [`- ${entity.name} [${entity.id}] ${entity.type ?? 'simple'}`];
  if (entity.pattern) parts.push(`regex ${clip(entity.pattern, 60)}`);
  const values = (entity.values ?? []).map((v: any) => v?.key ?? v?.value ?? String(v));
  if (values.length) parts.push(`${values.length} valores: ${clip(list(values, 6), 90)}`);
  return parts.join(' · ');
}

export function entitiesSummary(entities: any[]): string {
  return [`Entidades (${entities.length}):`, ...entities.map(entityLine)].join('\n');
}

// ── Plantillas de mensaje ────────────────────────────────────────────────────

export function templateLine(template: any): string {
  const parts = [`- ${template.name} [${template.id}]`];
  const text = template.text || template.responses?.find((r: any) => r?.type === 'text')?.value;
  if (text) parts.push(`"${clip(text, 50)}"`);
  const blocks = (template.responses ?? []).map((r: any) => r?.type).filter((t: any) => t && t !== 'text');
  if (blocks.length) parts.push(`bloques: ${[...new Set(blocks)].join(', ')}`);
  return parts.join(' · ');
}

export function templatesSummary(templates: any[]): string {
  return [`Plantillas (${templates.length}):`, ...templates.map(templateLine)].join('\n');
}

// ── El bot completo ──────────────────────────────────────────────────────────

export function treeHeader(tree: any): string {
  const parts = [`Bot "${tree.name}" [${tree.tree_id ?? tree.id}]`];
  if (tree.purpose) parts.push(`propósito ${tree.purpose}`);
  if (tree.primary_language) parts.push(`idioma ${tree.primary_language}`);
  if (tree.nlp_mode) parts.push(`NLP ${tree.nlp_mode}`);
  if (tree.ml_confidence_threshold !== undefined) parts.push(`umbral ML ${tree.ml_confidence_threshold}`);
  if (tree.fuzzy_confidence_threshold !== undefined) parts.push(`umbral difuso ${tree.fuzzy_confidence_threshold}`);
  return parts.join(' · ');
}

export function treeOutline(data: { tree: any; branches: any[]; intents: any[]; entities: any[]; templates: any[] }): string {
  const names = canvasNames(data.branches, data.templates);
  const leafCount = data.branches.reduce((s, b) => s + (b.leaves?.length ?? 0), 0);
  return [
    treeHeader(data.tree),
    DETAIL_HINT,
    '',
    `RAMAS (${data.branches.length}, ${leafCount} hojas)`,
    ...data.branches.map((b) => branchOutline(b, names)),
    '',
    intentsSummary(data.intents),
    '',
    entitiesSummary(data.entities),
    '',
    templatesSummary(data.templates),
  ].join('\n');
}

// ── Herramientas del bot: APIs y scripts ─────────────────────────────────────

const varNames = (vars: any[] | undefined) => (vars ?? []).map((v) => v?.name).filter(Boolean);

export function fertilizersSummary(config: any): string {
  const tools: any[] = config?.additionalFertilizers ?? config?.additional_tools ?? [];
  // El backend devuelve los scripts dos veces (scripts y custom_scripts): se usa uno.
  const scripts: any[] = config?.scripts ?? config?.custom_scripts ?? [];
  const main = config?.mainFertilizer;
  const io = (x: any) => {
    const parts: string[] = [];
    const ins = varNames(x.inputVariables);
    const outs = varNames(x.outputVariables);
    if (ins.length) parts.push(`entradas: ${list(ins)}`);
    if (outs.length) parts.push(`salidas: ${list(outs)}`);
    return parts;
  };
  const state = (x: any) => [x.status ? `estado ${x.status}` : '', x.enabled === false ? 'desactivada' : ''].filter(Boolean);
  return [
    main ? `Webhook principal: ${main.enabled ? 'activo' : 'inactivo'}${main.url ? ` · ${clip(main.url, 80)}` : ''}` : 'Webhook principal: no configurado',
    `APIs (${tools.length}):`,
    ...tools.map((t) => [`- ${t.name} [${t.id}] ${t.method ?? 'POST'} ${clip(t.url, 80)}`, ...state(t), ...io(t)].join(' · ')),
    `Scripts (${scripts.length}):`,
    ...scripts.map((s) => [`- ${s.name} [${s.id}] ${s.language ?? 'python'}`, ...state(s), ...io(s)].join(' · ')),
    DETAIL_HINT.replace('tipo', 'tipo "tool" o "script"'),
  ].join('\n');
}

// ── Historiales ──────────────────────────────────────────────────────────────

/** Campos de primer nivel que cambiaron entre `before` y `after`. */
export function changedFields(changes: any): string[] {
  const before = changes?.before ?? {};
  const after = changes?.after ?? {};
  if (typeof before !== 'object' || typeof after !== 'object') return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
}

export function changeLine(entry: any): string {
  const who = entry.change_metadata?.user_name || entry.change_metadata?.username || entry.user_id || '?';
  const parts = [`- ${when(entry.created_at)} · ${who} · ${entry.action} ${entry.entity_type} "${clip(entry.entity_name, 50)}" [${entry.change_id}]`];
  const fields = changedFields(entry.changes);
  if (fields.length) parts.push(`campos: ${list(fields)}`);
  return parts.join(' · ');
}

export function changeHistorySummary(entries: any[]): string {
  return [
    `Cambios (${entries.length}, del más reciente al más antiguo):`,
    ...entries.map(changeLine),
    'El antes/después de un cambio: treeflow_list_change_history con change_id.',
  ].join('\n');
}

export function trainingLine(item: any): string {
  const s = item.changes_summary ?? {};
  const parts = [`- ${when(item.started_at)} · ${item.status} · ${item.training_type ?? 'entrenamiento'}`];
  if (item.total_duration_seconds !== undefined) parts.push(`${Math.round(item.total_duration_seconds)} s`);
  if (item.user_name) parts.push(item.user_name);
  // branches_added y leaves_added usan los nombres viejos (son intenciones y entidades)
  // y repiten los totales: no se muestran.
  const counts = [
    s.intents_total !== undefined ? `${s.intents_total} intenciones` : '',
    s.entities_total !== undefined ? `${s.entities_total} entidades` : '',
  ].filter(Boolean);
  if (counts.length) parts.push(counts.join(', '));
  if (item.error_message) parts.push(`error${item.error_phase ? ` en ${item.error_phase}` : ''}: ${clip(item.error_message, 120)}`);
  return parts.join(' · ');
}

export function trainingHistorySummary(page: any): string {
  const items: any[] = page?.items ?? [];
  const header = page?.total !== undefined
    ? `Entrenamientos: página ${page.page} de ${page.total_pages} (${page.total} en total)`
    : `Entrenamientos (${items.length})`;
  return [header, ...items.map(trainingLine)].join('\n');
}

export function toolLogLine(log: any): string {
  const name = log.request_data?.tool_name ?? log.fertilizer_id;
  const parts = [`- ${when(log.created_at)} · ${name} · ${log.success ? 'ok' : 'error'}${log.status_code ? ` ${log.status_code}` : ''}`];
  if (log.execution_time_ms !== undefined) parts.push(`${log.execution_time_ms} ms`);
  if (log.error_message) parts.push(`error: ${clip(log.error_message, 120)}`);
  const inputs = log.request_data?.inputs;
  if (inputs && Object.keys(inputs).length) parts.push(`entradas ${clip(JSON.stringify(inputs), 120)}`);
  const outputs = log.response_data?.outputs;
  if (outputs && Object.keys(outputs).length) parts.push(`salidas ${clip(JSON.stringify(outputs), 160)}`);
  else if (log.response_data?.estado) parts.push(`estado ${log.response_data.estado}`);
  return parts.join(' · ');
}

export function toolLogsSummary(page: any): string {
  const items: any[] = page?.items ?? (Array.isArray(page) ? page : []);
  const header = page?.total !== undefined ? `Ejecuciones (${items.length} de ${page.total}):` : `Ejecuciones (${items.length}):`;
  return [header, ...items.map(toolLogLine)].join('\n');
}

// ── Detalle de una pieza ─────────────────────────────────────────────────────

const NOISE = new Set(['created_at', 'updated_at', 'tree_id', 'workspace_id']);

/** Quita lo que no sirve para entender ni para editar: fechas, IDs de contexto y nulos. */
export function withoutNoise<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (NOISE.has(k) || v === null || v === undefined) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}
