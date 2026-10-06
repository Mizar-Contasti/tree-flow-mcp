#!/usr/bin/env node
/**
 * Mide una sesión REAL: un modelo de Claude hace una tarea con el MCP conectado, y se
 * registra cuántas llamadas hizo, cuántos tokens le costó cada una y qué devolvió cada
 * herramienta. Sirve para comparar dos versiones del MCP con la misma tarea.
 *
 * Usa el CLI de Claude Code (`claude -p`), así que corre con la cuenta con la que esté
 * iniciada la sesión de Claude Code y gasta uso real. --tope pone un máximo en dólares.
 *
 * Uso (desde la raíz del repo, después de npm run build):
 *   node scripts/sesion-real.mjs --tarea explorar --etiqueta 1.2.0
 *   node scripts/sesion-real.mjs --tarea construir --mcp ../otra-version --etiqueta 1.1.0
 *   node scripts/sesion-real.mjs --comparar a.json b.json
 *
 * Opciones: --modelo (default claude-sonnet-5-5), --esfuerzo (default medium), --tope (USD, default 5),
 * --salida (carpeta de resultados, default <tmp>/treeflow-sesiones).
 * La conexión al backend sale de TREEFLOW_URL / TREEFLOW_API_KEY / TREEFLOW_WORKSPACE_ID (o .env).
 */
import './sin-fugas.mjs';
import 'dotenv/config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1];
};

export const TAREAS = {
  explorar: {
    bot: 'CECYTECH BUENO',
    prompt:
      'En el bot "CECYTECH BUENO" de Treeflow: explícame cómo está organizado (qué ramas tiene y para qué ' +
      'sirve cada una), qué opciones tiene el menú de alumno y qué responde el bot cuando no entiende algo. ' +
      'No modifiques nada.',
  },
  construir: {
    bot: 'MCP pruebas (Claude)',
    prompt:
      'En el bot "MCP pruebas (Claude)" de Treeflow agrega la opción de consultar el horario de atención: una ' +
      'intención nueva con al menos 5 frases de entrenamiento, una hoja que responda "Abrimos de lunes a sábado ' +
      'de 9:00 a 18:00 h." y conéctala para que se pueda preguntar desde el inicio de la conversación. Entrena el ' +
      'bot y pruébalo con dos mensajes distintos. Al final dime qué hiciste y si funcionó.',
  },
};

const SYSTEM_PROMPT =
  'Eres un asistente que ayuda a administrar chatbots en la plataforma Treeflow con las herramientas MCP ' +
  'disponibles. Responde en español, de forma breve.';

// ── Comparar dos corridas ────────────────────────────────────────────────────
if (argv.includes('--comparar')) {
  const [a, b] = argv.slice(argv.indexOf('--comparar') + 1).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  const row = (label, f) => console.log(`${label.padEnd(36)} ${String(f(a)).padStart(12)} ${String(f(b)).padStart(12)}`);
  console.log(`${''.padEnd(36)} ${a.etiqueta.padStart(12)} ${b.etiqueta.padStart(12)}`);
  row('llamadas a la API', (r) => r.llamadas);
  row('herramientas usadas', (r) => r.herramientas.total);
  row('tokens de entrada (todo)', (r) => r.tokens.entrada.toLocaleString('es-MX'));
  row('  · leídos de caché', (r) => r.tokens.cacheLeido.toLocaleString('es-MX'));
  row('  · escritos en caché', (r) => r.tokens.cacheEscrito.toLocaleString('es-MX'));
  row('  · sin caché', (r) => r.tokens.sinCache.toLocaleString('es-MX'));
  row('tokens de salida', (r) => r.tokens.salida.toLocaleString('es-MX'));
  row('contexto de la 1ª llamada', (r) => r.contexto[0]?.toLocaleString('es-MX'));
  row('contexto de la última llamada', (r) => r.contexto.at(-1)?.toLocaleString('es-MX'));
  row('caracteres devueltos por el MCP', (r) => r.herramientas.caracteres.toLocaleString('es-MX'));
  row('costo (USD, según el CLI)', (r) => r.costoUsd?.toFixed(3));
  row('duración (s)', (r) => Math.round(r.duracionMs / 1000));
  process.exit(0);
}

// ── Correr una tarea ─────────────────────────────────────────────────────────
const tareaId = flag('--tarea');
const tarea = TAREAS[tareaId];
if (!tarea) {
  console.error(`--tarea debe ser una de: ${Object.keys(TAREAS).join(', ')}`);
  process.exit(1);
}
const mcpDir = path.resolve(flag('--mcp', ROOT));
const etiqueta = flag('--etiqueta', path.basename(mcpDir));
const salida = path.resolve(flag('--salida', path.join(os.tmpdir(), 'treeflow-sesiones')));
fs.mkdirSync(salida, { recursive: true });
const base = path.join(salida, `${tareaId}-${etiqueta}-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}`);

// La config del MCP lleva la clave: va a un archivo temporal que se borra al terminar.
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'treeflow-sesion-'));
const mcpConfig = path.join(work, 'mcp.json');
fs.writeFileSync(mcpConfig, JSON.stringify({
  mcpServers: {
    treeflow: {
      command: process.execPath,
      args: [path.join(mcpDir, 'dist', 'index.js')],
      env: {
        TREEFLOW_URL: process.env.TREEFLOW_URL ?? 'http://localhost:8000',
        TREEFLOW_API_KEY: process.env.TREEFLOW_API_KEY ?? '',
        TREEFLOW_WORKSPACE_ID: process.env.TREEFLOW_WORKSPACE_ID ?? '',
        ...(process.env.TREEFLOW_TOOLSETS ? { TREEFLOW_TOOLSETS: process.env.TREEFLOW_TOOLSETS } : {}),
      },
    },
  },
}));

const args = [
  '-p', tarea.prompt,
  '--model', flag('--modelo', 'claude-sonnet-5-5'),
  '--effort', flag('--esfuerzo', 'medium'),
  '--output-format', 'stream-json', '--verbose',
  '--strict-mcp-config', '--mcp-config', mcpConfig,
  '--tools', '',
  '--allowedTools', 'mcp__treeflow',
  '--system-prompt', SYSTEM_PROMPT,
  '--no-session-persistence',
  '--max-budget-usd', String(flag('--tope', '5')),
];

console.error(`Corriendo "${tareaId}" con ${etiqueta} (${mcpDir})…`);
const raw = fs.createWriteStream(`${base}.jsonl`);
const events = [];
const child = spawn('claude', args, {
  cwd: work,
  // Que el cliente cargue todas las herramientas de entrada, como Claude Desktop, en vez
  // de buscarlas bajo demanda: si no, el peso del catálogo no se vería.
  env: { ...process.env, ENABLE_TOOL_SEARCH: 'false' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let buffer = '';
child.stdout.on('data', (chunk) => {
  raw.write(chunk);
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      /* línea que no es JSON: se queda sólo en el registro crudo */
    }
  }
});
let stderr = '';
child.stderr.on('data', (d) => (stderr += d));
const code = await new Promise((resolve) => child.on('close', resolve));
raw.end();
fs.rmSync(work, { recursive: true, force: true });

// ── Análisis ────────────────────────────────────────────────────────────────
const init = events.find((e) => e.type === 'system' && e.subtype === 'init');
const result = events.find((e) => e.type === 'result');

// Un mismo mensaje de la API puede llegar en varios eventos: se cuenta una vez por id.
const calls = new Map();
const toolUses = new Map();
for (const e of events) {
  if (e.type === 'assistant' && e.message?.id) {
    if (!calls.has(e.message.id)) calls.set(e.message.id, e.message.usage ?? {});
    for (const block of e.message.content ?? []) {
      if (block.type === 'tool_use') toolUses.set(block.id, { name: block.name.replace(/^mcp__treeflow__/, ''), input: JSON.stringify(block.input).length });
    }
  }
  if (e.type === 'user') {
    for (const block of e.message?.content ?? []) {
      if (block.type !== 'tool_result') continue;
      const text = typeof block.content === 'string' ? block.content : (block.content ?? []).map((c) => c.text ?? '').join('');
      const use = toolUses.get(block.tool_use_id);
      if (use) Object.assign(use, { result: text.length, error: Boolean(block.is_error), preview: text.slice(0, 160) });
    }
  }
}
const usage = [...calls.values()];
const sum = (k) => usage.reduce((s, u) => s + (u[k] ?? 0), 0);
const byTool = {};
for (const u of toolUses.values()) {
  const t = (byTool[u.name] ??= { veces: 0, caracteres: 0, maximo: 0, errores: 0, entrada: 0 });
  t.veces++;
  t.caracteres += u.result ?? 0;
  t.maximo = Math.max(t.maximo, u.result ?? 0);
  t.errores += u.error ? 1 : 0;
  t.entrada += u.input;
}
const report = {
  etiqueta,
  tarea: tareaId,
  modelo: init?.model,
  herramientasCargadas: (init?.tools ?? []).filter((t) => t.startsWith('mcp__treeflow__')).length,
  mcp: init?.mcp_servers,
  codigoSalida: code,
  error: result?.is_error ? result?.subtype : undefined,
  llamadas: usage.length,
  tokens: {
    sinCache: sum('input_tokens'),
    cacheEscrito: sum('cache_creation_input_tokens'),
    cacheLeido: sum('cache_read_input_tokens'),
    entrada: sum('input_tokens') + sum('cache_creation_input_tokens') + sum('cache_read_input_tokens'),
    // Los eventos parciales traen la salida a medias: el total fiable está en el resultado.
    salida: result?.usage?.output_tokens ?? sum('output_tokens'),
  },
  contexto: usage.map((u) => (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0)),
  herramientas: {
    total: toolUses.size,
    caracteres: [...toolUses.values()].reduce((s, u) => s + (u.result ?? 0), 0),
    porNombre: byTool,
    secuencia: [...toolUses.values()].map((u) => `${u.name}(${u.input}→${u.result ?? '?'}${u.error ? ' ERROR' : ''})`),
  },
  costoUsd: result?.total_cost_usd,
  duracionMs: result?.duration_ms,
  respuesta: result?.result,
  stderr: stderr.slice(-2000) || undefined,
};
fs.writeFileSync(`${base}.json`, JSON.stringify(report, null, 2));

console.log(`\n${etiqueta} · ${tareaId} · ${report.modelo} · ${report.herramientasCargadas} herramientas cargadas`);
console.log(`llamadas a la API: ${report.llamadas} · herramientas usadas: ${report.herramientas.total}`);
console.log(`tokens de entrada: ${report.tokens.entrada.toLocaleString('es-MX')} (caché leído ${report.tokens.cacheLeido.toLocaleString('es-MX')}, escrito ${report.tokens.cacheEscrito.toLocaleString('es-MX')}, sin caché ${report.tokens.sinCache.toLocaleString('es-MX')}) · salida: ${report.tokens.salida.toLocaleString('es-MX')}`);
console.log(`contexto por llamada: ${report.contexto.map((c) => c.toLocaleString('es-MX')).join(' → ')}`);
console.log(`costo: $${report.costoUsd?.toFixed(3)} · ${Math.round((report.duracionMs ?? 0) / 1000)} s${report.error ? ` · ERROR ${report.error}` : ''}`);
console.log(`secuencia: ${report.herramientas.secuencia.join(' · ')}`);
console.log(`\nResultado guardado en ${base}.json (y el registro crudo en .jsonl)`);
