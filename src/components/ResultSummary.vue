<template>
  <section class="us-totals" :aria-labelledby="titleId">
    <h2 :id="titleId" class="us-totals__head">{{ title }}</h2>
    <ul class="us-totals__list">
      <li v-for="row in rows" :key="row.key" class="us-totals__row" :class="`us-totals__row--${row.tone}`">
        <span class="us-totals__label">
          <q-icon :name="row.icon" size="20px" aria-hidden="true" />
          {{ row.label }}
        </span>
        <span class="us-totals__value u-num">{{ formatNumber(row.value) }}</span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
// Bloque de totales de verificación o conciliación (filas de resultado de SISEC); sin movimiento al pasar el cursor
import { useId } from 'vue';
import { formatNumber } from 'src/core/utils/format';
import type { ResultRow } from 'src/components/types';

defineProps<{ title: string; rows: ResultRow[] }>();

const titleId = useId();
</script>

<style scoped lang="scss">
.us-totals {
  padding: var(--space-20);
  border: 1px solid var(--border-readonly);
  border-radius: var(--radius-box);
  background: var(--row-zebra);
}

.us-totals__head {
  margin: -20px -20px 20px;
  padding: 14px 20px;
  border-radius: 6px 6px 0 0;
  border-bottom: 2px solid var(--inabif-red-dark);
  background: linear-gradient(135deg, var(--inabif-blue-tint), #c8d6e5);
  color: var(--ink-label);
  font-size: 1rem;
  line-height: 1.4;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.us-totals__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.us-totals__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-12);
  padding: 12px 16px;
  border-radius: var(--radius-dialog);
  color: var(--ink-label);
}

.us-totals__label {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  min-width: 0;
}

.us-totals__value {
  font-size: 1.2rem;
  font-weight: 700;
}

.us-totals__row--ok {
  background: var(--result-ok-bg);
  border-left: 4px solid var(--result-ok-bar);
}

.us-totals__row--bad {
  background: var(--result-bad-bg);
  border-left: 4px solid var(--result-bad-bar);
}

.us-totals__row--obs {
  background: var(--result-obs-bg);
  border-left: 4px solid var(--result-obs-bar);
}

.us-totals__row--na {
  background: var(--result-na-bg);
  border-left: 4px solid var(--result-na-bar);
}
</style>
