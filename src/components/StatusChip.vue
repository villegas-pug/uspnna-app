<template>
  <span class="us-chip" :class="`us-chip--${descriptor.tone}`">
    <q-icon :name="descriptor.icon" size="16px" aria-hidden="true" />
    <span>{{ label ?? descriptor.label }}</span>
  </span>
</template>

<script setup lang="ts">
// Etiqueta de estado del dominio: siempre icono + texto + color (nunca solo color)
import { computed } from 'vue';
import { statusDescriptor, type StatusDomain } from 'src/composables/useStatusTone';

const props = defineProps<{
  domain: StatusDomain;
  value: string;
  /** Texto alternativo (p. ej. "Diferencia +3"); el tono e icono siguen al estado. */
  label?: string | undefined;
}>();

const descriptor = computed(() => statusDescriptor(props.domain, props.value));
</script>

<style scoped lang="scss">
.us-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 3px 10px 3px 6px;
  border-radius: var(--radius-pill);
  font-size: 0.75rem;
  line-height: 16px;
  font-weight: 700;
  letter-spacing: 0.2px;
  white-space: nowrap;
  vertical-align: middle;
}

.us-chip--success {
  background: var(--kpi-green-tint);
  color: var(--status-success-ink);
}

.us-chip--warning {
  background: var(--notice-bg);
  color: var(--status-warning-ink);
}

.us-chip--danger {
  background: var(--kpi-red-tint);
  color: var(--status-danger-ink);
}

.us-chip--info {
  background: var(--kpi-blue-tint);
  color: var(--status-info-ink);
}

.us-chip--extra {
  background: var(--kpi-purple-tint);
  color: var(--status-extra-ink);
}

.us-chip--neutral {
  background: var(--status-neutral-bg);
  color: var(--drawer-ink);
}
</style>
