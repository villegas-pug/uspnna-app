<template>
  <PageContainer title="Verificación física">
    <div class="us-stack us-stack--lg">
      <AppNotice tone="info">
        Seleccione una campaña en curso para registrar la verificación de bienes por ambiente y el conteo de suministros por
        almacén.
      </AppNotice>

      <ul v-if="enCurso.length > 0" class="campania-list">
        <li v-for="campania in enCurso" :key="campania.id" class="campania-card">
          <div class="campania-card__head">
            <div>
              <span class="u-num u-hint">{{ campania.id }}</span>
              <h2 class="campania-card__title">{{ campania.nombre }}</h2>
            </div>
            <StatusChip domain="campania" :value="campania.estado" />
          </div>
          <p class="u-hint campania-card__meta">
            {{ formatDate(campania.fechaInicio) }} – {{ formatDate(campania.fechaFin) }} · {{ campania.responsable }}
          </p>
          <ul class="car-list">
            <li v-for="carId in campania.establecimientoIds" :key="carId" class="car-list__row">
              <span class="car-list__name">{{ nombreEstablecimiento(carId) }}</span>
              <span class="u-hint u-num">{{ avanceCar(campania, carId) }}</span>
            </li>
          </ul>
          <q-linear-progress
            class="us-progress q-mt-sm"
            :value="avanceCampania(campania).porcentaje / 100"
            size="10px"
            color="accent"
            track-color="grey-3"
            :aria-label="`Avance de ${campania.id}: ${Math.round(avanceCampania(campania).porcentaje)} %`"
          />
          <div class="campania-card__actions">
            <AppButton icon="fact_check" label="Continuar verificación" :to="`/campanias/${campania.id}`" />
          </div>
        </li>
      </ul>
      <EmptyState
        v-else
        icon="event_busy"
        title="No hay campañas en curso"
        text="Inicie una campaña planificada desde Campañas de inventario para registrar la verificación física."
      >
        <AppButton label="Ir a campañas" to="/campanias" />
      </EmptyState>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
// Punto de entrada del equipo de campo: campañas en curso y su avance por CAR
import { computed } from 'vue';
import PageContainer from 'src/components/PageContainer.vue';
import AppButton from 'src/components/AppButton.vue';
import AppNotice from 'src/components/AppNotice.vue';
import EmptyState from 'src/components/EmptyState.vue';
import StatusChip from 'src/components/StatusChip.vue';
import { formatDate } from 'src/core/utils/format';
import { nombreEstablecimiento } from 'src/modules/establecimientos/services/establecimientos.service';
import { avanceCampania, avanceUnidades, listarCampanias } from 'src/modules/campanias/services/campanias.service';
import type { Campania } from 'src/modules/campanias/types';

const enCurso = computed(() => listarCampanias().filter((c) => c.estado === 'en_curso'));

function avanceCar(campania: Campania, carId: string): string {
  const unidades = avanceUnidades(campania, carId);
  const verificadas = unidades.filter((u) => u.estado === 'verificada').length;
  return `${verificadas} de ${unidades.length} unidades verificadas`;
}
</script>

<style scoped lang="scss">
.campania-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr));
  gap: var(--space-16);
}

.campania-card {
  padding: var(--space-16) var(--space-18);
  border: 1px solid var(--border-card);
  border-left: 4px solid var(--inabif-red-dark);
  border-radius: var(--radius-box);
  background: var(--surface);
}

.campania-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-8);
}

.campania-card__title {
  margin: 2px 0 0;
  font-size: 1rem;
  line-height: 1.35;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.campania-card__meta {
  margin: var(--space-8) 0;
}

.car-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-4);
}

.car-list__row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-8);
}

.car-list__name {
  font-weight: 600;
}

.campania-card__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-12);
}
</style>
