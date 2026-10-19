<template>
  <section class="us-filter-bar" aria-label="Filtros">
    <div class="us-filter-bar__fields">
      <slot />
    </div>
    <q-expansion-item
      v-if="$slots.more"
      v-model="moreOpen"
      dense
      class="us-filter-bar__more"
      icon="tune"
      :label="moreLabel"
      header-class="us-filter-bar__more-header"
    >
      <div class="us-filter-bar__fields q-pt-sm">
        <slot name="more" />
      </div>
    </q-expansion-item>
    <div class="us-filter-bar__meta">
      <span class="u-hint" role="status" aria-live="polite">{{ resultLabel }}</span>
      <AppButton v-if="active" variant="flat" icon="filter_alt_off" label="Limpiar filtros" @click="emit('clear')" />
    </div>
  </section>
</template>

<script setup lang="ts">
// Barra de filtros sobre listados y reportes: se reorganiza según el ancho (búsqueda 2:1 frente a filtros)
import { computed, ref } from 'vue';
import AppButton from 'src/components/AppButton.vue';
import { formatNumber } from 'src/core/utils/format';

const props = withDefaults(
  defineProps<{
    /** Cantidad de resultados con los filtros actuales. */
    count?: number | undefined;
    active?: boolean | undefined;
    moreActive?: boolean | undefined;
  }>(),
  { active: false, moreActive: false },
);

const emit = defineEmits<{ clear: [] }>();

const moreOpen = ref(props.moreActive);

const moreLabel = computed(() => (props.moreActive ? 'Más filtros (con filtros aplicados)' : 'Más filtros'));

const resultLabel = computed(() => {
  if (props.count === undefined) return '';
  return props.count === 1 ? '1 resultado' : `${formatNumber(props.count)} resultados`;
});
</script>

<style scoped lang="scss">
.us-filter-bar {
  display: grid;
  gap: var(--space-8);
  margin-bottom: var(--space-12);
}

.us-filter-bar__fields {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-12);
  align-items: flex-start;
}

/* Cada filtro del slot por defecto ocupa al menos 180px y se reparte el ancho disponible */
:slotted(*) {
  flex: 1 1 180px;
  min-width: 0;
}

.us-filter-bar__more {
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-field);
}

.us-filter-bar__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-8);
  min-height: 32px;
}

@media (max-width: 599.98px) {
  :slotted(*) {
    flex-basis: 100%;
  }
}
</style>
