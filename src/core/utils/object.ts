// Utilidades de objetos para formularios

/** Copia una entidad sin su ID (datos editables del formulario). */
export function omitId<T extends { id: string }>(entity: T): Omit<T, 'id'> {
  const copy: Partial<T> = { ...entity };
  delete copy.id;
  return copy as Omit<T, 'id'>;
}

/** IDs únicos para asociar etiquetas y controles de un formulario. */
export function fieldIds<K extends string>(prefix: string, keys: readonly K[]): Record<K, string> {
  return Object.fromEntries(keys.map((key) => [key, `${prefix}-${key}`])) as Record<K, string>;
}
