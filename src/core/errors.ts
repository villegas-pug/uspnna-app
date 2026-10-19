// Errores de negocio con mensajes para el usuario: qué pasó y qué hacer

export class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessError';
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Ocurrió un error inesperado. Actualice la página e intente nuevamente.';
}

/** Lanza un BusinessError si la condición no se cumple. */
export function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new BusinessError(message);
}
