// Resultados de operaciones con QNotify: éxito en verde institucional, error negativo con icono warning
import { useQuasar } from 'quasar';
import { errorMessage } from 'src/core/errors';

export function useNotify() {
  const $q = useQuasar();

  return {
    success(message: string): void {
      $q.notify({ type: 'positive', icon: 'check_circle', message });
    },
    info(message: string): void {
      $q.notify({ type: 'info', icon: 'info', message });
    },
    error(error: unknown): void {
      $q.notify({
        type: 'negative',
        icon: 'warning',
        message: errorMessage(error),
        timeout: 7000,
        actions: [{ label: 'Cerrar', color: 'white' }],
      });
    },
  };
}
