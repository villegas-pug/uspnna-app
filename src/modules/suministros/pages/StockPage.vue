<template>
  <PageContainer title="Stock de suministros por almacén">
    <template #actions>
      <AppButton variant="outline" icon="refresh" label="Actualizar" :loading="loading" @click="refresh" />
      <AppButton variant="outline" icon="swap_horiz" label="Transferencia" @click="openMovimiento('transferencia')" />
      <AppButton variant="secondary" icon="output" label="Registrar salida" @click="openMovimiento('salida')" />
      <AppButton icon="input" label="Registrar ingreso" @click="openMovimiento('ingreso')" />
    </template>

    <div class="us-stack">
      <AppNotice v-if="alertas.agotados + alertas.bajoMinimo > 0">
        {{ alertas.agotados }} suministros agotados y {{ alertas.bajoMinimo }} bajo el stock mínimo. Registre un ingreso o una
        transferencia para reponerlos.
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
          <q-select v-model="filters.categoria" :options="categorias" label="Categoría" emit-value map-options clearable outlined dense />
          <q-select v-model="filters.estado" :options="estados" label="Estado de stock" emit-value map-options clearable outlined dense />
        </FilterBar>

        <DataTable
          :rows="rows"
          :columns="columns"
          row-key="key"
          :card-title="(row) => row.suministro.nombre"
          :row-actions="actions"
          :loading="loading"
          :has-active-filters="filtersActive"
          :search-text="(row) => row.suministro.id"
          search-label="Buscar suministros"
          sticky-header
          empty-icon="warehouse"
          empty-title="Sin stock registrado"
          empty-text="Registre un ingreso para empezar a controlar el stock."
          @clear-filters="clearFilters"
        >
          <template #cell-estado="{ row }">
            <StatusChip domain="stock" :value="row.estado" />
          </template>
          <template #cell-vencimiento="{ row }">
            <StatusChip
              domain="vencimiento"
              :value="row.estadoVencimiento"
              :label="row.proximoVencimiento ? formatDate(row.proximoVencimiento) : undefined"
            />
          </template>
          <template #empty-action>
            <AppButton icon="input" label="Registrar ingreso" @click="openMovimiento('ingreso')" />
          </template>
        </DataTable>
      </div>
    </div>

    <MovimientoFormDialog v-model="movimientoOpen" :tipo="movimientoTipo" :preset="preset" />
    <LotesDialog v-model="lotesOpen" :fila="filaLotes" />
  </PageContainer>
</template>

<script setup lang="ts">
// Stock por almacén con estado (normal, bajo mínimo, agotado) y próximo vencimiento
import { computed, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import PageContainer from 'src/components/PageContainer.vue';
import AppButton from 'src/components/AppButton.vue';
import AppNotice from 'src/components/AppNotice.vue';
import FilterBar from 'src/components/FilterBar.vue';
import DataTable from 'src/components/DataTable.vue';
import StatusChip from 'src/components/StatusChip.vue';
import MovimientoFormDialog from 'src/modules/suministros/components/MovimientoFormDialog.vue';
import LotesDialog from 'src/modules/suministros/components/LotesDialog.vue';
import { usePageLoader } from 'src/composables/usePageLoader';
import { optionsFrom } from 'src/core/utils/options';
import { formatDate, formatNumber } from 'src/core/utils/format';
import {
  nombreEstablecimiento,
  obtenerAlmacen,
  opcionesAlmacenes,
  opcionesEstablecimientos,
} from 'src/modules/establecimientos/services/establecimientos.service';
import { listarStock, resumenAlertas } from 'src/modules/suministros/services/stock.service';
import {
  CATEGORIA_SUMINISTRO_LABEL,
  ESTADO_STOCK_LABEL,
  type CategoriaSuministro,
  type EstadoStock,
  type MovimientoPreset,
  type StockItem,
  type TipoMovimientoRegistrable,
} from 'src/modules/suministros/types';
import type { ActionItem, DataColumn } from 'src/components/types';

const route = useRoute();
const { loading, refresh } = usePageLoader();

function queryText(key: string): string | null {
  const value = route.query[key];
  return typeof value === 'string' ? value : null;
}

const filters = reactive<{ car: string | null; almacen: string | null; categoria: CategoriaSuministro | null; estado: EstadoStock | null }>({
  car: queryText('establecimiento'),
  almacen: queryText('almacen'),
  categoria: null,
  estado: null,
});

const cars = computed(() => opcionesEstablecimientos(false));
const almacenes = computed(() => opcionesAlmacenes(filters.car));
const categorias = optionsFrom(CATEGORIA_SUMINISTRO_LABEL);
const estados = optionsFrom(ESTADO_STOCK_LABEL);
const alertas = computed(() => resumenAlertas());

const filtersActive = computed(() => Boolean(filters.car || filters.almacen || filters.categoria || filters.estado));

function clearFilters(): void {
  Object.assign(filters, { car: null, almacen: null, categoria: null, estado: null });
}

const rows = computed(() =>
  listarStock().filter(
    (fila) =>
      (!filters.car || fila.establecimientoId === filters.car) &&
      (!filters.almacen || fila.almacenId === filters.almacen) &&
      (!filters.categoria || fila.suministro.categoria === filters.categoria) &&
      (!filters.estado || fila.estado === filters.estado),
  ),
);

const columns: DataColumn<StockItem>[] = [
  { name: 'codigo', label: 'Código', field: (row) => row.suministro.id, sortable: true, classes: 'u-num', secondary: true },
  { name: 'suministro', label: 'Suministro', field: (row) => row.suministro.nombre, sortable: true, hideInCard: true },
  { name: 'categoria', label: 'Categoría', field: (row) => CATEGORIA_SUMINISTRO_LABEL[row.suministro.categoria], secondary: true },
  { name: 'almacen', label: 'Almacén', field: (row) => obtenerAlmacen(row.almacenId)?.nombre ?? '', sortable: true },
  { name: 'car', label: 'CAR', field: (row) => nombreEstablecimiento(row.establecimientoId), sortable: true },
  {
    name: 'stock',
    label: 'Stock',
    field: 'cantidad',
    format: (value, row) => `${formatNumber(Number(value))} ${row.suministro.unidad}`,
    align: 'right',
    sortable: true,
    classes: 'u-num',
  },
  { name: 'minimo', label: 'Mínimo', field: (row) => row.suministro.stockMinimo, align: 'right', classes: 'u-num', secondary: true },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center', sortable: true },
  { name: 'vencimiento', label: 'Próximo vencimiento', field: 'proximoVencimiento', align: 'center', sortable: true, secondary: true },
];

const movimientoOpen = ref(false);
const movimientoTipo = ref<TipoMovimientoRegistrable>('ingreso');
const preset = ref<MovimientoPreset | null>(null);
const lotesOpen = ref(false);
const filaLotes = ref<StockItem | null>(null);

function openMovimiento(tipo: TipoMovimientoRegistrable, fila?: StockItem): void {
  movimientoTipo.value = tipo;
  preset.value = fila ? { almacenId: fila.almacenId, suministroId: fila.suministro.id } : filters.almacen ? { almacenId: filters.almacen } : null;
  movimientoOpen.value = true;
}

function actions(row: StockItem): ActionItem[] {
  const sinStock = row.cantidad <= 0;
  return [
    {
      key: 'lotes',
      label: 'Ver lotes',
      icon: 'visibility',
      tone: 'view',
      handler: () => {
        filaLotes.value = row;
        lotesOpen.value = true;
      },
    },
    { key: 'ingreso', label: 'Registrar ingreso', icon: 'input', tone: 'success', handler: () => openMovimiento('ingreso', row) },
    {
      key: 'salida',
      label: 'Registrar salida',
      icon: 'output',
      tone: 'edit',
      disabled: sinStock,
      disabledReason: 'No hay stock disponible.',
      handler: () => openMovimiento('salida', row),
    },
    {
      key: 'transferir',
      label: 'Transferir a otro almacén',
      icon: 'swap_horiz',
      tone: 'move',
      disabled: sinStock,
      disabledReason: 'No hay stock disponible.',
      handler: () => openMovimiento('transferencia', row),
    },
  ];
}
</script>
