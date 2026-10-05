// Respuesta estándar de una herramienta. JSON compacto: la sangría no le sirve al modelo
// y engordaba cada respuesta un 50%, que se pagaba en cada llamada siguiente.
export function ok(result: unknown) {
  return {
    content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }],
  };
}

/**
 * Crea varias piezas independientes en una llamada. Una que falla no detiene a las
 * demás: se informa en su línea y se sigue, para no obligar a repetir las que salieron.
 */
export async function inBatch<T>(label: string, items: T[], nameOf: (item: T) => string, create: (item: T) => Promise<string>) {
  if (!Array.isArray(items) || !items.length) throw new Error('La lista está vacía: manda al menos una.');
  const lines: string[] = [];
  let failed = 0;
  for (const item of items) {
    try {
      lines.push(await create(item));
    } catch (e: any) {
      failed++;
      const detail = e?.response?.data?.detail ?? e?.message ?? e;
      lines.push(`- ✘ ${nameOf(item)}: ${typeof detail === 'object' ? JSON.stringify(detail) : detail}`);
    }
  }
  const header = `${label} creadas: ${items.length - failed} de ${items.length}${failed ? ` (${failed} con error)` : ''}`;
  return [header, ...lines].join('\n');
}

// Esquema reutilizable de variables de entrada/salida de herramientas y scripts.
export const variableSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      type: { type: 'string', enum: ['string', 'number', 'boolean', 'object', 'array'] },
      description: { type: 'string' },
      jsonPath: { type: 'string', description: 'Salidas: ruta en la respuesta' },
      testValue: { type: 'string', description: 'Entradas: valor de prueba' },
      fallbackValue: { type: 'string', description: 'Salidas: valor si falla' },
    },
    required: ['name'],
  },
};
