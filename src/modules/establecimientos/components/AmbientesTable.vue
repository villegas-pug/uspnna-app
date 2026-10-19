<template>
  <DataTable
    :rows="rows"
    :columns="columns"
    row-key="id"
    :card-title="(row) => `${row.id} · ${row.nombre}`"
    :row-actions="actions"
    :loading="loading"
    :has-active-filters="hasActiveFilters"
    search-label="Buscar ambientes"
    empty-icon="meeting_room"
    empty-title="Aún no hay ambientes"
    empty-text="Registre los ambientes del CAR para ubicar sus bienes."
    @clear-filters="emit('clearFilters')"
  >
    <template #cell-estado="{ row }">
      <StatusChip domain="registro" :value="row.estado" />
    </template>
    <template #empty-action>
      <AppButton icon="add" label="Nuevo ambiente" @click="openCreate" />
    </template>
  </DataTable>

  <AmbienteFormDialog v-model="dialogOpen" :ambiente="editing" :establecimiento-id="establecimientoId" />
</template>

<script setup lang="ts">
// Tabla de ambientes reutilizada en la vista de ambientes y en la ficha del CAR
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import DataTable from 'src/components/DataTable.vue';
import StatusChip from 'src/components/StatusChip.vue';
import AppButton from 'src/components/AppButton.vue';
import AmbienteFormDialog from 'src/modules/establecimientos/components/AmbienteFormDialog.vue';
import { useAsyncTask } from 'src/composables/useAsyncTask';
import { useConfirm } from 'src/composables/useConfirm';
import {
  contarBienesActivos,
  eliminarAmbiente,
  listarAmbientes,
  nombreEstablecimiento,
} from 'src/modules/establecimientos/services/establecimientos.service';
import { TIPO_AMBIENTE_LABEL, type Ambiente } from 'src/modules/establecimientos/types';
import type { ActionItem, DataColumn } from 'src/components/types';

const props = withDefaults(
  defineProps<{
    establecimientoId?: string | null | undefined;
    tipo?: string | null | undefined;
    loading?: boolean | undefined;
    hasActiveFilters?: boolean | undefined;
  }>(),
  { establecimientoId: null, tipo: null, loading: false, hasActiveFilters: false },
);

const emit = defineEmits<{ clearFilters: [] }>();

const router = useRouter();
const { confirm } = useConfirm();
const { run } = useAsyncTask();

const dialogOpen = ref(false);
const editing = ref<Ambiente | null>(null);

const rows = computed(() =>
  listarAmbientes(props.establecimientoId).filter((a) => !props.tipo || a.tipo === props.tipo),
);

const columns = computed<DataColumn<Ambiente>[]>(() => [
  { name: 'id', label: 'Código', field: 'id', sortable: true, classes: 'u-num', hideInCard: true },
  { name: 'nombre', label: 'Ambiente', field: 'nombre', sortable: true, hideInCard: true },
  { name: 'tipo', label: 'Tipo', field: (row) => TIPO_AMBIENTE_LABEL[row.tipo], secondary: true },
  ...(props.establecimientoId
    ? []
    : [{ name: 'car', label: 'CAR', field: (row: Ambiente) => nombreEstablecimiento(row.establecimientoId), sortable: true }]),
  { name: 'piso', label: 'Piso', field: 'piso', secondary: true },
  { name: 'custodio', label: 'Custodio', field: 'custodio', secondary: true },
  { name: 'bienes', label: 'Bienes', field: (row) => contarBienesActivos({ ambienteId: row.id }), align: 'right', sortable: true, classes: 'u-num' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center' },
]);

function actions(row: Ambiente): ActionItem[] {
  const bienes = contarBienesActivos({ ambienteId: row.id });
  return [
    {
      key: 'bienes',
      label: 'Ver bienes del ambiente',
      icon: 'visibility',
      tone: 'view',
      handler: () => void router.push({ path: '/bienes', query: { establecimiento: row.establecimientoId, ambiente: row.id } }),
    },
    { key: 'editar', label: 'Editar ambiente', icon: 'edit', tone: 'edit', handler: () => openEdit(row) },
    {
      key: 'eliminar',
      label: 'Eliminar ambiente',
      icon: 'delete',
      tone: 'danger',
      disabled: bienes > 0,
      disabledReason: `Tiene ${bienes} bienes; transfiéralos primero.`,
      handler: () => void remove(row),
    },
  ];
}

function openCreate(): void {
  editing.value = null;
  dialogOpen.value = true;
}

function openEdit(row: Ambiente): void {
  editing.value = row;
  dialogOpen.value = true;
}

async function remove(row: Ambiente): Promise<void> {
  const ok = await confirm({
    title: 'Eliminar ambiente',
    message: `Se eliminará el ambiente ${row.nombre} de ${nombreEstablecimiento(row.establecimientoId)}. Esta acción no se puede deshacer.`,
    confirmLabel: 'Eliminar ambiente',
    tone: 'negative',
  });
  if (ok) await run(() => eliminarAmbiente(row.id), `Se eliminó el ambiente ${row.nombre}.`);
}

defineExpose({ openCreate });
</script>
