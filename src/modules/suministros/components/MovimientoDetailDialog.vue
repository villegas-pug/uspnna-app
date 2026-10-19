<template>
  <AppDialog
    v-model="open"
    :title="movimiento ? `${TIPO_MOVIMIENTO_LABEL[movimiento.tipo]} ${movimiento.id}` : 'Movimiento'"
    :subtitle="movimiento ? `${formatDate(movimiento.fecha)} · ${movimiento.motivo}` : ''"
    icon="receipt_long"
    size="lg"
  >
    <template v-if="movimiento">
      <DetailTable :rows="datos" caption="Datos del movimiento" class="q-mb-lg" />
      <SectionHeader title="Detalle por lote" icon="list_alt" tag="h3" />
      <DataTable
        :rows="filas"
        :columns="columns"
        row-key="key"
        :card-title="(row) => row.nombre"
        :searchable="false"
        :rows-per-page="10"
      />
    </template>
    <template #actions>
      <AppButton variant="outline" label="Cerrar" @click="open = false" />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
// Detalle de un movimiento de almacén (solo lectura: los movimientos no se editan, RN-S6)
import { computed } from 'vue';
import AppDialog from 'src/components/AppDialog.vue';
import AppButton from 'src/components/AppButton.vue';
import DetailTable from 'src/components/DetailTable.vue';
import SectionHeader from 'src/components/SectionHeader.vue';
import DataTable from 'src/components/DataTable.vue';
import { formatDate, formatDateTime, formatNumber } from 'src/core/utils/format';
import { nombreAlmacen } from 'src/modules/establecimientos/services/establecimientos.service';
import { obtenerSuministro } from 'src/modules/suministros/services/suministros.service';
import { TIPO_MOVIMIENTO_LABEL, type Movimiento } from 'src/modules/suministros/types';
import type { DataColumn, DetailRow } from 'src/components/types';

interface FilaItem {
  key: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  lote: string;
  vencimiento: string;
}

const props = defineProps<{ movimiento: Movimiento | null }>();
const open = defineModel<boolean>({ required: true });

const datos = computed<DetailRow[]>(() => {
  const m = props.movimiento;
  if (!m) return [];
  const filas: DetailRow[] = [
    { key: 'tipo', label: 'Tipo', icon: 'category', value: TIPO_MOVIMIENTO_LABEL[m.tipo] },
    { key: 'fecha', label: 'Fecha', icon: 'event', value: formatDate(m.fecha) },
  ];
  if (m.almacenOrigenId) filas.push({ key: 'origen', label: 'Almacén de origen', icon: 'logout', value: nombreAlmacen(m.almacenOrigenId) });
  if (m.almacenDestinoId) filas.push({ key: 'destino', label: 'Almacén de destino', icon: 'login', value: nombreAlmacen(m.almacenDestinoId) });
  filas.push(
    { key: 'documento', label: 'Documento', icon: 'description', value: m.documento },
    { key: 'motivo', label: 'Motivo', icon: 'help_outline', value: m.motivo },
    { key: 'observaciones', label: 'Observaciones', icon: 'notes', value: m.observaciones },
    { key: 'registro', label: 'Registrado', icon: 'schedule', value: formatDateTime(m.fechaRegistro) },
  );
  return filas;
});

const filas = computed<FilaItem[]>(() =>
  (props.movimiento?.items ?? []).map((item, index) => {
    const suministro = obtenerSuministro(item.suministroId);
    return {
      key: `${index}`,
      nombre: suministro?.nombre ?? item.suministroId,
      unidad: suministro?.unidad ?? '',
      cantidad: item.cantidad,
      lote: item.numeroLote ?? 'Sin lote',
      vencimiento: formatDate(item.fechaVencimiento) || 'Sin vencimiento',
    };
  }),
);

const columns: DataColumn<FilaItem>[] = [
  { name: 'nombre', label: 'Suministro', field: 'nombre', hideInCard: true },
  { name: 'cantidad', label: 'Cantidad', field: (row) => `${formatNumber(row.cantidad)} ${row.unidad}`, align: 'right', classes: 'u-num' },
  { name: 'lote', label: 'Lote', field: 'lote' },
  { name: 'vencimiento', label: 'Vencimiento', field: 'vencimiento', classes: 'u-num' },
];
</script>
