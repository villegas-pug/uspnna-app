// Acceso seguro a localStorage: toda lectura y escritura va en try/catch para que el prototipo
// funcione en memoria cuando el navegador bloquea el almacenamiento (ventana privada, políticas).

const PREFIX = 'uspnna-inventarios:v1:';

/** Se lanza cuando la escritura supera la cuota del navegador (~5 MB). */
export class StorageQuotaError extends Error {
  constructor() {
    super(
      'El almacenamiento del navegador está lleno. Elimine fotografías o restaure los datos iniciales en "Datos del prototipo".',
    );
    this.name = 'StorageQuotaError';
  }
}

function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}

/** Indica si el navegador permite persistir datos. */
export function isStorageAvailable(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const probe = `${PREFIX}__probe__`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function readJson(key: string): unknown {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(PREFIX + key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

/**
 * Persiste un valor. Si el almacenamiento no está disponible no hace nada (modo memoria);
 * si se supera la cuota lanza StorageQuotaError para que el llamador conserve el estado previo.
 */
export function writeJson(key: string, value: unknown): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (error) {
    if (isQuotaError(error)) throw new StorageQuotaError();
  }
}

export function removeKey(key: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(PREFIX + key);
  } catch {
    // Sin almacenamiento disponible no hay nada que eliminar
  }
}

/** Bytes aproximados (UTF-16) que ocupan las claves del prototipo. */
export function storageUsageBytes(): number {
  const storage = getStorage();
  if (!storage) return 0;
  let total = 0;
  try {
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (key?.startsWith(PREFIX)) {
        total += (key.length + (storage.getItem(key)?.length ?? 0)) * 2;
      }
    }
  } catch {
    return 0;
  }
  return total;
}
