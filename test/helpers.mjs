// Utilidades de prueba: un cliente que no toca la red y datos sintéticos de un bot.
import { TreeflowClient } from '../dist/client/treeflowClient.js';

/**
 * Cliente real con los métodos HTTP sustituidos por `overrides`. Lo que no se sustituye
 * falla en vez de salir a la red, para que una prueba nunca dependa de un backend.
 */
export function clienteFalso(overrides = {}) {
  process.env.TREEFLOW_API_KEY ||= 'prueba';
  process.env.TREEFLOW_WORKSPACE_ID ||= 'prueba';
  const client = new TreeflowClient();
  const fail = (method, url) => {
    throw new Error(`La prueba llamó ${method} ${url} sin simularlo`);
  };
  client.client = {
    get: async (url) => fail('GET', url),
    post: async (url) => fail('POST', url),
    put: async (url) => fail('PUT', url),
    delete: async (url) => fail('DELETE', url),
  };
  return Object.assign(client, overrides);
}

/** Texto de la respuesta de una herramienta. */
export const texto = (r) => r.content.map((c) => c.text).join('');

/**
 * Cliente con un HTTP falso: GET responde desde `routes`; GET, PUT, POST y DELETE se
 * registran en `sent`. Devuelve las herramientas sin el prefijo treeflow_.
 */
export async function conHttp(routes) {
  const { buildTools } = await import('../dist/catalog.js');
  const client = clienteFalso();
  const sent = [];
  const respond = (url) => {
    sent.push({ method: 'GET', url });
    for (const [pattern, data] of Object.entries(routes)) if (url === pattern) return { data: structuredClone(data) };
    throw new Error(`GET sin simular: ${url}`);
  };
  client.client = {
    get: async (url) => respond(url),
    put: async (url, body) => (sent.push({ method: 'PUT', url, body }), { data: body }),
    post: async (url, body) => (sent.push({ method: 'POST', url, body }), { data: body }),
    delete: async (url) => (sent.push({ method: 'DELETE', url }), { data: {} }),
  };
  const tools = Object.fromEntries(buildTools(client).map((t) => [t.name.replace('treeflow_', ''), t]));
  return { tools, sent, client };
}
