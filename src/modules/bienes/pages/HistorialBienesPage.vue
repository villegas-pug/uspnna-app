<template>
  <PageContainer title="Historial de movimientos de bienes">
    <template #actions>
      <AppButton variant="outline" icon="refresh" label="Actualizar" :loading="loading" @click="refresh" />
    </template>

    <div class="us-card">
      <FilterBar :count="rows.length" :active="filtersActive" @clear="clearFilters">
        <q-select v-model="filters.tipo" :options="tipos" label="Tipo de evento" emit-value map-options clearable outlined dense />
        <q-select v-model="filters.car" :options="cars" label="Establecimiento (CAR)" emit-value map-options clearable outlined dense />
        <DateField v-model="filters.desde" for-id="historial-desde" label="Desde" :max="filters.hasta" />
        <DateField v-model="filters.hasta" for-id="historial-hasta" label="Hasta" :min="filters.desde" />
      </FilterBar>

      <DataTable
        :rows="rows"
        :columns="columns"
        row-key="id"
        :card-title="(row) => `${TIPO_EVENTO_BIEN_LABEL[row.tipo]} · ${row.bienId}`"
        :loading="loading"
        :has-active-filters="filtersActive"
        search-label="Buscar en el historial"
        empty-icon="history"
        empty-title="Sin eventos"
        empty-text="Los registros, transferencias, verificaciones y bajas aparecerán aquí."
        @clear-filters="clearFilters"
      >
        <template #cell-bien="{ row }">
          <router-link :to="`/bienes/${row.bienId}`" class="table-link u-num">{{ row.bienId }}</router-link>
        </template>
        <template #cell-tipo="{ row }">
          <span class="evento-tipo">
            <q-icon :name="TIPO_EVENTO_BIEN_ICON[row.tipo]" size="18px" aria-hidden="true" />
            {{ TIPO_EVENTO_BIEN_LABEL[row.tipo] }}
          </span>
        </template>
      </DataTable>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
// Historial de todos los bienes: trazabilidad de registros, transferencias, verificaciones, bajas y regularizaciones
import { computed, reactive } from 'vue';
import PageContainer from 'src/components/PageContainer.vue';
import AppButton from 'src/components/AppButton.vue';
import FilterBar from 'src/components/FilterBar.vue';
import DataTable from 'src/components/DataTable.vue';
import DateField from 'src/components/DateField.vue';
import { usePageLoader } from 'src/composables/usePageLoader';
import { optionsFrom } from 'src/core/utils/options';
import { formatDateTime, toIsoDate } from 'src/core/utils/format';
import { nombreEstablecimiento, opcionesEstablecimientos } from 'src/modules/establecimientos/services/establecimientos.service';
import { listarHistorial, obtenerBien } from 'src/modules/bienes/services/bienes.service';
import {
  TIPO_EVENTO_BIEN_ICON,
  TIPO_EVENTO_BIEN_LABEL,
  type EventoBien,
  type TipoEventoBien,
} from 'src/modules/bienes/types';
import type { DataColumn } from 'src/components/types';

const { loading, refresh } = usePageLoader();

const tipos = optionsFrom(TIPO_EVENTO_BIEN_LABEL);
const cars = computed(() => opcionesEstablecimientos(false));

const filters = reactive<{ tipo: TipoEventoBien | null; car: string | null; desde: string | null; hasta: string | null }>({
  tipo: null,
  car: null,
  desde: null,
  hasta: null,
});

const filtersActive = computed(() => Boolean(filters.tipo || filters.car || filters.desde || filters.hasta));

function clearFilters(): void {
  Object.assign(filters, { tipo: null, car: null, desde: null, hasta: null });
}

const rows = computed(() =>
  listarHistorial()
    .filter((evento) => {
      const fecha = toIsoDate(new Date(evento.fecha));
      return (
        (!filters.tipo || evento.tipo === filters.tipo) &&
        (!filters.car || obtenerBien(evento.bienId)?.establecimientoId === filters.car) &&
        (!filters.desde || fecha >= filters.desde) &&
        (!filters.hasta || fecha <= filters.hasta)
      );
    })
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1)),
);

const columns: DataColumn<EventoBien>[] = [
  { name: 'fecha', label: 'Fecha', field: 'fecha', format: (value) => formatDateTime(String(value)), sortable: true, classes: 'u-num' },
  { name: 'bien', label: 'Bien', field: 'bienId', sortable: true, hideInCard: true },
  { name: 'descripcionBien', label: 'Descripción del bien', field: (row) => obtenerBien(row.bienId)?.descripcion ?? '', secondary: true },
  { name: 'tipo', label: 'Evento', field: 'tipo', sortable: true },
  { name: 'detalle', label: 'Detalle', field: 'descripcion', classes: 'u-wrap detalle-col' },
  {
    name: 'car',
    label: 'CAR actual',
    field: (row) => nombreEstablecimiento(obtenerBien(row.bienId)?.establecimientoId),
    secondary: true,
  },
];
</script>

<style scoped lang="scss">
.table-link {
  color: var(--inabif-blue-bar);
  font-weight: 700;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.evento-tipo {
  display: inline-flex;
  align-items: center;
  gap: var(--space-4);
  white-space: nowrap;
}

:deep(.detalle-col) {
  min-width: 280px;
  white-space: normal;
}
</style>
