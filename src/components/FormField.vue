<template>
  <div class="us-field" :class="{ 'us-field--inline': inline }">
    <label class="us-field__label" :for="forId">
      {{ label }}<span v-if="required" class="us-field__required" aria-hidden="true">*</span>
    </label>
    <div class="us-field__control">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
// Etiqueta de campo sobre el control (o a la izquierda al 40% en fichas ≥600px).
// El control (QInput, QSelect…) recibe el id con su prop `for` y aria-required cuando aplica.
withDefaults(defineProps<{ label: string; forId: string; required?: boolean | undefined; inline?: boolean | undefined }>(), {
  required: false,
  inline: false,
});
</script>

<style scoped lang="scss">
.us-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.us-field__label {
  color: var(--ink-label);
  font-size: 0.95rem;
  line-height: 1.5;
  font-weight: 500;
}

.us-field__required {
  margin-left: 4px;
  color: var(--inabif-red-dark);
  font-weight: 700;
}

.us-field__control {
  min-width: 0;
}

@media (min-width: 600px) {
  .us-field--inline {
    flex-direction: row;
    align-items: flex-start;
    gap: var(--space-16);

    .us-field__label {
      flex: 0 0 40%;
      padding-top: 8px;
    }

    .us-field__control {
      flex: 1 1 auto;
    }
  }
}
</style>
