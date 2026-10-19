<template>
  <PageContainer title="Catálogo de suministros">
    <template #actions>
      <AppButton variant="outline" icon="refresh" label="Actualizar" :loading="loading" @click="refresh" />
      <AppButton icon="add" label="Nuevo suministro" @click="openDialog(null)" />
    </template>

    <div class="us-card">
      <FilterBar :count="rows.length" :active="filtersActive" @clear="clearFilters">
        <q-select v-model="filters.categoria" :options="categorias" label="Categoría" emit-value map-options clearable outlined dense />
        <q-select v-model="filters.estado" :options="estados" label="Estado" emit-value map-options clearable outlined dense />
      </FilterBar>

      <DataTable
        :rows="rows"
        :columns="columns"
        row-key="id"
        :card-title="(row) => `${row.id} · ${row.nombre}`"
        :row-actions="actions"
        :loading="loading"
        :has-active-filters="filtersActive"
        search-label="Buscar suministros"
        empty-icon="category"
        empty-title="Aún no hay suministros"
        empty-text="Registre el primer suministro del catálogo."
        @clear-filters="clearFilters"
      >
        <template #cell-vence="{ row }">
          <span class="vence">
            <q-icon :name="row.controlaVencimiento ? 'event' : 'remove'" size="16px" aria-hidden="true" />
            {{ row.controlaVencimiento ? 'Sí' : 'No' }}
          </span>
        </template>
        <template #cell-estado="{ row }">
          <StatusChip domain="registro" :value="row.estado" />
        </template>
        <template #empty-action>
          <AppButton icon="add" label="Nuevo suministro" @click="openDialog(null)" />
        </template>
      </DataTable>
    </div>

    <SuministroFormDialog v-model="dialogOpen" :suministro="editing" />
  </PageContainer>
</template>

<script setup lang="ts">
// Catálogo de suministros: unidad, stock mínimo y control de vencimiento
import { computed, reactive, ref } from 'vue';
import PageContainer from 'src/components/PageContainer.vue';
import AppButton from 'src/components/AppButton.vue';
import FilterBar from 'src/components/FilterBar.vue';
import DataTable from 'src/components/DataTable.vue';
import StatusChip from 'src/components/StatusChip.vue';
import SuministroFormDialog from 'src/modules/suministros/components/SuministroFormDialog.vue';
import { usePageLoader } from 'src/composables/usePageLoader';
import { useAsyncTask } from 'src/composables/useAsyncTask';
import { useConfirm } from 'src/composables/useConfirm';
import { optionsFrom } from 'src/core/utils/options';
import { formatNumber } from 'src/core/utils/format';
import { ESTADO_REGISTRO_LABEL, type EstadoRegistro } from 'src/core/types/common';
import {
  cambiarEstadoSuministro,
  listarSuministros,
  stockTotalSuministro,
} from 'src/modules/suministros/services/suministros.service';
import {
  CATEGORIA_SUMINISTRO_LABEL,
  type CategoriaSuministro,
  type Suministro,
} from 'src/modules/suministros/types';
import type { ActionItem, DataColumn } from 'src/components/types';

const { loading, refresh } = usePageLoader();
const { run } = useAsyncTask();
const { confirm } = useConfirm();

const categorias = optionsFrom(CATEGORIA_SUMINISTRO_LABEL);
const estados = optionsFrom(ESTADO_REGISTRO_LABEL);
const filters = reactive<{ categoria: CategoriaSuministro | null; estado: EstadoRegistro | null }>({ categoria: null, estado: null });
const filtersActive = computed(() => Boolean(filters.categoria || filters.estado));

function clearFilters(): void {
  filters.categoria = null;
  filters.estado = null;
}

const rows = computed(() =>
  listarSuministros().filter(
    (s) => (!filters.categoria || s.categoria === filters.categoria) && (!filters.estado || s.estado === filters.estado),
  ),
);

const columns: DataColumn<Suministro>[] = [
  { name: 'id', label: 'Código', field: 'id', sortable: true, classes: 'u-num', hideInCard: true },
  { name: 'nombre', label: 'Suministro', field: 'nombre', sortable: true, hideInCard: true },
  { name: 'categoria', label: 'Categoría', field: (row) => CATEGORIA_SUMINISTRO_LABEL[row.categoria], sortable: true },
  { name: 'unidad', label: 'Unidad', field: 'unidad', secondary: true },
  { name: 'minimo', label: 'Stock mínimo', field: 'stockMinimo', align: 'right', classes: 'u-num', secondary: true },
  { name: 'vence', label: 'Controla vencimiento', field: 'controlaVencimiento', align: 'center', secondary: true },
  {
    name: 'total',
    label: 'Stock total',
    field: (row) => stockTotalSuministro(row.id),
    format: (value, row) => `${formatNumber(Number(value))} ${row.unidad}`,
    align: 'right',
    sortable: true,
    classes: 'u-num',
  },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center' },
];

const dialogOpen = ref(false);
const editing = ref<Suministro | null>(null);

function openDialog(suministro: Suministro | null): void {
  editing.value = suministro;
  dialogOpen.value = true;
}

function actions(row: Suministro): ActionItem[] {
  const activo = row.estado === 'activo';
  const conStock = stockTotalSuministro(row.id) > 0;
  return [
    { key: 'editar', label: 'Editar suministro', icon: 'edit', tone: 'edit', handler: () => openDialog(row) },
    {
      key: 'estado',
      label: activo ? 'Desactivar suministro' : 'Activar suministro',
      icon: activo ? 'block' : 'check_circle',
      tone: activo ? 'danger' : 'success',
      disabled: activo && conStock,
      disabledReason: 'Tiene stock en almacenes; registre primero su salida.',
      handler: () => void toggle(row),
    },
  ];
}

async function toggle(row: Suministro): Promise<void> {
  const nuevo: EstadoRegistro = row.estado === 'activo' ? 'inactivo' : 'activo';
  const ok = await confirm({
    title: nuevo === 'inactivo' ? 'Desactivar suministro' : 'Activar suministro',
    message:
      nuevo === 'inactivo'
        ? `${row.nombre} dejará de aparecer en los formularios de movimientos. Su historial se conserva.`
        : `${row.nombre} volverá a estar disponible en los formularios.`,
    confirmLabel: nuevo === 'inactivo' ? 'Desactivar' : 'Activar',
    tone: nuevo === 'inactivo' ? 'negative' : 'primary',
  });
  if (ok) await run(() => cambiarEstadoSuministro(row.id, nuevo), `${row.nombre} quedó ${nuevo}.`);
}
</script>

<style scoped lang="scss">
.vence {
  display: inline-flex;
  align-items: center;
  gap: var(--space-4);
}
</style>
