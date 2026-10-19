// Generación de IDs internos correlativos con ceros a la izquierda (BP-000128, MOV-000045, CAM-2026-004)

/**
 * Devuelve el siguiente ID para el prefijo dado, a partir del mayor correlativo existente.
 * @param prefix Prefijo sin guion final, p. ej. "BP" o "CAM-2026".
 * @param existingIds IDs actuales de la colección.
 * @param digits Cantidad de dígitos del correlativo.
 */
export function nextId(prefix: string, existingIds: Iterable<string>, digits: number): string {
  const head = `${prefix}-`;
  let max = 0;
  for (const id of existingIds) {
    if (!id.startsWith(head)) continue;
    const correlative = Number.parseInt(id.slice(head.length), 10);
    if (Number.isFinite(correlative) && correlative > max) max = correlative;
  }
  return `${head}${String(max + 1).padStart(digits, '0')}`;
}

/** Genera varios IDs consecutivos (para inserciones en lote). */
export function nextIds(
  prefix: string,
  existingIds: Iterable<string>,
  digits: number,
  count: number,
): string[] {
  const ids: string[] = [];
  const pool = [...existingIds];
  for (let index = 0; index < count; index++) {
    const id = nextId(prefix, pool, digits);
    ids.push(id);
    pool.push(id);
  }
  return ids;
}

/** Número de fila de tabla con ceros: 1 → "00001". */
export function rowNumber(index: number): string {
  return String(index).padStart(5, '0');
}
