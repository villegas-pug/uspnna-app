// Latencia simulada para que los servicios se comporten como una API real (estados de carga)

const MIN_DELAY_MS = 150;
const MAX_DELAY_MS = 350;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ejecuta una operación síncrona tras una demora aleatoria y devuelve una promesa,
 * propagando los errores de negocio como rechazos.
 */
export async function simulateRequest<T>(operation: () => T): Promise<T> {
  await wait(MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));
  return operation();
}
