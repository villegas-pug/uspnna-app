<template>
  <q-dialog
    v-model="open"
    :persistent="persistent"
    :maximized="maximized"
    :aria-labelledby="titleId"
    @hide="emit('hide')"
  >
    <q-card class="us-dialog" :class="[`us-dialog--${size}`, { 'us-dialog--maximized': maximized }]">
      <header v-if="size === 'sm'" :id="titleId" class="us-dialog__title">{{ title }}</header>
      <header v-else class="us-dialog__header">
        <div class="us-dialog__heading">
          <q-icon v-if="icon" :name="icon" size="24px" class="us-dialog__icon" aria-hidden="true" />
          <div class="us-dialog__heading-text">
            <h2 :id="titleId" class="us-dialog__header-title">{{ title }}</h2>
            <p v-if="subtitle" class="us-dialog__subtitle">{{ subtitle }}</p>
          </div>
        </div>
        <q-btn v-if="!persistent" v-close-popup flat round dense icon="close" aria-label="Cerrar diálogo" />
      </header>
      <div class="us-dialog__body">
        <slot />
      </div>
      <footer v-if="$slots.actions" class="us-dialog__actions">
        <slot name="actions" />
      </footer>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
// Diálogo en las cuatro medidas del sistema: sm confirmación, md formulario corto, lg validación/cierre,
// xl ficha completa (pantalla completa <600px). El cuerpo es lo único que hace scroll.
import { computed, useId } from 'vue';
import { useQuasar } from 'quasar';

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string | undefined;
    icon?: string | undefined;
    size?: 'sm' | 'md' | 'lg' | 'xl' | undefined;
    persistent?: boolean | undefined;
  }>(),
  { size: 'md', persistent: false },
);

const emit = defineEmits<{ hide: [] }>();

const open = defineModel<boolean>({ required: true });

const $q = useQuasar();
const titleId = useId();
const maximized = computed(() => props.size === 'xl' && $q.screen.lt.sm);
</script>
