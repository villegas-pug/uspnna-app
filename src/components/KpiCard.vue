<template>
  <component :is="to ? RouterLink : 'div'" v-bind="to ? { to } : {}" class="us-kpi" :class="{ 'us-kpi--link': to }">
    <span class="us-kpi__icon" :class="`us-kpi__icon--${tone}`" aria-hidden="true">
      <q-icon :name="icon" size="34px" />
    </span>
    <span class="us-kpi__body">
      <span class="us-kpi__value u-num">{{ typeof value === 'number' ? formatNumber(value) : value }}</span>
      <span class="us-kpi__label">{{ label }}</span>
      <span v-if="hint" class="us-kpi__hint">{{ hint }}</span>
    </span>
  </component>
</template>

<script setup lang="ts">
// Tarjeta de indicador del inicio: icono en círculo de color, cifra, etiqueta y pista
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import { formatNumber } from 'src/core/utils/format';

defineProps<{
  icon: string;
  tone: 'blue' | 'red' | 'green' | 'purple';
  value: number | string;
  label: string;
  hint?: string | undefined;
  to?: RouteLocationRaw | undefined;
}>();
</script>

<style scoped lang="scss">
.us-kpi {
  display: flex;
  align-items: center;
  gap: var(--space-16);
  min-width: 0;
  padding: var(--space-18) var(--space-16);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-card);
  background: linear-gradient(180deg, var(--surface), var(--surface-context));
  color: var(--ink);
  text-decoration: none;
}

.us-kpi--link:hover {
  border-color: var(--border-control);
}

.us-kpi__icon {
  width: var(--kpi-icon);
  height: var(--kpi-icon);
  flex: 0 0 auto;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.us-kpi__icon--blue {
  background: var(--kpi-blue-tint);
  color: var(--kpi-blue);
}

.us-kpi__icon--red {
  background: var(--kpi-red-tint);
  color: var(--inabif-red);
}

.us-kpi__icon--green {
  background: var(--kpi-green-tint);
  color: var(--status-success-ink);
}

.us-kpi__icon--purple {
  background: var(--kpi-purple-tint);
  color: var(--kpi-purple);
}

.us-kpi__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.us-kpi__value {
  font-size: 1.9rem;
  line-height: 1.1;
  font-weight: 700;
}

.us-kpi__label {
  margin-top: var(--space-8);
  font-size: 0.95rem;
  line-height: 1.45;
}

.us-kpi__hint {
  margin-top: var(--space-6);
  font-size: 0.78rem;
  line-height: 1.4;
  color: var(--ink-muted);
}

@media (max-width: 1024px) {
  .us-kpi__value {
    font-size: 1.65rem;
  }
}

@media (max-width: 768px) {
  .us-kpi__value {
    font-size: 1.6rem;
  }
}
</style>
