<template>
  <q-btn
    class="us-btn"
    :class="[`us-btn--${variant}`, { 'us-btn--block': block }]"
    v-bind="buttonProps"
  />
</template>

<script setup lang="ts">
// Botón del sistema de diseño (QBtn): etiqueta en tipo oración, el estilo la pasa a mayúsculas
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import type { ButtonVariant } from 'src/components/types';

const props = withDefaults(
  defineProps<{
    label?: string | undefined;
    icon?: string | undefined;
    variant?: ButtonVariant | undefined;
    loading?: boolean | undefined;
    disable?: boolean | undefined;
    to?: RouteLocationRaw | undefined;
    type?: 'button' | 'submit' | 'reset' | undefined;
    /** Ancho completo en móvil (<600px), como piden los diálogos. */
    block?: boolean | undefined;
  }>(),
  { variant: 'primary', loading: false, disable: false, type: 'button', block: false },
);

const COLOR: Record<ButtonVariant, string> = {
  primary: 'primary',
  secondary: 'secondary',
  outline: 'secondary',
  flat: 'secondary',
  negative: 'negative',
};

// Solo se envían a QBtn las propiedades definidas (exactOptionalPropertyTypes)
const buttonProps = computed(() => {
  const result: Record<string, unknown> = {
    color: COLOR[props.variant],
    outline: props.variant === 'outline',
    flat: props.variant === 'flat',
    unelevated: props.variant !== 'outline' && props.variant !== 'flat',
    loading: props.loading,
    disable: props.disable,
    type: props.type,
  };
  if (props.label !== undefined) result.label = props.label;
  if (props.icon !== undefined) result.icon = props.icon;
  if (props.to !== undefined) result.to = props.to;
  return result;
});
</script>

<style scoped lang="scss">
@media (max-width: 599.98px) {
  .us-btn--block {
    width: 100%;
  }
}
</style>
