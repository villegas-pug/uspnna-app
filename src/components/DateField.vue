<template>
  <q-input
    :model-value="text"
    :for="forId"
    outlined
    dense
    mask="##/##/####"
    placeholder="dd/mm/aaaa"
    inputmode="numeric"
    :rules="rules"
    lazy-rules
    :disable="disable"
    :readonly="readonly"
    :hint="hint"
    :label="label"
    :aria-required="required ? 'true' : undefined"
    @update:model-value="onInput"
  >
    <template #append>
      <q-btn flat round dense icon="event" aria-label="Abrir calendario" :disable="disable || readonly">
        <q-popup-proxy cover transition-show="scale" transition-hide="scale">
          <q-date
            :model-value="model"
            mask="YYYY-MM-DD"
            :options="isAllowed"
            today-btn
            @update:model-value="onPick"
          >
            <div class="row justify-end">
              <q-btn v-close-popup flat color="secondary" label="Cerrar" />
            </div>
          </q-date>
        </q-popup-proxy>
      </q-btn>
    </template>
  </q-input>
</template>

<script setup lang="ts">
// Campo de fecha dd/mm/aaaa con calendario (QDate en QPopupProxy); el modelo es YYYY-MM-DD o null
import { computed, ref, watch } from 'vue';
import { formatDate, parseDisplayDate } from 'src/core/utils/format';

const props = withDefaults(
  defineProps<{
    forId: string;
    required?: boolean | undefined;
    disable?: boolean | undefined;
    readonly?: boolean | undefined;
    hint?: string | undefined;
    /** Etiqueta flotante (barras de filtros); en formularios se usa FormField. */
    label?: string | undefined;
    /** Fecha mínima permitida (YYYY-MM-DD). */
    min?: string | null | undefined;
    /** Fecha máxima permitida (YYYY-MM-DD). */
    max?: string | null | undefined;
  }>(),
  { required: false, disable: false, readonly: false, min: null, max: null },
);

const model = defineModel<string | null>({ default: null });
const text = ref(formatDate(model.value));

watch(model, (value) => {
  if (parseDisplayDate(text.value) !== value) text.value = formatDate(value);
});

function onInput(value: string | number | null): void {
  text.value = value === null ? '' : String(value);
  if (!text.value) {
    model.value = null;
    return;
  }
  const iso = parseDisplayDate(text.value);
  if (iso) model.value = iso;
}

function onPick(value: string | null): void {
  model.value = value;
  text.value = formatDate(value);
}

function isAllowed(date: string): boolean {
  // QDate entrega YYYY/MM/DD en las opciones
  const iso = date.replace(/\//g, '-');
  return (!props.min || iso >= props.min) && (!props.max || iso <= props.max);
}

const rules = computed(() => [
  (value: string | null) => !props.required || Boolean(value) || 'Ingrese la fecha.',
  (value: string | null) => !value || parseDisplayDate(value) !== null || 'Ingrese una fecha válida (dd/mm/aaaa).',
  (value: string | null) => {
    const iso = value ? parseDisplayDate(value) : null;
    if (!iso) return true;
    if (props.min && iso < props.min) return `La fecha debe ser igual o posterior al ${formatDate(props.min)}.`;
    if (props.max && iso > props.max) return `La fecha debe ser igual o anterior al ${formatDate(props.max)}.`;
    return true;
  },
]);
</script>
