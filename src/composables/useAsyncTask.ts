// Ejecuta un comando asíncrono con estado de carga y notificación de errores de negocio
import { ref } from 'vue';
import { useNotify } from 'src/composables/useNotify';

export type TaskResult<T> = { ok: true; value: T } | { ok: false };

export function useAsyncTask() {
  const loading = ref(false);
  const notify = useNotify();

  async function run<T>(task: () => Promise<T>, successMessage?: string | ((value: T) => string)): Promise<TaskResult<T>> {
    loading.value = true;
    try {
      const value = await task();
      if (successMessage) notify.success(typeof successMessage === 'function' ? successMessage(value) : successMessage);
      return { ok: true, value };
    } catch (error) {
      notify.error(error);
      return { ok: false };
    } finally {
      loading.value = false;
    }
  }

  return { loading, run };
}
