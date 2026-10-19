<template>
  <section class="us-context" :aria-label="ariaLabel">
    <div v-for="item in items" :key="item.label" class="us-context__item">
      <div class="us-context__label">{{ item.label }}</div>
      <div class="us-context__value">{{ item.value }}</div>
    </div>
  </section>
</template>

<script setup lang="ts">
// Resumen de contexto: qué CAR, ambiente o campaña se está trabajando
import type { ContextItem } from 'src/components/types';

withDefaults(defineProps<{ items: ContextItem[]; ariaLabel?: string | undefined }>(), { ariaLabel: 'Contexto' });
</script>

<style scoped lang="scss">
.us-context {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  gap: var(--space-12);
  padding: var(--space-12);
  border: 1px solid var(--border-context);
  border-radius: var(--radius-box);
  background: var(--surface-context);
}

.us-context__item {
  min-width: 0;
  min-height: 64px;
  padding: 10px 12px;
  border-left: 4px solid var(--inabif-red-dark);
  border-radius: var(--radius-dialog);
  background: var(--surface);
  box-shadow: var(--shadow-context);
}

.us-context__label {
  margin-bottom: 6px;
  color: var(--ink-caption);
  font-size: 0.75rem;
  line-height: 1.3;
  font-weight: 700;
  text-transform: uppercase;
}

.us-context__value {
  color: var(--ink-dialog);
  font-size: 0.95rem;
  line-height: 1.35;
  font-weight: 600;
  overflow-wrap: anywhere;
}
</style>
