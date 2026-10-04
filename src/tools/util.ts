// Respuesta estándar de una herramienta: el resultado como JSON legible.
export function ok(result: unknown) {
  return {
    content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }],
  };
}

// Esquema reutilizable de variables de entrada/salida de herramientas y scripts.
export const variableSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Nombre de la variable. Se usa como { $nombre } en la URL y el cuerpo' },
      type: { type: 'string', enum: ['string', 'number', 'boolean', 'object', 'array'], description: 'Tipo (default: string)' },
      description: { type: 'string' },
      jsonPath: { type: 'string', description: 'Sólo en salidas: ruta dentro del JSON de respuesta, ej. "data.items[0].precio"' },
      testValue: { type: 'string', description: 'Sólo en entradas: valor que se usa al probar' },
      fallbackValue: { type: 'string', description: 'Sólo en salidas: valor si la herramienta falla o no devuelve ese dato' },
    },
    required: ['name'],
  },
};
