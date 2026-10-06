#!/usr/bin/env node
/**
 * Mide cuánto texto le entrega el MCP al modelo: el catálogo de herramientas (que viaja
 * en cada llamada) y las respuestas de las herramientas de lectura sobre un bot.
 * Sólo imprime tamaños: nunca el contenido, la URL ni la clave.
 *
 * Uso (desde la raíz del repo, después de npm run build):
 *   node scripts/medir-tokens.mjs                         # sólo el catálogo
 *   node scripts/medir-tokens.mjs --arbol "CECYTECH BUENO" # catálogo + lecturas de ese bot
 *   node scripts/medir-tokens.mjs --arbol <id> --guardar medicion.json
 *
 * La conexión sale de TREEFLOW_URL, TREEFLOW_API_KEY y TREEFLOW_WORKSPACE_ID (o de .env).
 * Los tokens son una estimación: caracteres / 3.5.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import './sin-fugas.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};
const treeRef = flag('--arbol');
const saveTo = flag('--guardar');

// Sin --arbol no hace falta conexión: basta con que el cliente se pueda construir.
if (!treeRef) {
  process.env.TREEFLOW_API_KEY ||= 'sin-conexion';
  process.env.TREEFLOW_WORKSPACE_ID ||= 'sin-conexion';
}
process.chdir(ROOT); // config.ts lee el .env del directorio actual
// export_tree escribe un archivo: al medir, que vaya a una carpeta temporal.
process.env.TREEFLOW_EXPORT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'treeflow-medir-'));

const dist = (p) => import(pathToFileURL(path.join(ROOT, 'dist', p)).href);
const { TreeflowClient } = await dist('client/treeflowClient.js');
const { buildToolGroups, INSTRUCTIONS, TOOLSETS, buildInstructions, enableToolsTool, parseToolsets, toolsetOf } = await dist('catalog.js');

const tok = (chars) => Math.round(chars / 3.5);
const fmt = (n) => n.toLocaleString('es-MX');
const client = new TreeflowClient();
const groups = buildToolGroups(client);
const tools = Object.values(groups).flat();
const result = { fecha: new Date().toISOString(), catalogo: {}, lecturas: {} };

// 1. Catálogo: lo mismo que el servidor manda en tools/list
const toolChars = (t) => JSON.stringify({ name: t.name, description: t.description, inputSchema: t.inputSchema }).length;
let total = 0;
console.log('CATÁLOGO (viaja en cada llamada)');
for (const [group, list] of Object.entries(groups).sort((a, b) => b[1].reduce((s, t) => s + toolChars(t), 0) - a[1].reduce((s, t) => s + toolChars(t), 0))) {
  const chars = list.reduce((s, t) => s + toolChars(t), 0);
  total += chars;
  result.catalogo[group] = { herramientas: list.length, caracteres: chars };
  console.log(`  ${group.padEnd(14)} ${String(list.length).padStart(2)} herr.  ${fmt(chars).padStart(7)} car.  ~${fmt(tok(chars))} tok`);
}
result.catalogo.total = { herramientas: tools.length, caracteres: total };
result.catalogo.instrucciones = { caracteres: INSTRUCTIONS.length };
console.log(`  ${'TOTAL'.padEnd(14)} ${String(tools.length).padStart(2)} herr.  ${fmt(total).padStart(7)} car.  ~${fmt(tok(total))} tok`);
console.log(`  instrucciones          ${fmt(INSTRUCTIONS.length).padStart(7)} car.  ~${fmt(tok(INSTRUCTIONS.length))} tok`);

// Lo que de verdad viaja: los grupos activos (TREEFLOW_TOOLSETS o los de por defecto)
console.log('\nPOR GRUPO');
for (const group of ['base', ...Object.keys(TOOLSETS)]) {
  const list = tools.filter((t) => toolsetOf(t.name) === group);
  const chars = list.reduce((s, t) => s + toolChars(t), 0);
  console.log(`  ${group.padEnd(14)} ${String(list.length).padStart(2)} herr.  ${fmt(chars).padStart(7)} car.  ~${fmt(tok(chars))} tok`);
}
const { active } = parseToolsets(process.env.TREEFLOW_TOOLSETS);
const visible = tools.filter((t) => active.has(toolsetOf(t.name)));
const enable = enableToolsTool(active, tools, async () => {});
if (enable) visible.push(enable);
const visibleChars = visible.reduce((s, t) => s + toolChars(t), 0);
const instr = buildInstructions(active).length;
result.porLlamada = { grupos: [...active], herramientas: visible.length, catalogo: visibleChars, instrucciones: instr };
console.log(
  `\nPOR LLAMADA con ${[...active].join(', ')}: ${visible.length} herr., ${fmt(visibleChars)} car. de catálogo + ` +
  `${fmt(instr)} de instrucciones = ~${fmt(tok(visibleChars + instr))} tok`
);

// 2. Lecturas sobre un bot
if (treeRef) {
  const fail = (e) => `${e?.response?.status ?? ''} ${e?.response?.data?.detail ?? e?.message ?? e}`.trim();
  let trees;
  try {
    trees = await client.listTrees();
  } catch (e) {
    console.error(`\nNo se pudo listar los bots: ${fail(e)}`);
    process.exit(1);
  }
  const tree = trees.find((t) => t.tree_id === treeRef || t.name === treeRef);
  if (!tree) {
    console.error(`\nNo existe el bot "${treeRef}". Hay: ${trees.map((t) => t.name).join(', ')}`);
    process.exit(1);
  }
  const branches = await client.listBranches(tree.tree_id);
  const branch = [...branches].sort((a, b) => (b.leaves?.length ?? 0) - (a.leaves?.length ?? 0))[0];
  const leaf = branch?.leaves?.[0];
  const intents = await client.listIntents(tree.tree_id).catch(() => []);
  const entities = await client.listEntities(tree.tree_id).catch(() => []);
  const known = {
    tree_id: tree.tree_id,
    branch_id: branch?.id,
    leaf_id: leaf?.id,
    intent_id: intents[0]?.id ?? intents[0]?.intent_id,
    entity_id: entities[0]?.id ?? entities[0]?.entity_id,
  };

  console.log(`\nLECTURAS sobre "${tree.name}" (${branches.length} ramas, ${branches.reduce((s, b) => s + (b.leaves?.length ?? 0), 0)} hojas)`);
  const reads = tools.filter((t) => /^treeflow_(list|get|export)_/.test(t.name));
  const rows = [];
  const measure = async (label, tool, args) => {
    try {
      const r = await tool.handler(args);
      const text = (r.content ?? []).map((c) => c.text ?? '').join('');
      rows.push({ name: label, chars: text.length });
    } catch (e) {
      rows.push({ name: label, note: `error ${fail(e)}` });
    }
  };
  for (const t of reads) {
    if (t.name === 'treeflow_get_detail') {
      // Una medición por tipo, con la primera pieza de cada uno.
      for (const [tipo, ref] of [['leaf', known.leaf_id], ['intent', known.intent_id], ['entity', known.entity_id]]) {
        if (ref) await measure(`${t.name}(${tipo})`, t, { tree_id: known.tree_id, tipo, ref });
      }
      continue;
    }
    const required = t.inputSchema?.required ?? [];
    const missing = required.filter((k) => known[k] === undefined);
    if (missing.length) {
      rows.push({ name: t.name, note: `necesita ${missing.join(', ')}` });
      continue;
    }
    await measure(t.name, t, Object.fromEntries(required.map((k) => [k, known[k]])));
  }
  rows.sort((a, b) => (b.chars ?? -1) - (a.chars ?? -1));
  for (const r of rows) {
    result.lecturas[r.name] = r.chars ?? r.note;
    const size = r.chars === undefined ? '' : `${fmt(r.chars).padStart(8)} car.  ~${fmt(tok(r.chars))} tok`;
    console.log(`  ${r.name.replace('treeflow_', '').padEnd(32)} ${size}${r.note ? `(${r.note})` : ''}`);
  }
}

fs.rmSync(process.env.TREEFLOW_EXPORT_DIR, { recursive: true, force: true });

if (saveTo) {
  fs.writeFileSync(saveTo, JSON.stringify(result, null, 2));
  console.log(`\nGuardado en ${saveTo}`);
}
