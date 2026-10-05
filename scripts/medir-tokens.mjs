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
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Un error de axios sin atrapar imprime la petición entera, cabecera con la clave incluida.
process.on('unhandledRejection', (e) => {
  console.error(`Error: ${e?.response?.status ?? ''} ${e?.message ?? e}`.trim());
  process.exit(1);
});

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

const dist = (p) => import(pathToFileURL(path.join(ROOT, 'dist', p)).href);
const { TreeflowClient } = await dist('client/treeflowClient.js');
const { buildToolGroups, INSTRUCTIONS } = await dist('catalog.js');

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
  for (const t of reads) {
    const required = t.inputSchema?.required ?? [];
    const missing = required.filter((k) => known[k] === undefined);
    if (missing.length) {
      rows.push({ name: t.name, note: `necesita ${missing.join(', ')}` });
      continue;
    }
    const args = Object.fromEntries(required.map((k) => [k, known[k]]));
    // Las de detalle aceptan cualquiera de los dos para ubicar la hoja
    if (t.name === 'treeflow_get_leaf') Object.assign(args, { tree_id: known.tree_id, leaf_id: known.leaf_id });
    try {
      const r = await t.handler(args);
      const text = (r.content ?? []).map((c) => c.text ?? '').join('');
      rows.push({ name: t.name, chars: text.length });
    } catch (e) {
      rows.push({ name: t.name, note: `error ${fail(e)}` });
    }
  }
  rows.sort((a, b) => (b.chars ?? -1) - (a.chars ?? -1));
  for (const r of rows) {
    result.lecturas[r.name] = r.chars ?? r.note;
    const size = r.chars === undefined ? '' : `${fmt(r.chars).padStart(8)} car.  ~${fmt(tok(r.chars))} tok`;
    console.log(`  ${r.name.replace('treeflow_', '').padEnd(32)} ${size}${r.note ? `(${r.note})` : ''}`);
  }
}

if (saveTo) {
  fs.writeFileSync(saveTo, JSON.stringify(result, null, 2));
  console.log(`\nGuardado en ${saveTo}`);
}
