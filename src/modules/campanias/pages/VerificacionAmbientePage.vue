<template>
  <PageContainer title="Verificación física del ambiente" :crumb="ambiente?.nombre" reserve-fab>
    <EmptyState
      v-if="!campania || !ambiente"
      icon="search_off"
      title="No se encontró la unidad"
      text="La campaña o el ambiente ya no existen. Vuelva a la ficha de la campaña."
    >
      <AppButton label="Ir a campañas" to="/campanias" />
    </EmptyState>

    <div v-else class="us-stack us-stack--lg">
      <ContextSummary :items="context" aria-label="Unidad en verificación" />

      <AppNotice v-if="readonly">
        La campaña está {{ ESTADO_CAMPANIA_LABEL[campania.estado].toLowerCase() }}: esta verificación es de solo lectura.
      </AppNotice>
      <AppNotice v-else tone="info">
        Marque cada bien como encontrado o no encontrado y actualice su estado de conservación. Si encuentra un bien que no
        figura en la lista, agréguelo como bien encontrado.
      </AppNotice>

      <section>
        <SectionHeader :title="`Bienes esperados (${esperados.length})`" icon="checklist" />
        <div class="toolbar">
          <q-input
            v-model="busqueda"
            dense
            outlined
            clearable
            debounce="200"
            placeholder="Buscar..."
            aria-label="Buscar bienes del ambiente"
            class="toolbar__search"
          >
            <template #append><q-icon name="search" aria-hidden="true" /></template>
          </q-input>
          <AppButton
            v-if="!readonly"
            variant="outline"
            icon="done_all"
            label="Marcar pendientes como encontrados"
            :disable="pendientes === 0"
            @click="marcarPendientes"
          />
        </div>

        <ul v-if="filas.length > 0" class="bien-list">
          <li v-for="{ bien, marca } in filas" :key="bien.id" class="bien-card" :class="`bien-card--${marca.hallazgo ?? 'pendiente'}`">
            <div class="bien-card__info">
              <div class="bien-card__ids">
                <span class="u-num bien-card__id">{{ bien.id }}</span>
                <CodigoPatrimonial :codigo="bien.codigoPatrimonial" />
              </div>
              <div class="bien-card__desc">{{ bien.descripcion }}</div>
              <div class="u-hint">{{ [bien.marca, bien.modelo, bien.serie].filter(Boolean).join(' · ') || 'Sin marca, modelo ni serie' }}</div>
            </div>
            <div class="bien-card__controls">
              <q-btn-toggle
                v-model="marca.hallazgo"
                :options="opcionesHallazgo"
                :disable="readonly"
                unelevated
                no-caps
                spread
                class="bien-card__toggle"
                toggle-color="secondary"
                :aria-label="`Resultado de ${bien.id}`"
              />
              <q-select
                v-if="marca.hallazgo === 'encontrado'"
                v-model="marca.estadoConservacion"
                :options="estados"
                label="Estado de conservación"
                emit-value
                map-options
                outlined
                dense
                :readonly="readonly"
              />
              <q-input
                v-model="marca.observaciones"
                label="Observación (opcional)"
                outlined
                dense
                :readonly="readonly"
              />
            </div>
          </li>
        </ul>
        <EmptyState
          v-else
          :icon="busqueda ? 'search_off' : 'inventory_2'"
          :title="busqueda ? 'Sin coincidencias' : 'El ambiente no tiene bienes registrados'"
          :text="busqueda ? 'Ningún bien coincide con la búsqueda.' : 'Si encuentra bienes, agréguelos como bienes encontrados.'"
        />
      </section>

      <section>
        <SectionHeader :title="`Bienes encontrados no esperados (${adicionales.length})`" icon="add_location_alt" />
        <ul v-if="adicionales.length > 0" class="extra-list">
          <li v-for="(hallazgo, index) in adicionales" :key="`${hallazgo.bienId ?? 'sobrante'}-${index}`" class="extra-card">
            <div class="extra-card__info">
              <StatusChip
                :domain="'conciliacion'"
                :value="hallazgo.bienId ? 'diferencia_ubicacion' : 'sobrante'"
              />
              <div class="bien-card__desc">
                <span v-if="hallazgo.bienId" class="u-num">{{ hallazgo.bienId }} · </span>{{ hallazgo.descripcion }}
              </div>
              <div class="u-hint">
                {{
                  hallazgo.bienId
                    ? `Registrado en ${ubicacionAmbiente(obtenerBien(hallazgo.bienId)?.ambienteId)}`
                    : hallazgo.codigoPatrimonialLeido
                      ? `Código leído: ${hallazgo.codigoPatrimonialLeido}`
                      : 'Sin código patrimonial'
                }}
                · Estado {{ ESTADO_CONSERVACION_LABEL[hallazgo.estadoConservacion] }}
              </div>
            </div>
            <q-btn
              v-if="!readonly"
              flat
              round
              dense
              icon="delete"
              color="negative"
              :aria-label="`Quitar ${hallazgo.descripcion}`"
              @click="adicionales.splice(index, 1)"
            />
          </li>
        </ul>
        <p v-else class="u-muted">No se registraron bienes adicionales en este ambiente.</p>
        <AppButton v-if="!readonly" variant="outline" icon="add" label="Agregar bien encontrado" @click="hallazgoOpen = true" />
      </section>

      <ResultSummary title="Resumen de la verificación" :rows="resumen" />

      <FloatingActions :actions="floatingActions" />
    </div>

    <AgregarHallazgoDialog v-model="hallazgoOpen" :excluidos="excluidos" @add="adicionales.push($event)" />
  </PageContainer>
</template>

<script setup lang="ts">
// Verificación física de un ambiente (RN-C4, RN-C5): marcas por bien, hallazgos adicionales y resumen
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import PageContainer from 'src/components/PageContainer.vue';
import AppButton from 'src/components/AppButton.vue';
import AppNotice from 'src/components/AppNotice.vue';
import EmptyState from 'src/components/EmptyState.vue';
import ContextSummary from 'src/components/ContextSummary.vue';
import SectionHeader from 'src/components/SectionHeader.vue';
import StatusChip from 'src/components/StatusChip.vue';
import CodigoPatrimonial from 'src/components/CodigoPatrimonial.vue';
import ResultSummary from 'src/components/ResultSummary.vue';
import FloatingActions from 'src/components/FloatingActions.vue';
import AgregarHallazgoDialog from 'src/modules/campanias/components/AgregarHallazgoDialog.vue';
import { useAsyncTask } from 'src/composables/useAsyncTask';
import { optionsFrom } from 'src/core/utils/options';
import { matchesSearch } from 'src/core/utils/format';
import {
  nombreEstablecimiento,
  obtenerAmbiente,
  ubicacionAmbiente,
} from 'src/modules/establecimientos/services/establecimientos.service';
import { bienesActivosEn, obtenerBien } from 'src/modules/bienes/services/bienes.service';
import {
  guardarVerificacionAmbiente,
  obtenerCampania,
  puedeVerificar,
  verificacionesDe,
} from 'src/modules/campanias/services/campanias.service';
import { ESTADO_CONSERVACION_LABEL } from 'src/modules/bienes/types';
import {
  ESTADO_CAMPANIA_LABEL,
  type HallazgoAdicionalInput,
  type MarcaBienInput,
} from 'src/modules/campanias/types';
import type { ContextItem, FloatingAction, ResultRow } from 'src/components/types';

const props = defineProps<{ id: string; ambienteId: string }>();

const router = useRouter();
const { loading, run } = useAsyncTask();

const campania = computed(() => obtenerCampania(props.id));
const ambiente = computed(() => obtenerAmbiente(props.ambienteId));
const readonly = computed(() => !puedeVerificar(campania.value));
const esperados = computed(() => (ambiente.value ? bienesActivosEn(ambiente.value.id) : []));

const marcas = reactive<Record<string, MarcaBienInput>>({});
const adicionales = ref<HallazgoAdicionalInput[]>([]);
const busqueda = ref('');
const hallazgoOpen = ref(false);

const estados = optionsFrom(ESTADO_CONSERVACION_LABEL);
const opcionesHallazgo = [
  { label: 'Encontrado', value: 'encontrado', icon: 'check_circle', toggleColor: 'positive' },
  { label: 'No encontrado', value: 'no_encontrado', icon: 'cancel', toggleColor: 'negative' },
];

// Carga el borrador desde las marcas guardadas de esta campaña y ambiente
function cargarBorrador(): void {
  const registros = verificacionesDe(props.id, props.ambienteId);
  const ids = new Set(esperados.value.map((b) => b.id));
  for (const key of Object.keys(marcas)) delete marcas[key];
  for (const bien of esperados.value) {
    const registro = registros.find((r) => r.bienId === bien.id);
    marcas[bien.id] = {
      bienId: bien.id,
      hallazgo: registro?.hallazgo ?? null,
      estadoConservacion: registro?.estadoConservacion ?? bien.estadoConservacion,
      observaciones: registro?.observaciones ?? '',
    };
  }
  adicionales.value = registros
    .filter((r) => r.bienId === null || !ids.has(r.bienId))
    .map((r) => ({
      bienId: r.bienId,
      descripcion: r.descripcion,
      codigoPatrimonialLeido: r.codigoPatrimonialLeido,
      estadoConservacion: r.estadoConservacion,
      observaciones: r.observaciones,
    }));
}

watch(() => [props.id, props.ambienteId], cargarBorrador, { immediate: true });

// Pares bien–marca visibles según la búsqueda (la marca es reactiva y se edita en su lugar)
const filas = computed(() =>
  esperados.value.flatMap((bien) => {
    const marca = marcas[bien.id];
    const visible = matchesSearch(busqueda.value ?? '', bien.id, bien.codigoPatrimonial, bien.descripcion, bien.serie);
    return marca && visible ? [{ bien, marca }] : [];
  }),
);

const encontrados = computed(() => Object.values(marcas).filter((m) => m.hallazgo === 'encontrado').length);
const noEncontrados = computed(() => Object.values(marcas).filter((m) => m.hallazgo === 'no_encontrado').length);
const pendientes = computed(() => Object.values(marcas).filter((m) => m.hallazgo === null).length);
const excluidos = computed(() => [
  ...esperados.value.map((b) => b.id),
  ...adicionales.value.flatMap((a) => (a.bienId ? [a.bienId] : [])),
]);

const context = computed<ContextItem[]>(() => [
  { label: 'Campaña', value: campania.value ? `${campania.value.id} · ${campania.value.nombre}` : '' },
  { label: 'Establecimiento', value: nombreEstablecimiento(ambiente.value?.establecimientoId) },
  { label: 'Ambiente', value: ambiente.value ? `${ambiente.value.nombre} (${ambiente.value.piso})` : '' },
  { label: 'Custodio', value: ambiente.value?.custodio ?? '' },
]);

const resumen = computed<ResultRow[]>(() => [
  { key: 'ok', tone: 'ok', icon: 'check_circle', label: 'Encontrados', value: encontrados.value },
  { key: 'bad', tone: 'bad', icon: 'cancel', label: 'No encontrados', value: noEncontrados.value },
  { key: 'obs', tone: 'obs', icon: 'add_location_alt', label: 'Encontrados no esperados', value: adicionales.value.length },
  { key: 'na', tone: 'na', icon: 'schedule', label: 'Pendientes de marcar', value: pendientes.value },
]);

function marcarPendientes(): void {
  for (const marca of Object.values(marcas)) {
    if (marca.hallazgo === null) marca.hallazgo = 'encontrado';
  }
}

async function guardar(finalizar: boolean): Promise<void> {
  const result = await run(
    () =>
      guardarVerificacionAmbiente({
        campaniaId: props.id,
        ambienteId: props.ambienteId,
        marcas: Object.values(marcas).map((m) => ({ ...m })),
        adicionales: adicionales.value.map((a) => ({ ...a })),
        finalizar,
      }),
    finalizar ? `Se finalizó la verificación de ${ambiente.value?.nombre ?? 'el ambiente'}.` : 'Se guardó el avance de la verificación.',
  );
  if (result.ok && finalizar) await router.push(`/campanias/${props.id}`);
}

const floatingActions = computed<FloatingAction[]>(() => {
  const volver: FloatingAction = {
    key: 'volver',
    icon: 'arrow_back',
    label: 'Volver a la campaña',
    tone: 'neutral',
    handler: () => void router.push(`/campanias/${props.id}`),
  };
  if (readonly.value) return [volver];
  return [
    volver,
    { key: 'avance', icon: 'save', label: 'Guardar avance', tone: 'secondary', handler: () => void guardar(false), loading: loading.value },
    {
      key: 'finalizar',
      icon: 'task_alt',
      label: pendientes.value > 0 ? `Finalizar verificación (faltan ${pendientes.value})` : 'Finalizar verificación',
      tone: 'primary',
      handler: () => void guardar(true),
      disabled: pendientes.value > 0,
      loading: loading.value,
    },
  ];
});
</script>

<style scoped lang="scss">
.toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-8);
  margin-bottom: var(--space-12);
}

.toolbar__search {
  flex: 1 1 240px;
  max-width: 420px;
}

.bien-list,
.extra-list {
  list-style: none;
  margin: 0 0 var(--space-12);
  padding: 0;
  display: grid;
  gap: var(--space-10);
}

.bien-card,
.extra-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  gap: var(--space-12) var(--space-16);
  align-items: start;
  padding: var(--space-12) var(--space-16);
  border: 1px solid var(--border-card);
  border-left: 4px solid var(--result-na-bar);
  border-radius: var(--radius-box);
  background: var(--surface);
}

.bien-card--encontrado {
  border-left-color: var(--result-ok-bar);
}

.bien-card--no_encontrado {
  border-left-color: var(--result-bad-bar);
}

.extra-card {
  grid-template-columns: minmax(0, 1fr) auto;
  border-left-color: var(--result-obs-bar);
}

.bien-card__ids {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-8);
  margin-bottom: var(--space-4);
}

.bien-card__id {
  font-weight: 700;
}

.bien-card__desc {
  font-weight: 700;
  overflow-wrap: anywhere;
  margin: var(--space-4) 0 2px;
}

.bien-card__controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-8);
}

.bien-card__toggle {
  grid-column: 1 / -1;
  border: 1px solid var(--border-control);
  border-radius: var(--radius-btn);

  :deep(.q-btn) {
    min-height: var(--button-height);
  }
}

@media (max-width: 1023.98px) {
  .bien-card {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 599.98px) {
  .bien-card__controls {
    grid-template-columns: minmax(0, 1fr);
  }

  .bien-card__toggle :deep(.q-btn) {
    min-height: var(--touch-target);
  }
}
</style>
