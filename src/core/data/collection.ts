// Colección reactiva persistida en localStorage. Es la única fuente de verdad de cada entidad:
// las vistas leen `items` (reactivo) y los servicios modifican mediante insert/update/remove.
import { shallowRef, type ShallowRef } from 'vue';
import type { Entity } from 'src/core/types/common';
import { readJson, removeKey, writeJson } from 'src/core/storage/local-storage';

export interface Collection<T extends Entity> {
  readonly key: string;
  readonly items: Readonly<ShallowRef<readonly T[]>>;
  all(): readonly T[];
  find(id: string): T | undefined;
  insert(item: T): T;
  insertMany(items: readonly T[]): void;
  update(id: string, patch: Partial<Omit<T, 'id'>>): T;
  remove(id: string): void;
  /** Reemplaza todo el contenido persistiendo primero. */
  replaceAll(items: readonly T[]): void;
  /** Restaura un estado previo en memoria aunque la persistencia falle (rollback de transacciones). */
  restore(items: readonly T[]): void;
  /** Vuelve al JSON inicial y elimina la copia persistida. */
  reset(): void;
}

export class EntityNotFoundError extends Error {
  constructor(collection: string, id: string) {
    super(`No se encontró el registro ${id} en ${collection}. Actualice la vista e intente de nuevo.`);
    this.name = 'EntityNotFoundError';
  }
}

function cloneSeed<T>(seed: readonly T[]): T[] {
  return JSON.parse(JSON.stringify(seed)) as T[];
}

export function createCollection<T extends Entity>(key: string, seed: readonly T[]): Collection<T> {
  const stored = readJson(key);
  const items = shallowRef<readonly T[]>(Array.isArray(stored) ? (stored as T[]) : cloneSeed(seed));

  // Escribe primero: si la cuota falla, el estado en memoria no cambia
  function commit(next: readonly T[]): void {
    writeJson(key, next);
    items.value = next;
  }

  function find(id: string): T | undefined {
    return items.value.find((item) => item.id === id);
  }

  return {
    key,
    items,
    all: () => items.value,
    find,
    insert(item) {
      commit([...items.value, item]);
      return item;
    },
    insertMany(newItems) {
      if (newItems.length > 0) commit([...items.value, ...newItems]);
    },
    update(id, patch) {
      const current = find(id);
      if (!current) throw new EntityNotFoundError(key, id);
      const updated: T = { ...current, ...patch };
      commit(items.value.map((item) => (item.id === id ? updated : item)));
      return updated;
    },
    remove(id) {
      if (!find(id)) throw new EntityNotFoundError(key, id);
      commit(items.value.filter((item) => item.id !== id));
    },
    replaceAll(next) {
      commit([...next]);
    },
    restore(previous) {
      items.value = previous;
      try {
        writeJson(key, previous);
      } catch {
        // El estado en memoria ya es el previo; la copia persistida se corrige en la siguiente escritura
      }
    },
    reset() {
      removeKey(key);
      items.value = cloneSeed(seed);
    },
  };
}
