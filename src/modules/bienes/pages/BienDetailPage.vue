<template>
  <PageContainer title="Ficha del bien patrimonial" :crumb="id">
    <template v-if="bien" #actions>
      <AppButton
        variant="outline"
        icon="delete"
        label="Dar de baja"
        :disable="bien.situacion === 'baja'"
        @click="bajaOpen = true"
      />
      <AppButton
        variant="secondary"
        icon="swap_horiz"
        label="Transferir bien"
        :disable="bien.situacion === 'baja'"
        @click="transferOpen = true"
      />
      <AppButton icon="edit" label="Editar bien" :disable="bien.situacion === 'baja'" :to="`/bienes/${bien.id}/editar`" />
    </template>

    <EmptyState
      v-if="!bien"
      icon="search_off"
      title="El bien no existe"
      text="Puede haber sido eliminado al restaurar los datos iniciales. Vuelva al registro de bienes."
    >
      <AppButton label="Ir al registro de bienes" to="/bienes" />
    </EmptyState>

    <div v-else class="us-stack us-stack--lg">
      <ContextSummary :items="context" aria-label="Resumen del bien" />

      <AppNotice v-if="bien.situacion === 'baja'">
        Bien dado de baja. Motivo: {{ bien.motivoBaja ?? 'No registrado' }}. Revise el historial para ver el sustento.
      </AppNotice>

      <div class="detail-grid">
        <section>
          <SectionHeader title="Datos del bien" icon="inventory_2" />
          <DetailTable :rows="datos" caption="Datos del bien">
            <template #codigo>
              <CodigoPatrimonial :codigo="bien.codigoPatrimonial" />
            </template>
            <template #estado>
              <StatusChip domain="conservacion" :value="bien.estadoConservacion" />
            </template>
            <template #situacion>
              <StatusChip domain="situacion" :value="bien.situacion" />
            </template>
          </DetailTable>
        </section>

        <section>
          <SectionHeader title="Ubicación y custodia" icon="place" />
          <DetailTable :rows="ubicacion" caption="Ubicación y custodia" />
          <SectionHeader title="Fotografías y evidencias" icon="photo_library" class="q-mt-lg" />
          <BienFotos :model-value="bien.fotos" readonly />
        </section>
      </div>

      <section>
        <SectionHeader title="Historial del bien" icon="history" />
        <BienHistorial :bien-id="bien.id" />
      </section>
    </div>

    <TransferirBienDialog v-model="transferOpen" :bien="bien ?? null" />
    <BajaBienDialog v-model="bajaOpen" :bien="bien ?? null" />
  </PageContainer>
</template>

<script setup lang="ts">
// Ficha del bien: datos, ubicación, fotografías e historial; acciones de edición, transferencia y baja
import { computed, ref } from 'vue';
import PageContainer from 'src/components/PageContainer.vue';
import AppButton from 'src/components/AppButton.vue';
import AppNotice from 'src/components/AppNotice.vue';
import EmptyState from 'src/components/EmptyState.vue';
import ContextSummary from 'src/components/ContextSummary.vue';
import SectionHeader from 'src/components/SectionHeader.vue';
import DetailTable from 'src/components/DetailTable.vue';
import StatusChip from 'src/components/StatusChip.vue';
import CodigoPatrimonial from 'src/components/CodigoPatrimonial.vue';
import BienFotos from 'src/modules/bienes/components/BienFotos.vue';
import BienHistorial from 'src/modules/bienes/components/BienHistorial.vue';
import TransferirBienDialog from 'src/modules/bienes/components/TransferirBienDialog.vue';
import BajaBienDialog from 'src/modules/bienes/components/BajaBienDialog.vue';
import { formatCurrency, formatDate, formatDateTime } from 'src/core/utils/format';
import {
  nombreAmbiente,
  nombreEstablecimiento,
  obtenerAmbiente,
} from 'src/modules/establecimientos/services/establecimientos.service';
import { obtenerBien } from 'src/modules/bienes/services/bienes.service';
import { CATEGORIA_BIEN_LABEL } from 'src/modules/bienes/types';
import type { ContextItem, DetailRow } from 'src/components/types';

const props = defineProps<{ id: string }>();

const bien = computed(() => obtenerBien(props.id));
const transferOpen = ref(false);
const bajaOpen = ref(false);

const context = computed<ContextItem[]>(() => {
  const b = bien.value;
  if (!b) return [];
  return [
    { label: 'ID interno', value: b.id },
    { label: 'Código patrimonial', value: b.codigoPatrimonial ?? 'Sin código patrimonial' },
    { label: 'Establecimiento', value: nombreEstablecimiento(b.establecimientoId) },
    { label: 'Ambiente', value: nombreAmbiente(b.ambienteId) },
  ];
});

const datos = computed<DetailRow[]>(() => {
  const b = bien.value;
  if (!b) return [];
  return [
    { key: 'descripcion', label: 'Descripción', icon: 'description', value: b.descripcion },
    { key: 'codigo', label: 'Código patrimonial', icon: 'qr_code_2' },
    { key: 'categoria', label: 'Categoría', icon: 'category', value: CATEGORIA_BIEN_LABEL[b.categoria] },
    { key: 'marca', label: 'Marca / modelo', icon: 'sell', value: [b.marca, b.modelo].filter(Boolean).join(' / ') },
    { key: 'serie', label: 'Serie', icon: 'tag', value: b.serie },
    { key: 'color', label: 'Color', icon: 'palette', value: b.color },
    { key: 'fecha', label: 'Fecha de adquisición', icon: 'event', value: formatDate(b.fechaAdquisicion) },
    { key: 'valor', label: 'Valor referencial', icon: 'payments', value: formatCurrency(b.valorReferencial) },
    { key: 'estado', label: 'Estado de conservación', icon: 'health_and_safety' },
    { key: 'situacion', label: 'Situación', icon: 'toggle_on' },
    { key: 'observaciones', label: 'Observaciones', icon: 'notes', value: b.observaciones },
  ];
});

const ubicacion = computed<DetailRow[]>(() => {
  const b = bien.value;
  if (!b) return [];
  return [
    { key: 'car', label: 'Establecimiento', icon: 'home_work', value: nombreEstablecimiento(b.establecimientoId) },
    { key: 'ambiente', label: 'Ambiente', icon: 'meeting_room', value: nombreAmbiente(b.ambienteId) },
    { key: 'piso', label: 'Piso', icon: 'stairs', value: obtenerAmbiente(b.ambienteId)?.piso ?? '' },
    { key: 'custodio', label: 'Custodio', icon: 'badge', value: b.custodio },
    { key: 'registro', label: 'Fecha de registro', icon: 'event_available', value: formatDateTime(b.fechaRegistro) },
    { key: 'actualizacion', label: 'Última actualización', icon: 'update', value: formatDateTime(b.fechaActualizacion) },
  ];
});
</script>

<style scoped lang="scss">
.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 480px), 1fr));
  gap: var(--space-24);
  align-items: start;
}
</style>
