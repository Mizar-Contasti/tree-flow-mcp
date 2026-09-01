import dotenv from 'dotenv';
dotenv.config();

export interface TreeflowConfig {
  baseUrl: string;
  apiKey: string;
  workspaceId: string;
}

export function getConfig(): TreeflowConfig {
  const baseUrl = process.env.TREEFLOW_URL || process.env.TREEFLOW_BASE_URL || 'http://localhost:8000';
  const apiKey = process.env.TREEFLOW_API_KEY;
  const workspaceId = process.env.TREEFLOW_WORKSPACE_ID || 'botsmexico';

  if (!apiKey) {
    console.error('ERROR: TREEFLOW_API_KEY is required to connect to Treeflow.');
    console.error('Please generate an API Key in Treeflow (Cuentas -> Claves de API) and set it in your environment or Claude config.');
    process.exit(1);
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    apiKey,
    workspaceId,
  };
}
