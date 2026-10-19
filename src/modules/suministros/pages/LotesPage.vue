<template>
  <PageContainer title="Lotes y vencimientos">
    <template #actions>
      <AppButton variant="outline" icon="refresh" label="Actualizar" :loading="loading" @click="refresh" />
      <AppButton icon="output" label="Registrar salida por vencimiento" @click="salidaOpen = true" />
    </template>

    <div class="us-stack">
      <AppNotice v-if="alertas.vencidos + alertas.porVencer > 0">
        {{ alertas.vencidos }} lotes vencidos con stock y {{ alertas.porVencer }} lotes vencen en los próximos
        {{ DIAS_ALERTA_VENCIMIENTO }} días. Los lotes vencidos no se despachan: registre su salida con el motivo "Vencimiento".
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
          <q-select v-model="filters.estado" :options="estados" label="Vencimiento" emit-value map-options clearable outlined dense />
          <q-toggle v-model="filters.agotados" label="Incluir lotes agotados" color="primary" class="filter-toggle" />
        </FilterBar>

        <DataTable
          :rows="rows"
          :columns="columns"
          row-key="id"
          :card-title="(row) => `${nombreSuministro(row.suministroId)} · ${row.numeroLote ?? 'Sin lote'}`"
          :loading="loading"
          :has-active-filters="filtersActive"
          :search-text="(row) => nombreSuministro(row.suministroId)"
          search-label="Buscar por lote o suministro"
          sticky-header
          empty-icon="event_available"
          empty-title="Sin lotes"
          empty-text="Los lotes se crean al registrar ingresos."
          @clear-filters="clearFilters"
        >
          <template #cell-estado="{ row }">
            <StatusChip domain="vencimiento" :value="estadoVencimiento(row.fechaVencimiento)" />
          </template>
        </DataTable>
      </div>
    </div>

    <MovimientoFormDialog v-model="salidaOpen" tipo="salida" :preset="filters.almacen ? { almacenId: filters.almacen } : null" />
  </PageContainer>
</template>

<script setup lang="ts">
// Lotes con stock, su fecha de vencimiento y días restantes (RN-S2)
import { computed, reactive, ref } from 'vue';
import PageContainer from 'src/components/PageContainer.vue';
import AppButton from 'src/components/AppButton.vue';
import AppNotice from 'src/components/AppNotice.vue';
import FilterBar from 'src/components/FilterBar.vue';
import DataTable from 'src/components/DataTable.vue';
import StatusChip from 'src/components/StatusChip.vue';
import MovimientoFormDialog from 'src/modules/suministros/components/MovimientoFormDialog.vue';
import { usePageLoader } from 'src/composables/usePageLoader';
import { optionsFrom } from 'src/core/utils/options';
import { daysFromToday, formatDate, formatNumber } from 'src/core/utils/format';
import {
  nombreEstablecimiento,
  obtenerAlmacen,
  opcionesAlmacenes,
  opcionesEstablecimientos,
} from 'src/modules/establecimientos/services/establecimientos.service';
import { nombreSuministro, obtenerSuministro } from 'src/modules/suministros/services/suministros.service';
import { estadoVencimiento, listarLotes, resumenAlertas } from 'src/modules/suministros/services/stock.service';
import {
  DIAS_ALERTA_VENCIMIENTO,
  ESTADO_VENCIMIENTO_LABEL,
  type EstadoVencimiento,
  type Lote,
} from 'src/modules/suministros/types';
import type { DataColumn } from 'src/components/types';

const { loading, refresh } = usePageLoader();
const salidaOpen = ref(false);

const filters = reactive<{ car: string | null; almacen: string | null; estado: EstadoVencimiento | null; agotados: boolean }>({
  car: null,
  almacen: null,
  estado: null,
  agotados: false,
});

const cars = computed(() => opcionesEstablecimientos(false));
const almacenes = computed(() => opcionesAlmacenes(filters.car));
const estados = optionsFrom(ESTADO_VENCIMIENTO_LABEL);
const alertas = computed(() => resumenAlertas());
const filtersActive = computed(() => Boolean(filters.car || filters.almacen || filters.estado || filters.agotados));

function clearFilters(): void {
  Object.assign(filters, { car: null, almacen: null, estado: null, agotados: false });
}

const rows = computed(() =>
  listarLotes()
    .filter(
      (lote) =>
        (filters.agotados || lote.cantidad > 0) &&
        (!filters.car || obtenerAlmacen(lote.almacenId)?.establecimientoId === filters.car) &&
        (!filters.almacen || lote.almacenId === filters.almacen) &&
        (!filters.estado || estadoVencimiento(lote.fechaVencimiento) === filters.estado),
    )
    .slice()
    .sort((a, b) => (a.fechaVencimiento ?? '9999') < (b.fechaVencimiento ?? '9999') ? -1 : 1),
);

function diasRestantes(lote: Lote): string {
  if (!lote.fechaVencimiento) return 'Sin vencimiento';
  const dias = daysFromToday(lote.fechaVencimiento) ?? 0;
  if (dias < 0) return `Venció hace ${Math.abs(dias)} días`;
  return dias === 0 ? 'Vence hoy' : `${dias} días`;
}

const columns: DataColumn<Lote>[] = [
  { name: 'lote', label: 'Lote', field: (row) => row.numeroLote ?? 'Sin lote', sortable: true, classes: 'u-num', hideInCard: true },
  { name: 'suministro', label: 'Suministro', field: (row) => nombreSuministro(row.suministroId), sortable: true, hideInCard: true },
  { name: 'almacen', label: 'Almacén', field: (row) => obtenerAlmacen(row.almacenId)?.nombre ?? '' },
  { name: 'car', label: 'CAR', field: (row) => nombreEstablecimiento(obtenerAlmacen(row.almacenId)?.establecimientoId), secondary: true },
  {
    name: 'cantidad',
    label: 'Cantidad',
    field: 'cantidad',
    format: (value, row) => `${formatNumber(Number(value))} ${obtenerSuministro(row.suministroId)?.unidad ?? ''}`,
    align: 'right',
    sortable: true,
    classes: 'u-num',
  },
  { name: 'vencimiento', label: 'Vencimiento', field: (row) => formatDate(row.fechaVencimiento) || 'Sin vencimiento', classes: 'u-num' },
  { name: 'dias', label: 'Días restantes', field: (row) => diasRestantes(row), secondary: true },
  { name: 'estado', label: 'Estado', field: 'fechaVencimiento', align: 'center' },
];
</script>

<style scoped lang="scss">
.filter-toggle {
  align-self: center;
}
</style>
