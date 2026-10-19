// Simula la consulta inicial y el botón "Actualizar" de cada listado, como lo haría una API.
// Los datos ya son reactivos; el estado de carga permite validar la experiencia con latencia.
import { onMounted, ref } from 'vue';
import { simulateRequest } from 'src/core/utils/latency';

export function usePageLoader(immediate = true) {
  const loading = ref(false);

  async function refresh(): Promise<void> {
    loading.value = true;
    try {
      await simulateRequest(() => undefined);
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    if (immediate) void refresh();
  });

  return { loading, refresh };
}
