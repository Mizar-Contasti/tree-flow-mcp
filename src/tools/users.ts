import { TreeflowClient } from '../client/treeflowClient.js';

export function registerUserTools(client: TreeflowClient) {
  return [
    {
      name: 'treeflow_list_users',
      description: 'Lista todos los usuarios miembros del workspace actual con sus roles y estados.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        const users = await client.listUsers();
        return {
          content: [{ type: 'text', text: JSON.stringify(users, null, 2) }],
        };
      },
    },
    {
      name: 'treeflow_create_user',
      description: 'Invita o crea un nuevo usuario en el workspace con rol desarrollador o viewer.',
      inputSchema: {
        type: 'object',
        properties: {
          username: { type: 'string', description: 'Nombre de usuario único' },
          email: { type: 'string', description: 'Correo electrónico' },
          role: { type: 'string', description: 'Rol: desarrollador o viewer' },
          name: { type: 'string', description: 'Nombre completo' },
        },
        required: ['username', 'email', 'role'],
      },
      handler: async (args: { username: string; email: string; role: string; name?: string }) => {
        const result = await client.createUser(args);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    },
    {
      name: 'treeflow_update_user',
      description: 'Actualiza el rol o estado activo de un usuario existente.',
      inputSchema: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'ID del usuario' },
          role: { type: 'string', description: 'Nuevo rol (desarrollador, viewer)' },
          is_active: { type: 'boolean', description: 'Activo o inactivo' },
        },
        required: ['user_id'],
      },
      handler: async (args: { user_id: string; role?: string; is_active?: boolean }) => {
        const result = await client.updateUser(args.user_id, {
          role: args.role,
          is_active: args.is_active,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    },
    {
      name: 'treeflow_list_credentials',
      description: 'Lista los proveedores de IA configurados en el workspace (OpenAI, Gemini, Groq, Twilio, Meta) para verificar disponibilidad.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        const result = await client.listCredentials();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    },
  ];
}
