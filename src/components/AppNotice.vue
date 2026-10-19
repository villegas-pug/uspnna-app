<template>
  <div class="us-notice" :class="`us-notice--${tone}`" :role="blocking ? 'alert' : 'status'">
    <q-icon :name="icon ?? (tone === 'info' ? 'info' : 'warning')" size="20px" aria-hidden="true" />
    <div class="us-notice__content">
      <slot>{{ text }}</slot>
    </div>
  </div>
</template>

<script setup lang="ts">
// Aviso en línea: advertencia (alertas de stock, campaña cerrada) o informativo (instrucciones)
withDefaults(
  defineProps<{
    tone?: 'warning' | 'info' | undefined;
    text?: string | undefined;
    icon?: string | undefined;
    /** role="alert" cuando el aviso bloquea la acción. */
    blocking?: boolean | undefined;
  }>(),
  { tone: 'warning', blocking: false },
);
</script>

<style scoped lang="scss">
.us-notice {
  display: flex;
  gap: var(--space-8);
  align-items: flex-start;
}

.us-notice__content {
  min-width: 0;
  overflow-wrap: anywhere;
}

.us-notice--warning {
  padding: 10px 14px;
  border: 1px solid var(--notice-border);
  border-radius: var(--radius-menu);
  background: var(--notice-bg);
  color: var(--notice-ink);
  font-size: 0.84rem;
  line-height: 1.4;
}

.us-notice--info {
  padding: var(--space-16);
  border-left: 4px solid var(--info-bar);
  border-radius: var(--radius-dialog);
  background: var(--info-bg);
  color: var(--info-ink);
  font-size: 1rem;
  line-height: 1.45;
  font-weight: 600;
}
</style>
