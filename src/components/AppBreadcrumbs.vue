<template>
  <nav class="us-crumbs" aria-label="Ruta de navegación">
    <ol class="us-crumbs__list">
      <li v-for="(item, index) in items" :key="`${index}-${item.label}`" class="us-crumbs__item">
        <q-icon v-if="index > 0" name="chevron_right" size="16px" class="us-crumbs__sep" aria-hidden="true" />
        <span v-if="index === items.length - 1" class="us-crumbs__current" aria-current="page">{{ item.label }}</span>
        <router-link v-else-if="item.to" :to="item.to" class="us-crumbs__link">{{ item.label }}</router-link>
        <span v-else class="us-crumbs__plain">{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
// Migas de pan (adición sobre SISEC): el último elemento es la página actual, sin enlace
import type { BreadcrumbItem } from 'src/components/types';

defineProps<{ items: BreadcrumbItem[] }>();
</script>

<style scoped lang="scss">
.us-crumbs {
  margin-bottom: var(--space-8);
}

.us-crumbs__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4);
  font-size: 13px;
  line-height: 1.4;
  color: var(--ink-muted);
}

.us-crumbs__item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-4);
  min-width: 0;
}

.us-crumbs__sep {
  color: var(--ink-muted);
}

.us-crumbs__link {
  color: var(--inabif-blue-bar);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.us-crumbs__current {
  color: var(--ink);
  font-weight: 700;
  overflow-wrap: anywhere;
}
</style>
