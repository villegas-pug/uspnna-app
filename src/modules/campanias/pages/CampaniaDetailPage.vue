<template>
  <PageContainer :title="campania ? campania.nombre : 'Campaña no encontrada'" :crumb="campania?.id">
    <template v-if="campania" #actions>
      <template v-if="campania.estado === 'planificada'">
        <AppButton variant="outline" icon="edit" label="Editar campaña" @click="dialogOpen = true" />
        <AppButton icon="play_arrow" label="Iniciar campaña" :loading="acciones.loading.value" @click="acciones.iniciar(campania)" />
      </template>
      <AppButton
        v-else-if="campania.estado === 'en_curso'"
        icon="compare_arrows"
        label="Pasar a conciliación"
        :loading="acciones.loading.value"
        @click="acciones.conciliar(campania)"
      />
      <AppButton v-else icon="compare_arrows" label="Ver conciliación" :to="`/conciliacion/${campania.id}`" />
    </template>

    <EmptyState v-if="!campania" icon="search_off" title="La campaña no existe" text="Vuelva al listado de campañas.">
      <AppButton label="Ir a campañas" to="/campanias" />
    </EmptyState>

    <div v-else class="us-stack us-stack--lg">
      <ContextSummary :items="context" aria-label="Resumen de la campaña" />

      <AppNotice v-if="campania.estado === 'planificada'" tone="info">
        La campaña está planificada. Inicie la campaña para que el equipo registre la verificación física.
      </AppNotice>
      <AppNotice v-else-if="campania.estado !== 'en_curso'">
        La verificación está cerrada ({{ ESTADO_CAMPANIA_LABEL[campania.estado].toLowerCase() }}): las unidades se muestran en solo lectura.
      </AppNotice>

      <section>
        <SectionHeader title="Datos de la campaña" icon="info" />
        <DetailTable :rows="detalle" caption="Datos de la campaña">
          <template #estado>
            <StatusChip domain="campania" :value="campania.estado" />
          </template>
        </DetailTable>
      </section>

      <section>
        <SectionHeader title="Avance por establecimiento" icon="checklist" />
        <q-tabs v-model="carTab" class="us-tabs" align="left" outside-arrows mobile-arrows no-caps>
          <q-tab v-for="carId in campania.establecimientoIds" :key="carId" :name="carId" :label="nombreEstablecimiento(carId)" />
        </q-tabs>
        <div class="q-mt-md">
          <DataTable
            :rows="unidades"
            :columns="columns"
            row-key="unidadId"
            :card-title="(row) => row.nombre"
            :row-actions="actions"
            :searchable="false"
            :rows-per-page="0"
            empty-icon="meeting_room"
            empty-title="Sin unidades"
            empty-text="El CAR no tiene ambientes ni almacenes activos."
          >
            <template #cell-tipo="{ row }">
              <span class="unidad-tipo">
                <q-icon :name="row.tipo === 'ambiente' ? 'meeting_room' : 'warehouse'" size="18px" aria-hidden="true" />
                {{ row.tipo === 'ambiente' ? 'Ambiente' : 'Almacén' }}
              </span>
            </template>
            <template #cell-estado="{ row }">
              <StatusChip domain="unidad" :value="row.estado" />
            </template>
          </DataTable>
        </div>
      </section>
    </div>

    <CampaniaFormDialog v-if="campania" v-model="dialogOpen" :campania="campania" />
  </PageContainer>
</template>

<script setup lang="ts">
// Ficha de campaña: datos, acciones según el estado y avance de verificación por CAR y unidad
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import PageContainer from 'src/components/PageContainer.vue';
import AppButton from 'src/components/AppButton.vue';
import AppNotice from 'src/components/AppNotice.vue';
import EmptyState from 'src/components/EmptyState.vue';
import ContextSummary from 'src/components/ContextSummary.vue';
import SectionHeader from 'src/components/SectionHeader.vue';
import DetailTable from 'src/components/DetailTable.vue';
import DataTable from 'src/components/DataTable.vue';
import StatusChip from 'src/components/StatusChip.vue';
import CampaniaFormDialog from 'src/modules/campanias/components/CampaniaFormDialog.vue';
import { useCampaniaAcciones } from 'src/modules/campanias/composables/useCampaniaAcciones';
import { formatDate, formatDateTime, formatPercent } from 'src/core/utils/format';
import { nombreEstablecimiento } from 'src/modules/establecimientos/services/establecimientos.service';
import {
  avanceCampania,
  avanceUnidades,
  obtenerCampania,
  puedeVerificar,
} from 'src/modules/campanias/services/campanias.service';
import {
  ESTADO_CAMPANIA_LABEL,
  TIPO_CAMPANIA_LABEL,
  type AvanceUnidad,
} from 'src/modules/campanias/types';
import type { ActionItem, ContextItem, DataColumn, DetailRow } from 'src/components/types';

const props = defineProps<{ id: string }>();

const router = useRouter();
const acciones = useCampaniaAcciones();
const dialogOpen = ref(false);

const campania = computed(() => obtenerCampania(props.id));
const carTab = ref<string>('');

watch(
  campania,
  (actual) => {
    if (actual && !actual.establecimientoIds.includes(carTab.value)) carTab.value = actual.establecimientoIds[0] ?? '';
  },
  { immediate: true },
);

const avance = computed(() => (campania.value ? avanceCampania(campania.value) : null));
const unidades = computed(() => (campania.value && carTab.value ? avanceUnidades(campania.value, carTab.value) : []));

const context = computed<ContextItem[]>(() => {
  const c = campania.value;
  if (!c || !avance.value) return [];
  return [
    { label: 'Código', value: c.id },
    { label: 'Estado', value: ESTADO_CAMPANIA_LABEL[c.estado] },
    { label: 'Periodo', value: `${formatDate(c.fechaInicio)} – ${formatDate(c.fechaFin)}` },
    {
      label: 'Avance',
      value: `${formatPercent(avance.value.porcentaje)} (${avance.value.unidadesVerificadas} de ${avance.value.unidades} unidades)`,
    },
  ];
});

const detalle = computed<DetailRow[]>(() => {
  const c = campania.value;
  if (!c) return [];
  const filas: DetailRow[] = [
    { key: 'tipo', label: 'Tipo', icon: 'category', value: TIPO_CAMPANIA_LABEL[c.tipo] },
    { key: 'estado', label: 'Estado', icon: 'flag' },
    { key: 'cars', label: 'Establecimientos', icon: 'home_work', value: c.establecimientoIds.map((id) => nombreEstablecimiento(id)).join(', ') },
    { key: 'responsable', label: 'Equipo responsable', icon: 'groups', value: c.responsable },
    { key: 'descripcion', label: 'Descripción', icon: 'notes', value: c.descripcion },
  ];
  if (c.fechaConciliacion) filas.push({ key: 'conciliacion', label: 'Pasó a conciliación', icon: 'compare_arrows', value: formatDateTime(c.fechaConciliacion) });
  if (c.fechaCierre) filas.push({ key: 'cierre', label: 'Fecha de cierre', icon: 'lock', value: formatDateTime(c.fechaCierre) });
  return filas;
});

const columns: DataColumn<AvanceUnidad>[] = [
  { name: 'tipo', label: 'Tipo', field: 'tipo' },
  { name: 'nombre', label: 'Unidad', field: 'nombre', hideInCard: true },
  { name: 'responsable', label: 'Custodio o responsable', field: 'responsable', secondary: true },
  {
    name: 'avance',
    label: 'Verificados',
    field: (row) => `${row.verificados} de ${row.esperados} ${row.tipo === 'ambiente' ? 'bienes' : 'suministros'}`,
    classes: 'u-num',
  },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center' },
];

function rutaUnidad(unidad: AvanceUnidad): string {
  const segmento = unidad.tipo === 'ambiente' ? 'ambientes' : 'almacenes';
  return `/campanias/${props.id}/${segmento}/${unidad.unidadId}`;
}

function actions(row: AvanceUnidad): ActionItem[] {
  const editable = puedeVerificar(campania.value);
  const planificada = campania.value?.estado === 'planificada';
  if (editable) {
    return [
      {
        key: 'verificar',
        label: row.tipo === 'ambiente' ? 'Verificar ambiente' : 'Contar almacén',
        icon: 'fact_check',
        tone: 'success',
        handler: () => void router.push(rutaUnidad(row)),
      },
    ];
  }
  return [
    {
      key: 'ver',
      label: 'Ver verificación',
      icon: 'visibility',
      tone: 'view',
      disabled: planificada,
      disabledReason: 'Inicie la campaña para verificar.',
      handler: () => void router.push(rutaUnidad(row)),
    },
  ];
}
</script>

<style scoped lang="scss">
.unidad-tipo {
  display: inline-flex;
  align-items: center;
  gap: var(--space-4);
}
</style>
