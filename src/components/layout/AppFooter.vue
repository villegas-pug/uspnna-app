<template>
  <q-footer class="us-footer">
    <p class="us-footer__text">
      © {{ year }} INABIF | Todos los derechos reservados
      <span class="us-footer__version">(Prototipo v{{ version }})</span>
    </p>
  </q-footer>
</template>

<script setup lang="ts">
// Pie institucional fijo con safe-area; puede envolver en dos líneas, nunca se corta
withDefaults(defineProps<{ version?: string | undefined }>(), { version: '0.1.0' });

const year = new Date().getFullYear();
</script>

<style scoped lang="scss">
.us-footer__text {
  margin: 0;
  padding: var(--space-8) var(--space-16) calc(var(--space-8) + env(safe-area-inset-bottom));
  text-align: center;
  font-size: 0.85rem;
  line-height: 1.5;
}

.us-footer__version {
  margin-left: 6px;
  color: var(--ink-muted);
}

@media (max-width: 599.98px) {
  .us-footer__text {
    padding: 6px 12px calc(6px + env(safe-area-inset-bottom));
    font-size: 0.76rem;
    line-height: 1.35;
  }
}
</style>
