<template>
  <AppDialog
    v-model="open"
    :title="fila ? `Lotes de ${fila.suministro.nombre}` : 'Lotes'"
    :subtitle="fila ? nombreAlmacen(fila.almacenId) : ''"
    icon="inventory"
    size="lg"
  >
    <template v-if="fila">
      <ContextSummary :items="context" aria-label="Resumen del stock" class="q-mb-md" />
      <DataTable
        :rows="lotes"
        :columns="columns"
        row-key="id"
        :card-title="(row) => row.numeroLote ?? 'Sin lote'"
        :searchable="false"
        :rows-per-page="10"
        empty-icon="inventory"
        empty-title="Sin lotes"
        empty-text="Este suministro aún no tiene lotes en el almacén."
      >
        <template #cell-estado="{ row }">
          <StatusChip domain="vencimiento" :value="estadoVencimiento(row.fechaVencimiento)" />
        </template>
      </DataTable>
    </template>
    <template #actions>
      <AppButton variant="outline" label="Cerrar" @click="open = false" />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
// Detalle de lotes (FEFO) de un suministro en un almacén
import { computed } from 'vue';
import AppDialog from 'src/components/AppDialog.vue';
import AppButton from 'src/components/AppButton.vue';
import ContextSummary from 'src/components/ContextSummary.vue';
import DataTable from 'src/components/DataTable.vue';
import StatusChip from 'src/components/StatusChip.vue';
import { formatDate, formatNumber, formatQuantity } from 'src/core/utils/format';
import { nombreAlmacen } from 'src/modules/establecimientos/services/establecimientos.service';
import { estadoVencimiento, lotesDe } from 'src/modules/suministros/services/stock.service';
import { ESTADO_STOCK_LABEL, type Lote, type StockItem } from 'src/modules/suministros/types';
import type { ContextItem, DataColumn } from 'src/components/types';

const props = defineProps<{ fila: StockItem | null }>();
const open = defineModel<boolean>({ required: true });

const lotes = computed(() => (props.fila ? lotesDe(props.fila.almacenId, props.fila.suministro.id) : []));

const context = computed<ContextItem[]>(() => {
  const fila = props.fila;
  if (!fila) return [];
  return [
    { label: 'Stock total', value: formatQuantity(fila.cantidad, fila.suministro.unidad) },
    { label: 'Stock mínimo', value: formatQuantity(fila.suministro.stockMinimo, fila.suministro.unidad) },
    { label: 'Estado', value: ESTADO_STOCK_LABEL[fila.estado] },
    { label: 'Lotes', value: formatNumber(lotes.value.length) },
  ];
});

const columns: DataColumn<Lote>[] = [
  { name: 'lote', label: 'Lote', field: (row) => row.numeroLote ?? 'Sin lote', hideInCard: true },
  { name: 'vencimiento', label: 'Vencimiento', field: (row) => formatDate(row.fechaVencimiento) || 'Sin vencimiento', classes: 'u-num' },
  { name: 'cantidad', label: 'Cantidad', field: 'cantidad', format: (value) => formatNumber(Number(value)), align: 'right', classes: 'u-num' },
  { name: 'ingreso', label: 'Ingreso', field: (row) => formatDate(row.fechaIngreso), classes: 'u-num', secondary: true },
  { name: 'estado', label: 'Estado', field: 'fechaVencimiento', align: 'center' },
];
</script>
