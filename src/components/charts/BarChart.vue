<template>
  <ul class="bar-chart" role="list" :aria-label="label">
    <li v-for="datum in data" :key="datum.key" class="bar-chart__row">
      <span class="bar-chart__label">
        <StatusChip v-if="datum.status" :domain="datum.status.domain" :value="datum.status.value" />
        <component :is="datum.to ? RouterLink : 'span'" v-else v-bind="datum.to ? { to: datum.to } : {}" class="bar-chart__text">
          {{ datum.label }}
        </component>
      </span>
      <span class="bar-chart__track" aria-hidden="true">
        <span class="bar-chart__bar" :style="{ width: `${percentOf(datum.value)}%` }" />
        <q-tooltip>{{ datum.label }}: {{ valueText(datum) }}</q-tooltip>
      </span>
      <span class="bar-chart__value u-num">{{ valueText(datum) }}</span>
    </li>
  </ul>
</template>

<script setup lang="ts">
// Barras horizontales de una sola serie: un solo tono (la identidad la dan el texto o el StatusChip,
// nunca el color), valores rotulados directamente y responsivas por construcción.
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import StatusChip from 'src/components/StatusChip.vue';
import { formatNumber, formatPercent } from 'src/core/utils/format';
import type { BarDatum } from 'src/components/types';

const props = withDefaults(
  defineProps<{
    data: BarDatum[];
    /** Nombre accesible de la lista de barras. */
    label: string;
    /** Máximo de la escala; por defecto, el mayor valor. */
    max?: number | undefined;
    /** Muestra el porcentaje sobre el total junto al valor. */
    showShare?: boolean | undefined;
    unit?: string | undefined;
  }>(),
  { showShare: false },
);

const scaleMax = computed(() => props.max ?? Math.max(1, ...props.data.map((d) => d.value)));
const total = computed(() => props.data.reduce((sum, d) => sum + d.value, 0));

function percentOf(value: number): number {
  return Math.max(0, Math.min(100, (value / scaleMax.value) * 100));
}

function valueText(datum: BarDatum): string {
  const base = props.unit ? `${formatNumber(datum.value)} ${props.unit}` : formatNumber(datum.value);
  if (!props.showShare || total.value === 0) return base;
  return `${base} (${formatPercent((datum.value / total.value) * 100)})`;
}
</script>

<style scoped lang="scss">
.bar-chart {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-10);
}

.bar-chart__row {
  display: grid;
  grid-template-columns: minmax(110px, 34%) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-12);
  min-width: 0;
}

.bar-chart__label {
  min-width: 0;
  font-size: 13px;
  line-height: 1.35;
}

.bar-chart__text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink);
  text-decoration: none;
}

a.bar-chart__text:hover {
  text-decoration: underline;
  color: var(--inabif-blue-bar);
}

.bar-chart__track {
  position: relative;
  height: 14px;
  border-radius: 4px;
  background: var(--toolbar-bg);
  overflow: hidden;
}

.bar-chart__bar {
  display: block;
  height: 100%;
  min-width: 2px;
  border-radius: 0 4px 4px 0;
  background: var(--inabif-blue-bar);
  transition: width 0.3s ease;
}

.bar-chart__value {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink-label);
  white-space: nowrap;
}

@media (max-width: 599.98px) {
  .bar-chart__row {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'label value'
      'track track';
    row-gap: var(--space-4);
  }

  .bar-chart__label {
    grid-area: label;
  }

  .bar-chart__value {
    grid-area: value;
  }

  .bar-chart__track {
    grid-area: track;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bar-chart__bar {
    transition: none;
  }
}
</style>
