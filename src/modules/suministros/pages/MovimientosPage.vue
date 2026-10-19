<template>
  <PageContainer :title="TITULO[tipo]">
    <template #actions>
      <AppButton variant="outline" icon="refresh" label="Actualizar" :loading="loading" @click="refresh" />
      <AppButton :icon="ICONO[tipo]" :label="ACCION[tipo]" @click="formOpen = true" />
    </template>

    <div class="us-stack">
      <AppNotice tone="info">
        Los movimientos no se editan ni eliminan para conservar la trazabilidad. Para corregir uno, registre un movimiento
        inverso con el motivo correspondiente.
      </AppNotice>

      <div class="us-card">
        <FilterBar :count="rows.length" :active="filtersActive" @clear="clearFilters">
          <q-select
            v-model="filters.car"
            :options="cars"
            label="Establecimiento (CAR)"
            emit-value
            map-options
            clearable
            outlined
            dense
            @update:model-value="filters.almacen = null"
          />
          <q-select v-model="filters.almacen" :options="almacenes" label="Almacén" emit-value map-options clearable outlined dense />
          <DateField v-model="filters.desde" :for-id="`${tipo}-desde`" label="Desde" :max="filters.hasta" />
          <DateField v-model="filters.hasta" :for-id="`${tipo}-hasta`" label="Hasta" :min="filters.desde" />
        </FilterBar>

        <DataTable
          :rows="rows"
          :columns="columns"
          row-key="id"
          :card-title="(row) => `${row.id} · ${formatDate(row.fecha)}`"
          :row-actions="actions"
          :loading="loading"
          :has-active-filters="filtersActive"
          :search-text="(row) => row.items.map((item) => nombreSuministro(item.suministroId)).join(' ')"
          search-label="Buscar por código, documento o suministro"
          :empty-icon="ICONO[tipo]"
          :empty-title="`Aún no hay ${TITULO[tipo].toLowerCase()}`"
          empty-text="Los movimientos registrados aparecerán aquí."
          @clear-filters="clearFilters"
        >
          <template #cell-tipoMovimiento="{ row }">
            <span class="tipo-mov">
              <q-icon :name="row.tipo === 'ajuste' ? 'tune' : ICONO[tipo]" size="16px" aria-hidden="true" />
              {{ TIPO_MOVIMIENTO_LABEL[row.tipo] }}
            </span>
          </template>
          <template #empty-action>
            <AppButton :icon="ICONO[tipo]" :label="ACCION[tipo]" @click="formOpen = true" />
          </template>
        </DataTable>
      </div>
    </div>

    <MovimientoFormDialog v-model="formOpen" :tipo="tipo" :preset="filters.almacen ? { almacenId: filters.almacen } : null" />
    <MovimientoDetailDialog v-model="detailOpen" :movimiento="selected" />
  </PageContainer>
</template>

<script setup lang="ts">
// Registro de ingresos, salidas o transferencias (la vista se parametriza con el tipo de movimiento)
import { computed, reactive, ref } from 'vue';
import PageContainer from 'src/components/PageContainer.vue';
import AppButton from 'src/components/AppButton.vue';
import AppNotice from 'src/components/AppNotice.vue';
import FilterBar from 'src/components/FilterBar.vue';
import DataTable from 'src/components/DataTable.vue';
import DateField from 'src/components/DateField.vue';
import MovimientoFormDialog from 'src/modules/suministros/components/MovimientoFormDialog.vue';
import MovimientoDetailDialog from 'src/modules/suministros/components/MovimientoDetailDialog.vue';
import { usePageLoader } from 'src/composables/usePageLoader';
import { formatDate, formatNumber } from 'src/core/utils/format';
import {
  nombreAlmacen,
  obtenerAlmacen,
  opcionesAlmacenes,
  opcionesEstablecimientos,
} from 'src/modules/establecimientos/services/establecimientos.service';
import { nombreSuministro } from 'src/modules/suministros/services/suministros.service';
import { listarMovimientos } from 'src/modules/suministros/services/stock.service';
import {
  TIPO_MOVIMIENTO_LABEL,
  type Movimiento,
  type TipoMovimientoRegistrable,
} from 'src/modules/suministros/types';
import type { ActionItem, DataColumn } from 'src/components/types';

const props = defineProps<{ tipo: TipoMovimientoRegistrable }>();

const TITULO: Record<TipoMovimientoRegistrable, string> = {
  ingreso: 'Registro de ingresos',
  salida: 'Registro de salidas',
  transferencia: 'Transferencias entre almacenes',
};
const ACCION: Record<TipoMovimientoRegistrable, string> = {
  ingreso: 'Registrar ingreso',
  salida: 'Registrar salida',
  transferencia: 'Registrar transferencia',
};
const ICONO: Record<TipoMovimientoRegistrable, string> = { ingreso: 'input', salida: 'output', transferencia: 'swap_horiz' };

const { loading, refresh } = usePageLoader();

const filters = reactive<{ car: string | null; almacen: string | null; desde: string | null; hasta: string | null }>({
  car: null,
  almacen: null,
  desde: null,
  hasta: null,
});

const cars = computed(() => opcionesEstablecimientos(false));
const almacenes = computed(() => opcionesAlmacenes(filters.car));
const filtersActive = computed(() => Boolean(filters.car || filters.almacen || filters.desde || filters.hasta));

function clearFilters(): void {
  Object.assign(filters, { car: null, almacen: null, desde: null, hasta: null });
}

/** Almacenes que participan en el movimiento (origen y destino). */
function almacenesDe(movimiento: Movimiento): string[] {
  return [movimiento.almacenOrigenId, movimiento.almacenDestinoId].filter((id): id is string => Boolean(id));
}

// Los ajustes de conciliación se muestran con los ingresos (positivos) o con las salidas (negativos)
const rows = computed(() =>
  listarMovimientos().filter((movimiento) => {
    const visible =
      movimiento.tipo === props.tipo ||
      (movimiento.tipo === 'ajuste' &&
        ((props.tipo === 'ingreso' && movimiento.almacenDestinoId) || (props.tipo === 'salida' && movimiento.almacenOrigenId)));
    if (!visible) return false;
    const ids = almacenesDe(movimiento);
    return (
      (!filters.car || ids.some((id) => obtenerAlmacen(id)?.establecimientoId === filters.car)) &&
      (!filters.almacen || ids.includes(filters.almacen)) &&
      (!filters.desde || movimiento.fecha >= filters.desde) &&
      (!filters.hasta || movimiento.fecha <= filters.hasta)
    );
  }),
);

const columns = computed<DataColumn<Movimiento>[]>(() => [
  { name: 'id', label: 'Código', field: 'id', sortable: true, classes: 'u-num', hideInCard: true },
  { name: 'fecha', label: 'Fecha', field: 'fecha', format: (value) => formatDate(String(value)), sortable: true, classes: 'u-num', hideInCard: true },
  { name: 'tipoMovimiento', label: 'Tipo', field: 'tipo', secondary: props.tipo === 'transferencia' },
  ...(props.tipo === 'ingreso'
    ? []
    : [{ name: 'origen', label: 'Origen', field: (row: Movimiento) => nombreAlmacen(row.almacenOrigenId), classes: 'u-wrap' }]),
  ...(props.tipo === 'salida'
    ? []
    : [{ name: 'destino', label: 'Destino', field: (row: Movimiento) => nombreAlmacen(row.almacenDestinoId), classes: 'u-wrap' }]),
  { name: 'documento', label: 'Documento', field: 'documento', secondary: true },
  { name: 'motivo', label: 'Motivo', field: 'motivo', secondary: true },
  {
    name: 'items',
    label: 'Suministros',
    field: (row) =>
      row.items.length === 1
        ? `${nombreSuministro(row.items[0]?.suministroId)} (${formatNumber(row.items[0]?.cantidad ?? 0)})`
        : `${row.items.length} ítems`,
  },
]);

const detailOpen = ref(false);
const formOpen = ref(false);
const selected = ref<Movimiento | null>(null);

function actions(row: Movimiento): ActionItem[] {
  return [
    {
      key: 'ver',
      label: 'Ver movimiento',
      icon: 'visibility',
      tone: 'view',
      handler: () => {
        selected.value = row;
        detailOpen.value = true;
      },
    },
  ];
}
</script>

<style scoped lang="scss">
.tipo-mov {
  display: inline-flex;
  align-items: center;
  gap: var(--space-4);
  white-space: nowrap;
}
</style>
