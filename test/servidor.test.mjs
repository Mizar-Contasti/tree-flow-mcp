// El servidor de verdad, por stdio, con el cliente del SDK: grupos y aviso de lista cambiada.
// No toca la red: listar y activar herramientas no llama al backend.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ToolListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';

const SERVER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/index.js');

async function conectar(env = {}) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER],
    env: { ...process.env, TREEFLOW_URL: 'http://127.0.0.1:9', TREEFLOW_API_KEY: 'prueba', TREEFLOW_WORKSPACE_ID: 'prueba', TREEFLOW_TOOLSETS: '', ...env },
    stderr: 'ignore',
  });
  const client = new Client({ name: 'prueba', version: '0' });
  await client.connect(transport);
  return client;
}

test('por defecto ofrece la base, capturas y respaldos, y la herramienta para activar el resto', async () => {
  const client = await conectar();
  try {
    const names = (await client.listTools()).tools.map((t) => t.name);
    assert.ok(names.includes('treeflow_get_tree_data') && names.includes('treeflow_save_capture') && names.includes('treeflow_create_backup'));
    assert.ok(!names.includes('treeflow_save_tool'), 'las APIs no vienen por defecto');
    assert.ok(names.includes('treeflow_enable_tools'));
    assert.match(client.getInstructions(), /HAY MÁS HERRAMIENTAS sin cargar \(apis, pruebas, atencion, historial, admin\)/);
  } finally {
    await client.close();
  }
});

test('activar un grupo avisa al cliente y la lista nueva lo incluye', async () => {
  const client = await conectar();
  try {
    const aviso = new Promise((resolve) => client.setNotificationHandler(ToolListChangedNotificationSchema, () => resolve(true)));
    const r = await client.callTool({ name: 'treeflow_enable_tools', arguments: { grupos: ['apis'] } });
    assert.match(r.content[0].text, /^Activados: apis/);
    assert.equal(await aviso, true);
    const names = (await client.listTools()).tools.map((t) => t.name);
    assert.ok(names.includes('treeflow_save_tool'));
  } finally {
    await client.close();
  }
});

test('llamar a una herramienta de un grupo inactivo dice cómo activarlo', async () => {
  const client = await conectar();
  try {
    const r = await client.callTool({ name: 'treeflow_run_test_suite', arguments: { suite_id: 'x' } });
    assert.equal(r.isError, true);
    assert.match(r.content[0].text, /es del grupo pruebas, que no está activo\. Actívalo con treeflow_enable_tools/);
  } finally {
    await client.close();
  }
});

test('TREEFLOW_TOOLSETS=todo carga todo y no ofrece activar nada', async () => {
  const client = await conectar({ TREEFLOW_TOOLSETS: 'todo' });
  try {
    const names = (await client.listTools()).tools.map((t) => t.name);
    assert.equal(names.length, 67);
    assert.ok(!names.includes('treeflow_enable_tools'));
  } finally {
    await client.close();
  }
});
