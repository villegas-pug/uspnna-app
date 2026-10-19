<template>
  <component :is="tag" class="us-section-head">
    <q-icon v-if="icon" :name="icon" size="18px" aria-hidden="true" />
    <span>{{ title }}</span>
  </component>
</template>

<script setup lang="ts">
// Cabecera de sección estática en fichas y formularios largos (visible en todos los tamaños)
withDefaults(defineProps<{ title: string; icon?: string | undefined; tag?: 'h2' | 'h3' | undefined }>(), { tag: 'h2' });
</script>

<style scoped lang="scss">
.us-section-head {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  margin: 0 0 var(--space-20);
  padding: 14px 16px;
  border-left: 4px solid var(--inabif-red-dark);
  border-radius: var(--radius-dialog);
  background: var(--surface-section);
  color: var(--ink-section);
  font-size: 0.8rem;
  line-height: 1.4;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
</style>
