<template>
  <DataTable
    :rows="rows"
    :columns="columns"
    row-key="id"
    :card-title="(row) => `${row.id} · ${row.nombre}`"
    :row-actions="actions"
    :loading="loading"
    :has-active-filters="hasActiveFilters"
    search-label="Buscar almacenes"
    empty-icon="warehouse"
    empty-title="Aún no hay almacenes"
    empty-text="Registre los almacenes del CAR para controlar su stock."
    @clear-filters="emit('clearFilters')"
  >
    <template #cell-estado="{ row }">
      <StatusChip domain="registro" :value="row.estado" />
    </template>
    <template #empty-action>
      <AppButton icon="add" label="Nuevo almacén" @click="openCreate" />
    </template>
  </DataTable>

  <AlmacenFormDialog v-model="dialogOpen" :almacen="editing" :establecimiento-id="establecimientoId" />
</template>

<script setup lang="ts">
// Tabla de almacenes reutilizada en la vista de almacenes y en la ficha del CAR
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import DataTable from 'src/components/DataTable.vue';
import StatusChip from 'src/components/StatusChip.vue';
import AppButton from 'src/components/AppButton.vue';
import AlmacenFormDialog from 'src/modules/establecimientos/components/AlmacenFormDialog.vue';
import { useAsyncTask } from 'src/composables/useAsyncTask';
import { useConfirm } from 'src/composables/useConfirm';
import {
  eliminarAlmacen,
  listarAlmacenes,
  nombreEstablecimiento,
  stockTotalAlmacen,
} from 'src/modules/establecimientos/services/establecimientos.service';
import { stockPorAlmacen } from 'src/modules/suministros/services/stock.service';
import { TIPO_ALMACEN_LABEL, type Almacen } from 'src/modules/establecimientos/types';
import type { ActionItem, DataColumn } from 'src/components/types';

const props = withDefaults(
  defineProps<{ establecimientoId?: string | null | undefined; loading?: boolean | undefined; hasActiveFilters?: boolean | undefined }>(),
  { establecimientoId: null, loading: false, hasActiveFilters: false },
);

const emit = defineEmits<{ clearFilters: [] }>();

const router = useRouter();
const { confirm } = useConfirm();
const { run } = useAsyncTask();

const dialogOpen = ref(false);
const editing = ref<Almacen | null>(null);

const rows = computed(() => listarAlmacenes(props.establecimientoId));

function suministrosConStock(almacenId: string): number {
  return [...stockPorAlmacen(almacenId).values()].filter((cantidad) => cantidad > 0).length;
}

const columns = computed<DataColumn<Almacen>[]>(() => [
  { name: 'id', label: 'Código', field: 'id', sortable: true, classes: 'u-num', hideInCard: true },
  { name: 'nombre', label: 'Almacén', field: 'nombre', sortable: true, hideInCard: true },
  { name: 'tipo', label: 'Tipo', field: (row) => TIPO_ALMACEN_LABEL[row.tipo], secondary: true },
  ...(props.establecimientoId
    ? []
    : [{ name: 'car', label: 'CAR', field: (row: Almacen) => nombreEstablecimiento(row.establecimientoId), sortable: true }]),
  { name: 'responsable', label: 'Responsable', field: 'responsable', secondary: true },
  { name: 'suministros', label: 'Suministros con stock', field: (row) => suministrosConStock(row.id), align: 'right', classes: 'u-num' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center' },
]);

function actions(row: Almacen): ActionItem[] {
  const conStock = stockTotalAlmacen(row.id) > 0;
  return [
    {
      key: 'stock',
      label: 'Ver stock del almacén',
      icon: 'visibility',
      tone: 'view',
      handler: () => void router.push({ path: '/suministros/stock', query: { establecimiento: row.establecimientoId, almacen: row.id } }),
    },
    { key: 'editar', label: 'Editar almacén', icon: 'edit', tone: 'edit', handler: () => openEdit(row) },
    {
      key: 'eliminar',
      label: 'Eliminar almacén',
      icon: 'delete',
      tone: 'danger',
      disabled: conStock,
      disabledReason: 'Tiene stock; registre su salida o transferencia.',
      handler: () => void remove(row),
    },
  ];
}

function openCreate(): void {
  editing.value = null;
  dialogOpen.value = true;
}

function openEdit(row: Almacen): void {
  editing.value = row;
  dialogOpen.value = true;
}

async function remove(row: Almacen): Promise<void> {
  const ok = await confirm({
    title: 'Eliminar almacén',
    message: `Se eliminará ${row.nombre} de ${nombreEstablecimiento(row.establecimientoId)}. Esta acción no se puede deshacer.`,
    confirmLabel: 'Eliminar almacén',
    tone: 'negative',
  });
  if (ok) await run(() => eliminarAlmacen(row.id), `Se eliminó ${row.nombre}.`);
}

defineExpose({ openCreate });
</script>
