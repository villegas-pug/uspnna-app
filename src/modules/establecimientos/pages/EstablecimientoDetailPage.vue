<template>
  <PageContainer :title="car ? car.nombre : 'Establecimiento no encontrado'" :crumb="car?.id">
    <template v-if="car" #actions>
      <AppButton variant="outline" icon="inventory_2" label="Ver bienes" :to="{ path: '/bienes', query: { establecimiento: car.id } }" />
      <AppButton icon="edit" label="Editar establecimiento" @click="dialogOpen = true" />
    </template>

    <EmptyState
      v-if="!car"
      icon="search_off"
      title="El establecimiento no existe"
      text="Puede haber sido eliminado al restaurar los datos iniciales. Vuelva al listado."
    >
      <AppButton label="Ir a establecimientos" to="/establecimientos" />
    </EmptyState>

    <div v-else class="us-stack us-stack--lg">
      <ContextSummary :items="context" aria-label="Resumen del establecimiento" />

      <section>
        <SectionHeader title="Datos generales" icon="info" />
        <DetailTable :rows="detalle" caption="Datos generales del establecimiento">
          <template #levantamiento>
            <StatusChip domain="levantamiento" :value="car.estadoLevantamiento" />
            <span v-if="car.fechaLevantamiento" class="u-hint q-ml-sm">Cerrado el {{ formatDate(car.fechaLevantamiento) }}</span>
          </template>
          <template #estado>
            <StatusChip domain="registro" :value="car.estado" />
          </template>
        </DetailTable>
      </section>

      <section>
        <q-tabs v-model="tab" class="us-tabs" align="left" inline-label outside-arrows mobile-arrows no-caps>
          <q-tab name="ambientes" icon="meeting_room" :label="`Ambientes (${ambientes})`" />
          <q-tab name="almacenes" icon="warehouse" :label="`Almacenes (${almacenes})`" />
        </q-tabs>
        <q-tab-panels v-model="tab" animated class="q-mt-md">
          <q-tab-panel name="ambientes" class="q-pa-none">
            <div class="tab-actions">
              <AppButton variant="secondary" icon="add" label="Nuevo ambiente" @click="ambientesRef?.openCreate()" />
            </div>
            <AmbientesTable ref="ambientesRef" :establecimiento-id="car.id" />
          </q-tab-panel>
          <q-tab-panel name="almacenes" class="q-pa-none">
            <div class="tab-actions">
              <AppButton variant="secondary" icon="add" label="Nuevo almacén" @click="almacenesRef?.openCreate()" />
            </div>
            <AlmacenesTable ref="almacenesRef" :establecimiento-id="car.id" />
          </q-tab-panel>
        </q-tab-panels>
      </section>
    </div>

    <EstablecimientoFormDialog v-if="car" v-model="dialogOpen" :establecimiento="car" />
  </PageContainer>
</template>

<script setup lang="ts">
// Ficha del CAR: datos generales, ambientes y almacenes
import { computed, ref } from 'vue';
import PageContainer from 'src/components/PageContainer.vue';
import AppButton from 'src/components/AppButton.vue';
import EmptyState from 'src/components/EmptyState.vue';
import ContextSummary from 'src/components/ContextSummary.vue';
import SectionHeader from 'src/components/SectionHeader.vue';
import DetailTable from 'src/components/DetailTable.vue';
import StatusChip from 'src/components/StatusChip.vue';
import AmbientesTable from 'src/modules/establecimientos/components/AmbientesTable.vue';
import AlmacenesTable from 'src/modules/establecimientos/components/AlmacenesTable.vue';
import EstablecimientoFormDialog from 'src/modules/establecimientos/components/EstablecimientoFormDialog.vue';
import { formatDate, formatNumber } from 'src/core/utils/format';
import {
  contarBienesActivos,
  listarAlmacenes,
  listarAmbientes,
  obtenerEstablecimiento,
} from 'src/modules/establecimientos/services/establecimientos.service';
import type { ContextItem, DetailRow } from 'src/components/types';

const props = defineProps<{ id: string }>();

const car = computed(() => obtenerEstablecimiento(props.id));
const tab = ref<'ambientes' | 'almacenes'>('ambientes');
const dialogOpen = ref(false);
const ambientesRef = ref<InstanceType<typeof AmbientesTable> | null>(null);
const almacenesRef = ref<InstanceType<typeof AlmacenesTable> | null>(null);

const ambientes = computed(() => listarAmbientes(props.id).length);
const almacenes = computed(() => listarAlmacenes(props.id).length);

const context = computed<ContextItem[]>(() =>
  car.value
    ? [
        { label: 'Código', value: car.value.id },
        { label: 'Ubicación', value: `${car.value.distrito}, ${car.value.departamento}` },
        { label: 'Bienes activos', value: formatNumber(contarBienesActivos({ establecimientoId: car.value.id })) },
        { label: 'Capacidad', value: `${formatNumber(car.value.capacidad)} plazas` },
      ]
    : [],
);

const detalle = computed<DetailRow[]>(() => {
  const c = car.value;
  if (!c) return [];
  return [
    { key: 'nombre', label: 'Nombre', icon: 'home_work', value: c.nombre },
    { key: 'poblacion', label: 'Población objetivo', icon: 'groups', value: c.tipoPoblacion },
    { key: 'direccion', label: 'Dirección', icon: 'place', value: c.direccion },
    { key: 'distrito', label: 'Distrito / provincia / departamento', icon: 'map', value: `${c.distrito} / ${c.provincia} / ${c.departamento}` },
    { key: 'responsable', label: 'Responsable', icon: 'badge', value: c.responsable },
    { key: 'levantamiento', label: 'Levantamiento inicial', icon: 'fact_check' },
    { key: 'estado', label: 'Estado', icon: 'toggle_on' },
  ];
});
</script>

<style scoped lang="scss">
.tab-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-12);
}
</style>
