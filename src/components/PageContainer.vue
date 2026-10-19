<template>
  <q-page class="us-page q-pa-md" :class="{ 'us-page--fab': reserveFab && $q.screen.lt.md }">
    <div class="us-page__inner">
      <AppBreadcrumbs v-if="breadcrumbs.length > 0" :items="breadcrumbs" />
      <slot name="title">
        <PageTitle :text="title" />
      </slot>
      <div v-if="$slots.actions" class="us-page__actions">
        <slot name="actions" />
      </div>
      <slot />
    </div>
  </q-page>
</template>

<script setup lang="ts">
// Estructura de página de módulo: migas de pan → título → acciones a la derecha → contenido (máx. 1600px)
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppBreadcrumbs from 'src/components/AppBreadcrumbs.vue';
import PageTitle from 'src/components/PageTitle.vue';
import type { BreadcrumbItem } from 'src/components/types';

const props = withDefaults(
  defineProps<{
    title: string;
    /** Texto de la miga actual (p. ej. el ID del registro); por defecto, el título. */
    crumb?: string | undefined;
    hideBreadcrumbs?: boolean | undefined;
    /** Reserva espacio para FloatingActions por debajo de 1024px. */
    reserveFab?: boolean | undefined;
  }>(),
  { hideBreadcrumbs: false, reserveFab: false },
);

const route = useRoute();

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  if (props.hideBreadcrumbs) return [];
  return [...(route.meta.breadcrumb ?? []), { label: props.crumb ?? props.title }];
});
</script>

<style scoped lang="scss">
.us-page__inner {
  max-width: 1600px;
  margin: 0 auto;
  min-width: 0;
}

.us-page__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-8);
  margin-bottom: var(--space-12);
}

.us-page--fab {
  padding-bottom: 164px !important;
}

@media (max-width: 599.98px) {
  .us-page__actions > :deep(.q-btn) {
    flex: 1 1 auto;
  }
}
</style>
