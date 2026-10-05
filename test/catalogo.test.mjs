// Invariantes del catálogo: lo que un cliente MCP necesita para poder usar cada herramienta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTools, INSTRUCTIONS } from '../dist/catalog.js';
import { clienteFalso } from './helpers.mjs';

const tools = buildTools(clienteFalso());

test('cada herramienta tiene nombre único con prefijo treeflow_', () => {
  const names = tools.map((t) => t.name);
  assert.equal(new Set(names).size, names.length, 'hay nombres repetidos');
  for (const n of names) assert.match(n, /^treeflow_[a-z_]+$/);
});

test('cada herramienta tiene descripción, esquema de objeto y handler', () => {
  for (const t of tools) {
    assert.ok(t.description?.trim(), `${t.name} sin descripción`);
    assert.equal(t.inputSchema?.type, 'object', `${t.name} sin esquema de objeto`);
    assert.equal(typeof t.handler, 'function', `${t.name} sin handler`);
  }
});

test('todo parámetro obligatorio está declarado en el esquema', () => {
  for (const t of tools) {
    for (const req of t.inputSchema.required ?? []) {
      assert.ok(req in (t.inputSchema.properties ?? {}), `${t.name}: "${req}" es obligatorio pero no está en properties`);
    }
  }
});

test('las instrucciones sólo nombran herramientas que existen', () => {
  const names = new Set(tools.map((t) => t.name));
  for (const mentioned of INSTRUCTIONS.match(/treeflow_[a-z_]+/g) ?? []) {
    assert.ok(names.has(mentioned), `las instrucciones nombran ${mentioned}, que no existe`);
  }
});
