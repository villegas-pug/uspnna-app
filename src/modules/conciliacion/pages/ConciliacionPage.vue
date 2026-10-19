<template>
  <PageContainer title="Conciliación de inventarios">
    <template #actions>
      <AppButton variant="outline" icon="refresh" label="Actualizar" :loading="loading" @click="refresh" />
      <AppButton variant="secondary" icon="fact_check" label="Ir a campañas" to="/campanias" />
    </template>

    <div class="us-stack">
      <AppNotice tone="info">
        Las campañas llegan a conciliación desde Campañas de inventario. Cada resultado se regulariza con sustento y
        confirmación explícita antes de cerrar la campaña.
      </AppNotice>

      <div class="us-card">
        <DataTable
          :rows="rows"
          :columns="columns"
          row-key="id"
          :card-title="(row) => `${row.id} · ${row.nombre}`"
          :row-actions="actions"
          :loading="loading"
          search-label="Buscar campañas"
          empty-icon="compare_arrows"
          empty-title="No hay campañas en conciliación"
          empty-text="Pase una campaña en curso a conciliación desde su ficha para ver aquí sus resultados."
        >
          <template #cell-id="{ row }">
            <router-link :to="`/conciliacion/${row.id}`" class="table-link u-num">{{ row.id }}</router-link>
          </template>
          <template #cell-estado="{ row }">
            <StatusChip domain="campania" :value="row.estado" />
          </template>
          <template #cell-porRegularizar="{ row }">
            <StatusChip
              v-if="totales(row).porRegularizar > 0"
              domain="regularizacion"
              value="pendiente"
              :label="`${totales(row).porRegularizar} por regularizar`"
            />
            <StatusChip v-else domain="regularizacion" value="regularizado" label="Sin pendientes" />
          </template>
          <template #empty-action>
            <AppButton icon="fact_check" label="Ir a campañas" to="/campanias" />
          </template>
        </DataTable>
      </div>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
// Campañas en conciliación o cerradas, con sus totales de resultados
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import PageContainer from 'src/components/PageContainer.vue';
import AppButton from 'src/components/AppButton.vue';
import AppNotice from 'src/components/AppNotice.vue';
import DataTable from 'src/components/DataTable.vue';
import StatusChip from 'src/components/StatusChip.vue';
import { usePageLoader } from 'src/composables/usePageLoader';
import { formatDateTime } from 'src/core/utils/format';
import {
  calcularTotales,
  campaniasConConciliacion,
  itemsDeCampania,
} from 'src/modules/conciliacion/services/conciliacion.service';
import type { Campania } from 'src/modules/campanias/types';
import type { TotalesConciliacion } from 'src/modules/conciliacion/types';
import type { ActionItem, DataColumn } from 'src/components/types';

const router = useRouter();
const { loading, refresh } = usePageLoader();

const rows = computed(() => campaniasConConciliacion());

function totales(campania: Campania): TotalesConciliacion {
  return calcularTotales(itemsDeCampania(campania.id));
}

const columns: DataColumn<Campania>[] = [
  { name: 'id', label: 'Código', field: 'id', sortable: true, hideInCard: true },
  { name: 'nombre', label: 'Campaña', field: 'nombre', hideInCard: true, classes: 'u-wrap' },
  { name: 'fecha', label: 'Pasó a conciliación', field: (row) => formatDateTime(row.fechaConciliacion), classes: 'u-num', secondary: true },
  { name: 'coincidentes', label: 'Coincidentes', field: (row) => totales(row).coincidentes, align: 'right', classes: 'u-num', secondary: true },
  {
    name: 'diferencias',
    label: 'Diferencias',
    field: (row) => {
      const t = totales(row);
      return t.faltantes + t.sobrantes + t.diferenciasUbicacion + t.diferenciasCantidad;
    },
    align: 'right',
    classes: 'u-num',
  },
  { name: 'porRegularizar', label: 'Regularización', field: (row) => totales(row).porRegularizar, align: 'center' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center' },
];

function actions(row: Campania): ActionItem[] {
  return [
    { key: 'ver', label: 'Ver conciliación', icon: 'visibility', tone: 'view', handler: () => void router.push(`/conciliacion/${row.id}`) },
    { key: 'campania', label: 'Ver campaña', icon: 'fact_check', tone: 'move', handler: () => void router.push(`/campanias/${row.id}`) },
  ];
}
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
</style>
