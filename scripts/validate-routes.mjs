#!/usr/bin/env node
/**
 * Valida que cada llamada HTTP de src/client/treeflowClient.ts corresponda
 * a una ruta real del backend de Treeflow.
 *
 * Uso:
 *   node scripts/validate-routes.mjs                       # baja el spec de TREEFLOW_URL
 *   node scripts/validate-routes.mjs --spec openapi.json   # usa un spec local
 *
 * Sale con codigo 1 si alguna ruta no existe o el metodo no coincide.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLIENT = path.join(ROOT, 'src', 'client', 'treeflowClient.ts');

const argv = process.argv.slice(2);
const specFlag = argv.indexOf('--spec');
const specFile = specFlag !== -1 ? argv[specFlag + 1] : null;
const baseUrl = (process.env.TREEFLOW_URL || 'http://localhost:8000').replace(/\/+$/, '');

/** `/trees/${treeId}/intents` -> `/trees/{}/intents` */
const normalize = (p) =>
  p.replace(/\$\{[^}]*\}/g, '{}').replace(/\{[^}]*\}/g, '{}').replace(/\/+$/, '') || '/';

function extractCalls(source) {
  const calls = [];
  const re = /this\.client\.(get|post|put|delete|patch)\(\s*(`[^`]*`|'[^']*'|"[^"]*")/g;
  const lines = source.split('\n');
  let m;
  while ((m = re.exec(source)) !== null) {
    calls.push({
      method: m[1].toUpperCase(),
      raw: m[2].slice(1, -1),
      line: lines.length - source.slice(m.index).split('\n').length + 1,
    });
  }
  return calls;
}

async function loadSpec() {
  if (specFile) return JSON.parse(fs.readFileSync(specFile, 'utf8'));
  const url = `${baseUrl}/openapi.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo bajar ${url}: HTTP ${res.status}`);
  return res.json();
}

const spec = await loadSpec();
const routes = new Map(); // path normalizado -> Set(metodos)
for (const [p, ops] of Object.entries(spec.paths)) {
  const key = normalize(p);
  if (!routes.has(key)) routes.set(key, new Set());
  for (const verb of Object.keys(ops)) routes.get(key).add(verb.toUpperCase());
}

const calls = extractCalls(fs.readFileSync(CLIENT, 'utf8'));
const problems = [];

console.log(`Spec: ${specFile || `${baseUrl}/openapi.json`}  (${routes.size} rutas)`);
console.log(`Cliente: src/client/treeflowClient.ts  (${calls.length} llamadas)\n`);

for (const call of calls) {
  const key = normalize(call.raw);
  const methods = routes.get(key);
  let status;
  if (!methods) {
    status = 'FALTA   ';
    problems.push({ ...call, key, reason: 'la ruta no existe en el backend' });
  } else if (!methods.has(call.method)) {
    status = 'METODO  ';
    problems.push({
      ...call,
      key,
      reason: `la ruta existe pero solo acepta ${[...methods].sort().join(', ')}`,
    });
  } else {
    status = 'ok      ';
  }
  console.log(`${status} ${call.method.padEnd(6)} ${call.raw}`);
}

if (problems.length) {
  console.log(`\n${problems.length} problema(s):\n`);
  for (const p of problems) {
    console.log(`  L${p.line}  ${p.method} ${p.raw}`);
    console.log(`        -> ${p.reason} (normalizado: ${p.key})`);
  }
  process.exit(1);
}

console.log(`\nTodas las ${calls.length} llamadas corresponden a rutas reales del backend.`);
