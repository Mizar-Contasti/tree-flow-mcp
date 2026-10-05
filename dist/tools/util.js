// Respuesta estándar de una herramienta. JSON compacto: la sangría no le sirve al modelo
// y engordaba cada respuesta un 50%, que se pagaba en cada llamada siguiente.
export function ok(result) {
    return {
        content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }],
    };
}
/**
 * Crea varias piezas independientes en una llamada. Una que falla no detiene a las
 * demás: se informa en su línea y se sigue, para no obligar a repetir las que salieron.
 */
export async function inBatch(label, items, nameOf, create) {
    if (!Array.isArray(items) || !items.length)
        throw new Error('La lista está vacía: manda al menos una.');
    const lines = [];
    let failed = 0;
    for (const item of items) {
        try {
            lines.push(await create(item));
        }
        catch (e) {
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
//# sourceMappingURL=util.js.map