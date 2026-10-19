<template>
  <PageContainer title="Reportes">
    <div class="us-stack">
      <section class="us-card">
        <SectionHeader title="Tipo de reporte" icon="assessment" />
        <q-option-group v-model="reporteId" :options="opciones" color="primary" class="reporte-opciones" @update:model-value="limpiar" />
        <p class="u-hint q-mt-sm q-mb-none">{{ reporte.descripcion }}</p>
      </section>

      <section class="us-card">
        <FilterBar :count="previa ? filas.length : undefined" :active="filtrosActivos" @clear="limpiar">
          <q-select
            v-if="reporte.filtros.includes('campania')"
            v-model="filtros.campania"
            :options="campanias"
            label="Campaña"
            emit-value
            map-options
            clearable
            outlined
            dense
          />
          <q-select
            v-if="reporte.filtros.includes('car')"
            v-model="filtros.car"
            :options="cars"
            label="Establecimiento (CAR)"
            emit-value
            map-options
            clearable
            outlined
            dense
          />
          <q-select
            v-if="reporte.filtros.includes('estado')"
            v-model="filtros.estado"
            :options="reporte.estados"
            :label="reporte.estadoLabel"
            emit-value
            map-options
            clearable
            outlined
            dense
          />
          <DateField v-if="reporte.filtros.includes('desde')" v-model="filtros.desde" for-id="reporte-desde" label="Desde" :max="filtros.hasta" />
          <DateField v-if="reporte.filtros.includes('hasta')" v-model="filtros.hasta" for-id="reporte-hasta" label="Hasta" :min="filtros.desde" />
        </FilterBar>

        <div class="export-bar">
          <AppButton variant="outline" icon="preview" label="Vista previa" :loading="loading" @click="generar" />
          <AppButton variant="secondary" icon="download" label="Exportar CSV" :disable="!previa || filas.length === 0" @click="exportar" />
        </div>

        <DataTable
          v-if="previa"
          :key="reporteId"
          :rows="filas"
          :columns="columnas"
          row-key="key"
          :card-title="(row) => row[reporte.columnas[0]?.campo ?? 'key'] ?? ''"
          :loading="loading"
          :has-active-filters="filtrosActivos"
          search-label="Buscar en el reporte"
          empty-icon="assessment"
          empty-title="Sin datos para el reporte"
          empty-text="Ajuste los filtros y genere la vista previa nuevamente."
          @clear-filters="limpiar"
        />
        <EmptyState
          v-else
          icon="preview"
          title="Genere la vista previa"
          text="Elija los filtros y pulse Vista previa para revisar el reporte antes de exportarlo."
        />
      </section>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
// Reportes: tipo, filtros, vista previa y exportación CSV (UTF-8 con BOM)
import { computed, reactive, ref } from 'vue';
import PageContainer from 'src/components/PageContainer.vue';
import AppButton from 'src/components/AppButton.vue';
import FilterBar from 'src/components/FilterBar.vue';
import DataTable from 'src/components/DataTable.vue';
import DateField from 'src/components/DateField.vue';
import EmptyState from 'src/components/EmptyState.vue';
import SectionHeader from 'src/components/SectionHeader.vue';
import { simulateRequest } from 'src/core/utils/latency';
import { downloadCsv, toCsv } from 'src/core/utils/csv';
import { todayIso } from 'src/core/utils/format';
import { opcionesEstablecimientos } from 'src/modules/establecimientos/services/establecimientos.service';
import {
  REPORTES,
  obtenerReporte,
  opcionesCampaniasConciliadas,
  type FilaReporte,
  type FiltrosReporte,
  type ReporteId,
} from 'src/modules/reportes/services/reportes.service';
import type { DataColumn } from 'src/components/types';

const opciones = REPORTES.map((r) => ({ label: r.label, value: r.id }));
const reporteId = ref<ReporteId>('bienes');
const reporte = computed(() => obtenerReporte(reporteId.value));

const cars = computed(() => opcionesEstablecimientos(false));
const campanias = computed(() => opcionesCampaniasConciliadas());

const filtros = reactive<FiltrosReporte>({ car: null, estado: null, desde: null, hasta: null, campania: null });
const filtrosActivos = computed(() => Object.values(filtros).some(Boolean));

const loading = ref(false);
const previa = ref(false);
const filas = ref<FilaReporte[]>([]);

const columnas = computed<DataColumn<FilaReporte>[]>(() =>
  reporte.value.columnas.map((c) => ({
    name: c.campo,
    label: c.label,
    field: (row: FilaReporte) => row[c.campo] ?? '',
    align: c.align ?? 'left',
    sortable: true,
    classes: c.align === 'right' ? 'u-num' : 'u-wrap',
  })),
);

function limpiar(): void {
  Object.assign(filtros, { car: null, estado: null, desde: null, hasta: null, campania: null });
  previa.value = false;
  filas.value = [];
}

async function generar(): Promise<void> {
  loading.value = true;
  try {
    filas.value = await simulateRequest(() => reporte.value.generar({ ...filtros }));
    previa.value = true;
  } finally {
    loading.value = false;
  }
}

function exportar(): void {
  const columnasCsv = reporte.value.columnas.map((c) => ({ label: c.label, value: (row: FilaReporte) => row[c.campo] ?? '' }));
  downloadCsv(`reporte-${reporteId.value}-${todayIso()}.csv`, toCsv(columnasCsv, filas.value));
}
</script>

<style scoped lang="scss">
.reporte-opciones {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: var(--space-4) var(--space-16);
}

.export-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-8);
  padding: 12px 16px;
  margin-bottom: var(--space-12);
  border-radius: var(--radius-dialog);
  background: var(--toolbar-bg);
}
</style>
