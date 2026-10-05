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
