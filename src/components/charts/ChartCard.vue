<template>
  <section class="chart-card" :aria-labelledby="titleId">
    <header class="chart-card__head">
      <div>
        <h2 :id="titleId" class="chart-card__title">{{ title }}</h2>
        <p v-if="subtitle" class="chart-card__subtitle">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </header>
    <div class="chart-card__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
// Contenedor de gráfico del inicio: título, subtítulo y cuerpo con borde (sin sombra)
import { useId } from 'vue';

defineProps<{ title: string; subtitle?: string | undefined }>();

const titleId = useId();
</script>

<style scoped lang="scss">
.chart-card {
  min-width: 0;
  padding: var(--space-16) var(--space-18);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-box);
  background: var(--surface);
}

.chart-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-12);
  margin-bottom: var(--space-16);
}

.chart-card__title {
  margin: 0;
  color: var(--inabif-blue);
  font-size: 0.95rem;
  line-height: 1.35;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.chart-card__subtitle {
  margin: 4px 0 0;
  font-size: 0.78rem;
  line-height: 1.4;
  color: var(--ink-muted);
}

.chart-card__body {
  min-width: 0;
}
</style>
