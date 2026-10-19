<template>
  <q-timeline v-if="eventos.length > 0" class="us-timeline" color="secondary" layout="dense">
    <q-timeline-entry
      v-for="evento in eventos"
      :key="evento.id"
      :icon="TIPO_EVENTO_BIEN_ICON[evento.tipo]"
      :color="evento.tipo === 'baja' ? 'negative' : evento.tipo === 'regularizacion' ? 'accent' : 'secondary'"
      :title="TIPO_EVENTO_BIEN_LABEL[evento.tipo]"
      :subtitle="`${formatDateTime(evento.fecha)} · ${evento.responsable}`"
    >
      <p class="historial__text">{{ evento.descripcion }}</p>
    </q-timeline-entry>
  </q-timeline>
  <EmptyState v-else icon="history" title="Sin historial" text="Aún no hay eventos registrados para este bien." />
</template>

<script setup lang="ts">
// Historial del bien (más reciente primero): registro, actualizaciones, transferencias, verificaciones y bajas
import { computed } from 'vue';
import EmptyState from 'src/components/EmptyState.vue';
import { formatDateTime } from 'src/core/utils/format';
import { historialDeBien } from 'src/modules/bienes/services/bienes.service';
import { TIPO_EVENTO_BIEN_ICON, TIPO_EVENTO_BIEN_LABEL } from 'src/modules/bienes/types';

const props = defineProps<{ bienId: string }>();

const eventos = computed(() => historialDeBien(props.bienId));
</script>

<style scoped lang="scss">
.historial__text {
  margin: 0;
  overflow-wrap: anywhere;
}
</style>
