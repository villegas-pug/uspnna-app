<template>
  <AppDialog
    v-model="open"
    title="Cerrar campaña"
    :subtitle="campania ? `${campania.id} · ${campania.nombre}` : ''"
    icon="lock"
    size="lg"
    persistent
  >
    <div v-if="campania" class="us-stack">
      <ResultSummary title="Resultados de la conciliación" :rows="rows" />

      <section v-if="pendientes.length > 0">
        <h3 class="list-section-title">Observaciones pendientes ({{ pendientes.length }})</h3>
        <p class="u-hint">Estos resultados quedarán registrados como observaciones sin regularizar.</p>
        <ul class="pendientes">
          <li v-for="item in pendientes.slice(0, 8)" :key="item.id" class="pendientes__item">
            <StatusChip domain="conciliacion" :value="item.resultado" />
            <span class="u-wrap">{{ codigoRegistro(item) }} · {{ item.descripcion }}</span>
          </li>
        </ul>
        <p v-if="pendientes.length > 8" class="u-hint">Y {{ pendientes.length - 8 }} más.</p>
      </section>

      <AppNotice v-if="campania.tipo === 'inicial'" tone="info">
        Al cerrar este levantamiento inicial, sus CAR quedarán con el levantamiento "Completado".
      </AppNotice>

      <q-checkbox v-model="acknowledged" label="Confirmo el cierre de la campaña; los resultados ya no podrán regularizarse." />
    </div>

    <template #actions>
      <AppButton variant="outline" label="Cancelar" :disable="loading" @click="open = false" />
      <AppButton icon="lock" label="Cerrar campaña" :loading="loading" :disable="!acknowledged" @click="save" />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
// Validación y cierre de campaña (RN-K3): totales, observaciones pendientes y confirmación explícita
import { computed, ref, watch } from 'vue';
import AppDialog from 'src/components/AppDialog.vue';
import AppButton from 'src/components/AppButton.vue';
import AppNotice from 'src/components/AppNotice.vue';
import ResultSummary from 'src/components/ResultSummary.vue';
import StatusChip from 'src/components/StatusChip.vue';
import { useAsyncTask } from 'src/composables/useAsyncTask';
import { cerrarCampania } from 'src/modules/conciliacion/services/conciliacion.service';
import { codigoRegistro } from 'src/modules/conciliacion/utils/descripcion-item';
import type { Campania } from 'src/modules/campanias/types';
import type { ItemConciliacion } from 'src/modules/conciliacion/types';
import type { ResultRow } from 'src/components/types';

const props = defineProps<{ campania: Campania | null; items: ItemConciliacion[]; rows: ResultRow[] }>();
const emit = defineEmits<{ saved: [campania: Campania] }>();
const open = defineModel<boolean>({ required: true });

const { loading, run } = useAsyncTask();
const acknowledged = ref(false);

const pendientes = computed(() => props.items.filter((item) => item.estadoRegularizacion === 'pendiente'));

watch(open, (isOpen) => {
  if (isOpen) acknowledged.value = false;
});

async function save(): Promise<void> {
  const campania = props.campania;
  if (!campania || !acknowledged.value) return;
  const result = await run(() => cerrarCampania(campania.id), `Se cerró la campaña ${campania.id}.`);
  if (result.ok) {
    emit('saved', result.value);
    open.value = false;
  }
}
</script>

<style scoped lang="scss">
.list-section-title {
  margin: 0 0 var(--space-4);
  color: var(--inabif-red-dark);
  font-size: 0.88rem;
  line-height: 1.4;
  font-weight: 700;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.pendientes {
  list-style: none;
  margin: var(--space-8) 0 0;
  padding: 0;
  display: grid;
  gap: var(--space-6);
}

.pendientes__item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-8);
  padding: var(--space-8) var(--space-12);
  border-radius: var(--radius-dialog);
  background: var(--surface);
  border: 1px solid var(--border-soft);
}
</style>
