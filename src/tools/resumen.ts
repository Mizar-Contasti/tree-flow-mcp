import { maskUrl } from '../client/treeflowClient.js';

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

/** Fecha legible desde ISO o desde un número Unix (en segundos o en milisegundos). */
const when = (value: unknown) => {
  if (typeof value === 'number') value = new Date(value > 1e12 ? value : value * 1000).toISOString();
  return typeof value === 'string' ? value.slice(0, 16).replace('T', ' ') : '?';
};

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

export const SECTIONS = ['canvas', 'ramas', 'intenciones', 'entidades', 'plantillas'] as const;
export type Section = (typeof SECTIONS)[number];
export const DEFAULT_SECTIONS: Section[] = ['canvas', 'intenciones'];

/**
 * El bot por secciones. canvas = ramas con una línea por hoja; ramas = sólo las ramas. Lo que
 * no se pide se cuenta al final, para que el modelo sepa que existe y cómo pedirlo.
 */
export function treeOutline(
  data: { tree: any; branches: any[]; intents: any[]; entities: any[]; templates: any[] },
  sections: Section[] = DEFAULT_SECTIONS,
  branchFilter?: string
): string {
  const want = new Set(sections);
  let branches = data.branches;
  if (branchFilter) {
    const wanted = branchFilter.trim().toLowerCase();
    branches = branches.filter((b) => b.id === branchFilter || String(b.name).trim().toLowerCase() === wanted);
    if (!branches.length) throw new Error(`No existe la rama "${branchFilter}". Hay: ${data.branches.map((b) => b.name).join(', ')}.`);
  }
  const names = canvasNames(data.branches, data.templates);
  const leafCount = branches.reduce((s, b) => s + (b.leaves?.length ?? 0), 0);
  const out = [treeHeader(data.tree), DETAIL_HINT];
  if (want.has('canvas')) out.push('', `RAMAS (${branches.length}, ${leafCount} hojas)`, ...branches.map((b) => branchOutline(b, names)));
  else if (want.has('ramas')) out.push('', branchesSummary(branches));
  if (want.has('intenciones')) out.push('', intentsSummary(data.intents));
  if (want.has('entidades')) out.push('', entitiesSummary(data.entities));
  if (want.has('plantillas')) out.push('', templatesSummary(data.templates));
  const missing = [
    !want.has('canvas') && !want.has('ramas') ? `${data.branches.length} ramas` : '',
    !want.has('intenciones') ? `${data.intents.length} intenciones` : '',
    !want.has('entidades') ? `${data.entities.length} entidades` : '',
    !want.has('plantillas') ? `${data.templates.length} plantillas` : '',
  ].filter(Boolean);
  if (missing.length) out.push('', `No incluido: ${missing.join(', ')}. Pídelo con secciones.`);
  return out.join('\n');
}

// ── Herramientas del bot: APIs y scripts ─────────────────────────────────────

const varNames = (vars: any[] | undefined) => (vars ?? []).map((v) => v?.name).filter(Boolean);

function ioParts(x: any): string[] {
  const parts: string[] = [];
  const ins = varNames(x.inputVariables);
  const outs = varNames(x.outputVariables);
  if (ins.length) parts.push(`entradas: ${list(ins)}`);
  if (outs.length) parts.push(`salidas: ${list(outs)}`);
  return parts;
}
const stateParts = (x: any) => [x.status ? `estado ${x.status}` : '', x.enabled === false ? 'desactivada' : ''].filter(Boolean);

export const toolLine = (t: any) =>
  [`- ${t.name} [${t.id}] ${t.method ?? 'POST'} ${clip(maskUrl(t.url ?? ''), 80)}`, ...stateParts(t), ...ioParts(t)].join(' · ');
export const scriptLine = (s: any) =>
  [`- ${s.name} [${s.id}] ${s.language ?? 'python'}`, ...stateParts(s), ...ioParts(s)].join(' · ');

export function fertilizersSummary(config: any): string {
  const tools: any[] = config?.additionalFertilizers ?? config?.additional_tools ?? [];
  // El backend devuelve los scripts dos veces (scripts y custom_scripts): se usa uno.
  const scripts: any[] = config?.scripts ?? config?.custom_scripts ?? [];
  const main = config?.mainFertilizer;
  return [
    main ? `Webhook principal: ${main.enabled ? 'activo' : 'inactivo'}${main.url ? ` · ${clip(maskUrl(main.url), 80)}` : ''}` : 'Webhook principal: no configurado',
    `APIs (${tools.length}):`,
    ...tools.map(toolLine),
    `Scripts (${scripts.length}):`,
    ...scripts.map(scriptLine),
    DETAIL_HINT.replace('tipo', 'tipo "tool" o "script"'),
  ].join('\n');
}

// ── Simulación y conversaciones ──────────────────────────────────────────────

/** Lo que dijo el bot en un turno, sea texto o bloque enriquecido. */
function botSaid(r: any, max: number): string {
  const resp = r?.response ?? r?.candidates?.[0]?.response;
  if (resp == null) return '(sin respuesta)';
  if (typeof resp === 'string') return `"${clip(resp, max)}"`;
  const value = resp.value ?? resp.text;
  if (resp.type === 'text' || typeof value === 'string') return `"${clip(value, max)}"`;
  return `[${resp.type ?? 'bloque'}] ${clip(JSON.stringify(value ?? resp), max)}`;
}

// Variables que pone el motor solo y que no dicen nada del flujo.
const SYSTEM_PARAMS = new Set(['last_utterance', 'last_no_match']);
const paramValues = (params: any) =>
  Object.entries(params ?? {})
    .filter(([k]) => !SYSTEM_PARAMS.has(k))
    .map(([k, p]: [string, any]) => `${k}=${clip(p?.key_value ?? p?.original_value ?? p, 40)}`);

/** Un turno simulado: qué contestó el bot, por qué, dónde quedó y cómo seguir. */
export function simulationSummary(r: any): string {
  const lines = [`Bot: ${botSaid(r, 600)}`];
  const why = [r?.intent ? `intención ${r.intent}` : 'sin intención'];
  if (typeof r?.confidence === 'number') why.push(`confianza ${r.confidence.toFixed(2)}`);
  if (r?.matching_type) why.push(r.matching_type);
  const node = r?.state?.current_node;
  if (node) why.push(`hoja ${node}${r?.state?.current_node_id ? ` [${r.state.current_node_id}]` : ''}`);
  lines.push(why.join(' · '));
  const params = paramValues(r?.parameters);
  if (params.length) lines.push(`parámetros del turno: ${params.join(', ')}`);
  const session = paramValues(r?.session_parameters).filter((p) => !params.includes(p));
  if (session.length) lines.push(`en la sesión: ${session.join(', ')}`);
  if (r?.slot_filling?.active) lines.push(`slot filling: pidiendo ${r.slot_filling.parameter ?? '?'}`);
  if (r?.session_id) lines.push(`session_id: ${r.session_id} (mándalo en el siguiente mensaje para seguir esta conversación)`);
  return lines.join('\n');
}

/** Una prueba en una línea: lo que se mandó, qué intención ganó, dónde quedó y qué dijo. */
export function testLine(message: string, r: any): string {
  const why = [r?.intent ? `intención ${r.intent}` : 'sin intención'];
  if (typeof r?.confidence === 'number') why[0] += ` (${r.confidence.toFixed(2)})`;
  if (r?.state?.current_node) why.push(`hoja ${r.state.current_node}`);
  return `- "${clip(message, 60)}" → ${why.join(' · ')} · ${botSaid(r, 100)}`;
}

export function conversationsList(convs: any[]): string {
  return [
    `Conversaciones (${convs.length}):`,
    ...convs.map((c) => {
      const parts = [`- ${c.session_id} · ${when(c.updated_at)} · ${c.turns_count ?? '?'} turnos`];
      if (c.intents?.length) parts.push(`intenciones: ${list(c.intents, 5)}`);
      if (c.first_message) parts.push(`empieza "${clip(c.first_message, 50)}"`);
      if (c.escalation_suggested) parts.push('sugiere pasar a una persona');
      return parts.join(' · ');
    }),
    'Los turnos de una: treeflow_get_conversation.',
  ].join('\n');
}

export function conversationSummary(conv: any): string {
  const turns: any[] = conv?.turns ?? [];
  return [
    `Conversación ${conv?.session_id} · ${turns.length} turnos${conv?.escalation_suggested ? ' · sugiere pasar a una persona' : ''}`,
    ...turns.map((t) => {
      const r = t.response ?? {};
      const meta = [r.intent ? `intención ${r.intent}` : '', r.state?.current_node ? `hoja ${r.state.current_node}` : ''].filter(Boolean);
      return `- usuario: "${clip(t.user_input ?? t.request?.value, 120)}" → bot: ${botSaid(r, 200)}${meta.length ? ` (${meta.join(', ')})` : ''}`;
    }),
  ].join('\n');
}

// ── Suites de prueba ─────────────────────────────────────────────────────────

export function suiteLine(suite: any): string {
  const cases = suite.total_casos ?? suite.cases?.length ?? 0;
  const turns = suite.total_turnos !== undefined ? `, ${suite.total_turnos} turnos` : '';
  return `Suite "${suite.name}" [${suite.id}] · ${cases} casos${turns}`;
}

/** Totales y sólo lo que falló: lo que pasó no hace falta leerlo. */
export function testRunSummary(run: any): string {
  const t = run?.totals ?? {};
  const lines = [
    `Ejecución [${run?.id}] · ${run?.status} · ${t.casos_ok ?? '?'}/${t.casos ?? '?'} casos bien · ${t.asserts_ok ?? '?'}/${t.asserts ?? '?'} comprobaciones bien`,
  ];
  if (run?.error_message) lines.push(`error: ${clip(run.error_message, 200)}`);
  const failed = (run?.results ?? []).filter((c: any) => !c.ok);
  if (failed.length) lines.push('Fallaron:');
  for (const c of failed) {
    lines.push(`- ${c.nombre}`);
    for (const turn of c.turnos ?? []) {
      const bad = (turn.comprobaciones ?? []).filter((v: any) => !v.ok);
      if (!bad.length && !turn.error) continue;
      lines.push(`  · "${clip(turn.mensaje, 80)}" → ${botSaid({ response: turn.respuesta }, 120)}`);
      if (turn.error) lines.push(`    error: ${clip(turn.error, 160)}`);
      for (const v of bad) {
        const what = v.tipo === 'parametro' ? `parametro ${v.nombre}` : v.tipo;
        lines.push(`    ${what}: esperaba ${JSON.stringify(v.esperado)}, obtuvo ${JSON.stringify(v.obtenido)}${v.error ? ` (${v.error})` : ''}`);
      }
    }
  }
  if (!failed.length && (run?.results ?? []).length) lines.push('Todos los casos pasaron.');
  return lines.join('\n');
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
