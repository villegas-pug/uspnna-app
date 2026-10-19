<template>
  <PageContainer title="Conteo físico del almacén" :crumb="almacen?.nombre" reserve-fab>
    <EmptyState
      v-if="!campania || !almacen"
      icon="search_off"
      title="No se encontró la unidad"
      text="La campaña o el almacén ya no existen. Vuelva a la ficha de la campaña."
    >
      <AppButton label="Ir a campañas" to="/campanias" />
    </EmptyState>

    <div v-else class="us-stack us-stack--lg">
      <ContextSummary :items="context" aria-label="Almacén en conteo" />

      <AppNotice v-if="readonly">
        La campaña está {{ ESTADO_CAMPANIA_LABEL[campania.estado].toLowerCase() }}: este conteo es de solo lectura.
      </AppNotice>
      <AppNotice v-else tone="info">
        Registre la cantidad física contada de cada suministro. El stock del sistema se toma al guardar el primer conteo.
      </AppNotice>

      <section>
        <SectionHeader :title="`Suministros a contar (${filas.length})`" icon="inventory" />
        <ul v-if="filas.length > 0" class="conteo-list">
          <li v-for="fila in filas" :key="fila.suministroId" class="conteo-card" :class="`conteo-card--${tono(fila)}`">
            <div class="conteo-card__info">
              <span class="u-num u-hint">{{ fila.suministroId }}</span>
              <div class="conteo-card__name">{{ nombreSuministro(fila.suministroId) }}</div>
              <div class="u-hint">Stock en sistema: <strong class="u-num">{{ formatQuantity(fila.cantidadSistema, unidad(fila)) }}</strong></div>
            </div>
            <div class="conteo-card__controls">
              <q-input
                :model-value="fila.cantidadFisica ?? ''"
                type="number"
                min="0"
                step="any"
                label="Cantidad física"
                outlined
                dense
                :suffix="unidad(fila)"
                :readonly="readonly"
                @update:model-value="(value) => setCantidad(fila, value)"
              />
              <q-input v-model="fila.observaciones" label="Observación (opcional)" outlined dense :readonly="readonly" />
              <div class="conteo-card__diff">
                <StatusChip
                  v-if="fila.cantidadFisica === null"
                  domain="conciliacion"
                  value="pendiente"
                  label="Pendiente de contar"
                />
                <StatusChip
                  v-else-if="fila.cantidadFisica === fila.cantidadSistema"
                  domain="conciliacion"
                  value="coincidente"
                />
                <StatusChip
                  v-else
                  domain="conciliacion"
                  value="diferencia_cantidad"
                  :label="`Diferencia ${diferencia(fila) > 0 ? '+' : ''}${formatNumber(diferencia(fila))}`"
                />
              </div>
            </div>
          </li>
        </ul>
        <EmptyState v-else icon="inventory" title="El almacén no tiene stock" text="Si encuentra suministros, agréguelos al conteo." />

        <div v-if="!readonly" class="agregar">
          <q-select
            v-model="nuevo"
            :options="disponibles"
            label="Agregar suministro encontrado"
            emit-value
            map-options
            outlined
            dense
            clearable
            class="agregar__select"
          />
          <AppButton variant="outline" icon="add" label="Agregar al conteo" :disable="!nuevo" @click="agregar" />
        </div>
      </section>

      <ResultSummary title="Resumen del conteo" :rows="resumen" />

      <FloatingActions :actions="floatingActions" />
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
// Conteo físico de suministros de un almacén (RN-C5): cantidad física frente al stock del sistema
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import PageContainer from 'src/components/PageContainer.vue';
import AppButton from 'src/components/AppButton.vue';
import AppNotice from 'src/components/AppNotice.vue';
import EmptyState from 'src/components/EmptyState.vue';
import ContextSummary from 'src/components/ContextSummary.vue';
import SectionHeader from 'src/components/SectionHeader.vue';
import StatusChip from 'src/components/StatusChip.vue';
import ResultSummary from 'src/components/ResultSummary.vue';
import FloatingActions from 'src/components/FloatingActions.vue';
import { useAsyncTask } from 'src/composables/useAsyncTask';
import { formatNumber, formatQuantity } from 'src/core/utils/format';
import { nombreEstablecimiento, obtenerAlmacen } from 'src/modules/establecimientos/services/establecimientos.service';
import { nombreSuministro, obtenerSuministro, suministrosActivos } from 'src/modules/suministros/services/suministros.service';
import { stockDe } from 'src/modules/suministros/services/stock.service';
import {
  conteosDe,
  guardarConteoAlmacen,
  obtenerCampania,
  puedeVerificar,
  suministrosEsperados,
} from 'src/modules/campanias/services/campanias.service';
import { ESTADO_CAMPANIA_LABEL, type ConteoInput } from 'src/modules/campanias/types';
import type { ContextItem, FloatingAction, ResultRow } from 'src/components/types';

const props = defineProps<{ id: string; almacenId: string }>();

const router = useRouter();
const { loading, run } = useAsyncTask();

const campania = computed(() => obtenerCampania(props.id));
const almacen = computed(() => obtenerAlmacen(props.almacenId));
const readonly = computed(() => !puedeVerificar(campania.value));

const filas = ref<ConteoInput[]>([]);
const nuevo = ref<string | null>(null);

function cargarBorrador(): void {
  const previos = conteosDe(props.id, props.almacenId);
  filas.value = suministrosEsperados(props.id, props.almacenId).map((suministroId) => {
    const previo = previos.find((c) => c.suministroId === suministroId);
    return {
      suministroId,
      cantidadSistema: previo?.cantidadSistema ?? stockDe(props.almacenId, suministroId),
      cantidadFisica: previo?.cantidadFisica ?? null,
      observaciones: previo?.observaciones ?? '',
    };
  });
}

watch(() => [props.id, props.almacenId], cargarBorrador, { immediate: true });

const disponibles = computed(() => {
  const presentes = new Set(filas.value.map((f) => f.suministroId));
  return suministrosActivos()
    .filter((s) => !presentes.has(s.id))
    .map((s) => ({ label: `${s.nombre} (${s.id})`, value: s.id }));
});

function unidad(fila: ConteoInput): string {
  return obtenerSuministro(fila.suministroId)?.unidad ?? '';
}

function diferencia(fila: ConteoInput): number {
  return (fila.cantidadFisica ?? 0) - fila.cantidadSistema;
}

function tono(fila: ConteoInput): string {
  if (fila.cantidadFisica === null) return 'pendiente';
  return diferencia(fila) === 0 ? 'ok' : 'diferencia';
}

function setCantidad(fila: ConteoInput, value: string | number | null): void {
  fila.cantidadFisica = value === null || value === '' ? null : Number(value);
}

function agregar(): void {
  if (!nuevo.value) return;
  filas.value.push({ suministroId: nuevo.value, cantidadSistema: stockDe(props.almacenId, nuevo.value), cantidadFisica: null, observaciones: '' });
  nuevo.value = null;
}

const pendientes = computed(() => filas.value.filter((f) => f.cantidadFisica === null).length);

const context = computed<ContextItem[]>(() => [
  { label: 'Campaña', value: campania.value ? `${campania.value.id} · ${campania.value.nombre}` : '' },
  { label: 'Establecimiento', value: nombreEstablecimiento(almacen.value?.establecimientoId) },
  { label: 'Almacén', value: almacen.value?.nombre ?? '' },
  { label: 'Responsable', value: almacen.value?.responsable ?? '' },
]);

const resumen = computed<ResultRow[]>(() => {
  const contadas = filas.value.filter((f) => f.cantidadFisica !== null);
  return [
    { key: 'ok', tone: 'ok', icon: 'check_circle', label: 'Coincidentes', value: contadas.filter((f) => diferencia(f) === 0).length },
    { key: 'bad', tone: 'bad', icon: 'remove_circle_outline', label: 'Con faltante de unidades', value: contadas.filter((f) => diferencia(f) < 0).length },
    { key: 'obs', tone: 'obs', icon: 'add_circle_outline', label: 'Con unidades de más', value: contadas.filter((f) => diferencia(f) > 0).length },
    { key: 'na', tone: 'na', icon: 'schedule', label: 'Pendientes de contar', value: pendientes.value },
  ];
});

async function guardar(finalizar: boolean): Promise<void> {
  const result = await run(
    () =>
      guardarConteoAlmacen({
        campaniaId: props.id,
        almacenId: props.almacenId,
        conteos: filas.value.map((f) => ({ ...f })),
        finalizar,
      }),
    finalizar ? `Se finalizó el conteo de ${almacen.value?.nombre ?? 'el almacén'}.` : 'Se guardó el avance del conteo.',
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
      label: pendientes.value > 0 ? `Finalizar conteo (faltan ${pendientes.value})` : 'Finalizar conteo',
      tone: 'primary',
      handler: () => void guardar(true),
      disabled: pendientes.value > 0,
      loading: loading.value,
    },
  ];
});
</script>

<style scoped lang="scss">
.conteo-list {
  list-style: none;
  margin: 0 0 var(--space-12);
  padding: 0;
  display: grid;
  gap: var(--space-10);
}

.conteo-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr);
  gap: var(--space-12) var(--space-16);
  align-items: start;
  padding: var(--space-12) var(--space-16);
  border: 1px solid var(--border-card);
  border-left: 4px solid var(--result-na-bar);
  border-radius: var(--radius-box);
  background: var(--surface);
}

.conteo-card--ok {
  border-left-color: var(--result-ok-bar);
}

.conteo-card--diferencia {
  border-left-color: var(--result-obs-bar);
}

.conteo-card__name {
  font-weight: 700;
  overflow-wrap: anywhere;
}

.conteo-card__controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) auto;
  gap: var(--space-8);
  align-items: center;
}

.conteo-card__diff {
  display: flex;
  justify-content: flex-end;
}

.agregar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8);
  align-items: center;
}

.agregar__select {
  flex: 1 1 260px;
  max-width: 480px;
}

@media (max-width: 1023.98px) {
  .conteo-card {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 599.98px) {
  .conteo-card__controls {
    grid-template-columns: minmax(0, 1fr);
  }

  .conteo-card__diff {
    justify-content: flex-start;
  }
}
</style>
