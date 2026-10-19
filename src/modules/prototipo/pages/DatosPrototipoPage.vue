<template>
  <PageContainer title="Datos del prototipo">
    <template #actions>
      <AppButton variant="negative" icon="settings_backup_restore" label="Restaurar datos iniciales" @click="restaurar" />
    </template>
    <div class="us-stack">
      <AppNotice v-if="!disponible" blocking>
        El navegador no permite guardar datos: los cambios se perderán al recargar la página.
      </AppNotice>
      <AppNotice v-else tone="info">
        Los cambios se guardan en este navegador (localStorage). Uso actual: {{ formatBytes(uso) }}.
      </AppNotice>
      <DetailTable :rows="filas" caption="Registros por colección" />
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
// Uso de almacenamiento y restauración de los datos iniciales (JSON mock)
import { computed, ref } from 'vue';
import PageContainer from 'src/components/PageContainer.vue';
import AppButton from 'src/components/AppButton.vue';
import AppNotice from 'src/components/AppNotice.vue';
import DetailTable from 'src/components/DetailTable.vue';
import { useConfirm } from 'src/composables/useConfirm';
import { useNotify } from 'src/composables/useNotify';
import { COLLECTION_LABEL, db, resetAllCollections, type CollectionName } from 'src/core/data/db';
import { isStorageAvailable, storageUsageBytes } from 'src/core/storage/local-storage';
import { formatBytes, formatNumber } from 'src/core/utils/format';
import type { DetailRow } from 'src/components/types';

const { confirm } = useConfirm();
const notify = useNotify();
const disponible = isStorageAvailable();
const uso = ref(storageUsageBytes());

const filas = computed<DetailRow[]>(() =>
  (Object.keys(db) as CollectionName[]).map((key) => ({
    key,
    label: COLLECTION_LABEL[key],
    value: formatNumber(db[key].items.value.length),
  })),
);

async function restaurar(): Promise<void> {
  const ok = await confirm({
    title: 'Restaurar datos iniciales',
    message: 'Se descartarán todos los cambios hechos en el prototipo y se cargarán los datos de demostración.',
    confirmLabel: 'Restaurar datos',
    tone: 'negative',
    acknowledge: 'Entiendo que se perderán los cambios registrados.',
  });
  if (!ok) return;
  resetAllCollections();
  uso.value = storageUsageBytes();
  notify.success('Se restauraron los datos iniciales.');
}
</script>
