<template>
  <PageContainer :title="campania ? `Conciliación ${campania.id}` : 'Conciliación no encontrada'" :crumb="campania?.id">
    <template v-if="campania" #actions>
      <AppButton variant="outline" icon="fact_check" label="Ver campaña" :to="`/campanias/${campania.id}`" />
      <AppButton variant="secondary" icon="download" label="Exportar CSV" :disable="items.length === 0" @click="exportar" />
      <AppButton v-if="campania.estado === 'en_conciliacion'" icon="lock" label="Cerrar campaña" @click="cerrarOpen = true" />
    </template>

    <EmptyState v-if="!campania" icon="search_off" title="La campaña no existe" text="Vuelva al listado de conciliaciones.">
      <AppButton label="Ir a conciliación" to="/conciliacion" />
    </EmptyState>

    <EmptyState
      v-else-if="campania.estado === 'planificada' || campania.estado === 'en_curso'"
      icon="pending"
      title="La campaña aún no está en conciliación"
      text="Termine la verificación física y pase la campaña a conciliación desde su ficha."
    >
      <AppButton label="Ir a la campaña" :to="`/campanias/${campania.id}`" />
    </EmptyState>

    <div v-else class="us-stack us-stack--lg">
      <ContextSummary :items="context" aria-label="Resumen de la conciliación" />

      <AppNotice v-if="campania.estado === 'cerrada'">
        La campaña está cerrada: los resultados son de solo lectura.
      </AppNotice>

      <div class="summary-grid">
        <ResultSummary title="Totales de la conciliación" :rows="resumen" />
        <ChartCard title="Resultados por tipo" subtitle="Bienes y suministros del alcance de la campaña">
          <BarChart :data="porResultado" label="Resultados de conciliación por tipo" show-share />
        </ChartCard>
      </div>

      <div class="us-card">
        <FilterBar :count="rows.length" :active="filtersActive" @clear="clearFilters">
          <q-select v-model="filters.resultado" :options="resultados" label="Resultado" emit-value map-options clearable outlined dense />
          <q-select v-model="filters.regularizacion" :options="regularizaciones" label="Regularización" emit-value map-options clearable outlined dense />
          <q-select v-model="filters.tipo" :options="tipos" label="Tipo de registro" emit-value map-options clearable outlined dense />
          <q-select
            v-if="campania.establecimientoIds.length > 1"
            v-model="filters.car"
            :options="cars"
            label="Establecimiento (CAR)"
            emit-value
            map-options
            clearable
            outlined
            dense
          />
        </FilterBar>

        <DataTable
          :rows="rows"
          :columns="columns"
          row-key="id"
          :card-title="(row) => `${codigoRegistro(row)} · ${row.descripcion}`"
          :row-actions="actions"
          :has-active-filters="filtersActive"
          :search-text="(row) => detalleResultado(row)"
          search-label="Buscar en los resultados"
          sticky-header
          empty-icon="compare_arrows"
          empty-title="Sin resultados"
          empty-text="La campaña no generó resultados de conciliación."
          @clear-filters="clearFilters"
        >
          <template #cell-resultado="{ row }">
            <StatusChip domain="conciliacion" :value="row.resultado" />
          </template>
          <template #cell-regularizacion="{ row }">
            <StatusChip domain="regularizacion" :value="row.estadoRegularizacion" />
          </template>
        </DataTable>
      </div>
    </div>

    <RegularizarDialog v-model="regularizarOpen" :item="selected" />
    <CerrarCampaniaDialog v-model="cerrarOpen" :campania="campania ?? null" :items="items" :rows="resumen" />
  </PageContainer>
</template>

<script setup lang="ts">
// Resultados de conciliación de una campaña: totales, filtros, regularización y cierre
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import PageContainer from 'src/components/PageContainer.vue';
import AppButton from 'src/components/AppButton.vue';
import AppNotice from 'src/components/AppNotice.vue';
import EmptyState from 'src/components/EmptyState.vue';
import ContextSummary from 'src/components/ContextSummary.vue';
import ResultSummary from 'src/components/ResultSummary.vue';
import FilterBar from 'src/components/FilterBar.vue';
import DataTable from 'src/components/DataTable.vue';
import StatusChip from 'src/components/StatusChip.vue';
import ChartCard from 'src/components/charts/ChartCard.vue';
import BarChart from 'src/components/charts/BarChart.vue';
import RegularizarDialog from 'src/modules/conciliacion/components/RegularizarDialog.vue';
import CerrarCampaniaDialog from 'src/modules/conciliacion/components/CerrarCampaniaDialog.vue';
import { optionsFrom } from 'src/core/utils/options';
import { downloadCsv, toCsv, type CsvColumn } from 'src/core/utils/csv';
import { formatDateTime, todayIso } from 'src/core/utils/format';
import { nombreEstablecimiento } from 'src/modules/establecimientos/services/establecimientos.service';
import { obtenerCampania } from 'src/modules/campanias/services/campanias.service';
import { calcularTotales, itemsDeCampania, resultadosPorTipo } from 'src/modules/conciliacion/services/conciliacion.service';
import { codigoRegistro, detalleResultado } from 'src/modules/conciliacion/utils/descripcion-item';
import { ESTADO_CAMPANIA_LABEL } from 'src/modules/campanias/types';
import {
  ACCION_REGULARIZACION,
  ESTADO_REGULARIZACION_LABEL,
  RESULTADO_LABEL,
  type EstadoRegularizacion,
  type ItemConciliacion,
  type ResultadoConciliacion,
  type TipoRegistro,
} from 'src/modules/conciliacion/types';
import type { ActionItem, ContextItem, DataColumn, ResultRow } from 'src/components/types';

const props = defineProps<{ campaniaId: string }>();

const router = useRouter();
const campania = computed(() => obtenerCampania(props.campaniaId));
const items = computed(() => itemsDeCampania(props.campaniaId));
const totales = computed(() => calcularTotales(items.value));

const resultados = optionsFrom(RESULTADO_LABEL);
const regularizaciones = optionsFrom(ESTADO_REGULARIZACION_LABEL);
const tipos = optionsFrom<TipoRegistro>({ bien: 'Bienes patrimoniales', suministro: 'Suministros' });
const cars = computed(() => (campania.value?.establecimientoIds ?? []).map((id) => ({ label: nombreEstablecimiento(id), value: id })));

const filters = reactive<{
  resultado: ResultadoConciliacion | null;
  regularizacion: EstadoRegularizacion | null;
  tipo: TipoRegistro | null;
  car: string | null;
}>({ resultado: null, regularizacion: null, tipo: null, car: null });

const filtersActive = computed(() => Boolean(filters.resultado || filters.regularizacion || filters.tipo || filters.car));

function clearFilters(): void {
  Object.assign(filters, { resultado: null, regularizacion: null, tipo: null, car: null });
}

// Primero lo que requiere atención: por regularizar, luego diferencias y al final coincidentes
const ORDEN: Record<ResultadoConciliacion, number> = {
  faltante: 0,
  sobrante: 1,
  diferencia_ubicacion: 2,
  diferencia_cantidad: 3,
  pendiente: 4,
  coincidente: 5,
};

const rows = computed(() =>
  items.value
    .filter(
      (item) =>
        (!filters.resultado || item.resultado === filters.resultado) &&
        (!filters.regularizacion || item.estadoRegularizacion === filters.regularizacion) &&
        (!filters.tipo || item.tipoRegistro === filters.tipo) &&
        (!filters.car || item.establecimientoId === filters.car),
    )
    .slice()
    .sort((a, b) => {
      const pendienteA = a.estadoRegularizacion === 'pendiente' ? 0 : 1;
      const pendienteB = b.estadoRegularizacion === 'pendiente' ? 0 : 1;
      return pendienteA - pendienteB || ORDEN[a.resultado] - ORDEN[b.resultado];
    }),
);

const context = computed<ContextItem[]>(() => {
  const c = campania.value;
  if (!c) return [];
  return [
    { label: 'Campaña', value: `${c.id} · ${c.nombre}` },
    { label: 'Estado', value: ESTADO_CAMPANIA_LABEL[c.estado] },
    { label: 'Establecimientos', value: c.establecimientoIds.map((id) => nombreEstablecimiento(id)).join(', ') },
    { label: 'Por regularizar', value: `${totales.value.porRegularizar} de ${totales.value.porRegularizar + totales.value.regularizados}` },
  ];
});

const resumen = computed<ResultRow[]>(() => [
  { key: 'ok', tone: 'ok', icon: 'check_circle', label: 'Coincidentes', value: totales.value.coincidentes },
  { key: 'bad', tone: 'bad', icon: 'cancel', label: 'Faltantes', value: totales.value.faltantes },
  {
    key: 'obs',
    tone: 'obs',
    icon: 'error_outline',
    label: 'Diferencias y observaciones',
    value: totales.value.sobrantes + totales.value.diferenciasUbicacion + totales.value.diferenciasCantidad,
  },
  { key: 'na', tone: 'na', icon: 'schedule', label: 'Pendientes de verificar', value: totales.value.pendientes },
]);

const porResultado = computed(() => resultadosPorTipo(props.campaniaId));

const columns: DataColumn<ItemConciliacion>[] = [
  { name: 'resultado', label: 'Resultado', field: (row) => RESULTADO_LABEL[row.resultado], sortable: true },
  { name: 'tipo', label: 'Tipo', field: (row) => (row.tipoRegistro === 'bien' ? 'Bien' : 'Suministro'), secondary: true },
  { name: 'registro', label: 'Registro', field: (row) => codigoRegistro(row), sortable: true, classes: 'u-num', hideInCard: true },
  { name: 'descripcion', label: 'Descripción', field: 'descripcion', hideInCard: true, classes: 'u-wrap' },
  { name: 'detalle', label: 'Detalle', field: (row) => detalleResultado(row), classes: 'u-wrap detalle-col' },
  { name: 'car', label: 'CAR', field: (row) => nombreEstablecimiento(row.establecimientoId), secondary: true },
  { name: 'regularizacion', label: 'Regularización', field: (row) => ESTADO_REGULARIZACION_LABEL[row.estadoRegularizacion], align: 'center' },
];

const regularizarOpen = ref(false);
const cerrarOpen = ref(false);
const selected = ref<ItemConciliacion | null>(null);

function actions(row: ItemConciliacion): ActionItem[] {
  const lista: ActionItem[] = [];
  if (row.bienId) {
    lista.push({ key: 'bien', label: 'Ver bien', icon: 'visibility', tone: 'view', handler: () => void router.push(`/bienes/${row.bienId}`) });
  }
  if (row.almacenId) {
    lista.push({
      key: 'stock',
      label: 'Ver stock del almacén',
      icon: 'visibility',
      tone: 'view',
      handler: () => void router.push({ path: '/suministros/stock', query: { almacen: row.almacenId } }),
    });
  }
  const accion = ACCION_REGULARIZACION[row.resultado];
  if (accion) {
    const abierta = campania.value?.estado === 'en_conciliacion';
    const pendiente = row.estadoRegularizacion === 'pendiente';
    lista.push({
      key: 'regularizar',
      label: accion,
      icon: 'rule',
      tone: row.resultado === 'faltante' ? 'danger' : 'success',
      disabled: !abierta || !pendiente,
      disabledReason: !pendiente
        ? `Regularizado el ${formatDateTime(row.fechaRegularizacion)}.`
        : 'La campaña está cerrada.',
      handler: () => {
        selected.value = row;
        regularizarOpen.value = true;
      },
    });
  }
  return lista;
}

const CSV_COLUMNS: CsvColumn<ItemConciliacion>[] = [
  { label: 'Resultado', value: (row) => RESULTADO_LABEL[row.resultado] },
  { label: 'Tipo', value: (row) => (row.tipoRegistro === 'bien' ? 'Bien' : 'Suministro') },
  { label: 'Registro', value: (row) => codigoRegistro(row) },
  { label: 'Código patrimonial', value: (row) => (row.tipoRegistro === 'bien' ? (row.codigoPatrimonial ?? 'Sin código patrimonial') : '') },
  { label: 'Descripción', value: (row) => row.descripcion },
  { label: 'Detalle', value: (row) => detalleResultado(row) },
  { label: 'CAR', value: (row) => nombreEstablecimiento(row.establecimientoId) },
  { label: 'Regularización', value: (row) => ESTADO_REGULARIZACION_LABEL[row.estadoRegularizacion] },
  { label: 'Acción', value: (row) => row.accionRegularizacion },
  { label: 'Sustento', value: (row) => row.sustento },
  { label: 'Fecha de regularización', value: (row) => formatDateTime(row.fechaRegularizacion) },
];

function exportar(): void {
  downloadCsv(`conciliacion-${props.campaniaId}-${todayIso()}.csv`, toCsv(CSV_COLUMNS, rows.value));
}
</script>

<style scoped lang="scss">
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr));
  gap: var(--space-16);
  align-items: start;
}

:deep(.detalle-col) {
  min-width: 260px;
  white-space: normal;
}
</style>
