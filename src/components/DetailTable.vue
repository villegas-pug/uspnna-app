<template>
  <table class="us-detail" :class="{ 'us-detail--stacked': stacked }">
    <caption v-if="caption" class="sr-only">{{ caption }}</caption>
    <tbody>
      <tr v-for="row in rows" :key="row.key">
        <th scope="row">
          <q-icon v-if="row.icon" :name="row.icon" size="18px" class="us-detail__icon" aria-hidden="true" />
          {{ row.label }}
        </th>
        <td>
          <slot :name="row.key" :row="row">
            <template v-if="row.value !== undefined && row.value !== null && row.value !== ''">{{ row.value }}</template>
            <span v-else class="u-muted">No registrado</span>
          </slot>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
// Tabla clave–valor de las vistas de detalle; por debajo de 600px se apila (etiqueta arriba, valor debajo)
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import type { DetailRow } from 'src/components/types';

defineProps<{ rows: DetailRow[]; caption?: string | undefined }>();

defineSlots<{ [key: string]: (scope: { row: DetailRow }) => unknown }>();

const $q = useQuasar();
const stacked = computed(() => $q.screen.lt.sm);
</script>

<style scoped lang="scss">
.us-detail {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
  line-height: 1.5;
  border: 1px solid var(--border-readonly);

  th,
  td {
    padding: 12px 16px;
    vertical-align: top;
    border-top: 1px solid var(--border-soft);
    text-align: left;
    overflow-wrap: anywhere;
  }

  th {
    width: 35%;
    min-width: 200px;
    background: var(--inabif-blue-tint);
    color: var(--ink-label);
    font-weight: 600;
  }

  tr:nth-child(odd) td {
    background: var(--row-zebra);
  }

  tr:hover td {
    background: var(--toolbar-bg);
  }
}

.us-detail__icon {
  color: #374151;
  margin-right: var(--space-8);
  vertical-align: -3px;
}

.us-detail--stacked {
  &,
  tbody,
  tr,
  th,
  td {
    display: block;
    width: 100%;
  }

  tr {
    padding: var(--space-8) 0;
    border-bottom: 1px solid #e6ecf2;
  }

  th {
    min-width: 0;
    padding: 2px 10px 4px;
    border: 0;
    background: transparent;
    color: #34495e;
    font-weight: 700;
  }

  td {
    padding: 2px 10px;
    border: 0;
  }

  tr:nth-child(odd) td,
  tr:hover td {
    background: transparent;
  }
}
</style>
