// IDs cortos. Un UUID son 36 caracteres que se tokenizan mal: en el esquema de un bot grande
// eran un tercio del texto. El MCP muestra sólo los primeros 8 y recuerda a qué UUID
// corresponde cada uno; cuando el modelo los devuelve, aquí se expanden al completo.
//
// El registro vive en el proceso: cubre todo lo que el modelo vio en esta conversación. Si el
// servidor se reinicia, un ID corto viejo da un error claro y basta con volver a leer.
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const FULL = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHORT = /^[0-9a-f]{8}(?:[0-9a-f]{4})?$/i;
const byShort = new Map(); // corto → completo
const byFull = new Map(); // completo → corto
export const isFullId = (v) => typeof v === 'string' && FULL.test(v);
/** El ID corto de un UUID, registrándolo. Si dos UUID empiezan igual, el segundo usa 12. */
export function shortId(full) {
    const id = full.toLowerCase();
    const known = byFull.get(id);
    if (known)
        return known;
    const plain = id.replace(/-/g, '');
    let short = plain.slice(0, 8);
    if (byShort.has(short) && byShort.get(short) !== id)
        short = plain.slice(0, 12);
    if (byShort.has(short) && byShort.get(short) !== id)
        return id; // tan improbable que se deja entero
    byShort.set(short, id);
    byFull.set(id, short);
    return short;
}
/** El UUID de un corto registrado, o undefined si no lo es. */
export const lookupShort = (v) => typeof v === 'string' && SHORT.test(v) ? byShort.get(v.toLowerCase()) : undefined;
/** Sustituye cada UUID de un texto por su ID corto. */
export const shortenText = (text) => text.replace(UUID, (m) => shortId(m));
/** Campos que sólo pueden llevar un ID: ahí un corto desconocido es un error, no un texto. */
const ID_KEY = /(^|_)(id|ref)$|[a-z]Ids?$|^linkedBranches$/i;
/**
 * Expande los IDs cortos de los argumentos de una herramienta, a cualquier profundidad (también
 * dentro de un config). Un corto registrado se expande donde esté; uno desconocido en un campo
 * de ID es un error, porque el backend lo rechazaría con un mensaje confuso.
 */
export function expandIds(value, key = '') {
    if (typeof value === 'string') {
        if (!SHORT.test(value))
            return value;
        const full = byShort.get(value.toLowerCase());
        if (full)
            return full;
        if (ID_KEY.test(key)) {
            throw new Error(`No reconozco el ID corto "${value}" (${key}). Vuelve a leer el bot para obtenerlo, o usa el ID completo.`);
        }
        return value;
    }
    if (Array.isArray(value))
        return value.map((v) => expandIds(v, key));
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, expandIds(v, k)]));
    }
    return value;
}
/** Sólo para pruebas: empezar con el registro vacío. */
export function _resetIds() {
    byShort.clear();
    byFull.clear();
}
//# sourceMappingURL=ids.js.map