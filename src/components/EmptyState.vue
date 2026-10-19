<template>
  <div class="us-empty" role="status">
    <q-icon :name="icon" size="40px" class="us-empty__icon" aria-hidden="true" />
    <h3 class="us-empty__title">{{ title }}</h3>
    <p v-if="text" class="us-empty__text">{{ text }}</p>
    <div v-if="$slots.default" class="us-empty__actions">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
// Estado vacío: sin filtros ofrece crear; con filtros ofrece limpiarlos
withDefaults(defineProps<{ icon?: string | undefined; title: string; text?: string | undefined }>(), { icon: 'inventory' });
</script>

<style scoped lang="scss">
.us-empty {
  text-align: center;
  padding: var(--space-24) var(--space-16);
  color: var(--ink-muted);
  border: 1px dashed var(--border-panel);
  border-radius: var(--radius-box);
  background: var(--surface);
}

.us-empty__icon {
  color: var(--inabif-blue-bar);
}

.us-empty__title {
  margin: var(--space-8) 0 var(--space-4);
  color: var(--ink);
  font-size: 1.05rem;
  line-height: 1.4;
  font-weight: 700;
}

.us-empty__text {
  margin: 0 auto var(--space-12);
  max-width: 52ch;
}

.us-empty__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-8);
}
</style>
