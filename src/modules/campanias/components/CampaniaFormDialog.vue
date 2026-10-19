<template>
  <AppDialog
    v-model="open"
    :title="campania ? 'Editar campaña' : 'Nueva campaña de inventario'"
    :subtitle="campania ? campania.id : 'La campaña se crea en estado Planificada'"
    icon="fact_check"
    size="md"
    persistent
  >
    <q-form ref="formRef" class="us-form-grid" @submit.prevent="save">
      <FormField label="Nombre de la campaña" :for-id="ids.nombre" required class="us-form-grid__full">
        <q-input
          v-model="form.nombre"
          :for="ids.nombre"
          outlined
          dense
          autofocus
          aria-required="true"
          placeholder="Ej.: Inventario anual 2026 – Lima"
          :rules="[rules.required('Ingrese el nombre de la campaña.'), rules.minLength(5, 'Use al menos 5 caracteres.')]"
        />
      </FormField>
      <FormField label="Tipo" :for-id="ids.tipo" required class="us-form-grid__full">
        <q-select v-model="form.tipo" :for="ids.tipo" :options="tipos" emit-value map-options outlined dense aria-required="true" />
      </FormField>
      <FormField label="Establecimientos (CAR)" :for-id="ids.cars" required class="us-form-grid__full">
        <q-select
          v-model="form.establecimientoIds"
          :for="ids.cars"
          :options="cars"
          multiple
          use-chips
          emit-value
          map-options
          outlined
          dense
          aria-required="true"
          hint="Un CAR solo puede estar en una campaña abierta a la vez."
          :rules="[rules.required('Seleccione al menos un CAR.')]"
        />
      </FormField>
      <FormField label="Fecha de inicio" :for-id="ids.inicio" required>
        <DateField v-model="form.fechaInicio" :for-id="ids.inicio" required />
      </FormField>
      <FormField label="Fecha de fin" :for-id="ids.fin" required>
        <DateField v-model="form.fechaFin" :for-id="ids.fin" required :min="form.fechaInicio" />
      </FormField>
      <FormField label="Equipo responsable" :for-id="ids.responsable" required class="us-form-grid__full">
        <q-input
          v-model="form.responsable"
          :for="ids.responsable"
          outlined
          dense
          aria-required="true"
          placeholder="Ej.: Equipo de inventario 01 – USPNNA"
          :rules="[rules.required('Indique el equipo responsable.')]"
        />
      </FormField>
      <FormField label="Descripción" :for-id="ids.descripcion" class="us-form-grid__full">
        <q-input v-model="form.descripcion" :for="ids.descripcion" type="textarea" autogrow outlined dense />
      </FormField>
    </q-form>

    <template #actions>
      <AppButton variant="outline" label="Cancelar" :disable="loading" @click="open = false" />
      <AppButton icon="save" label="Guardar campaña" :loading="loading" @click="save" />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
// Diálogo de planificación de campañas de inventario
import { computed, reactive, ref, useId, watch } from 'vue';
import type { QForm } from 'quasar';
import AppDialog from 'src/components/AppDialog.vue';
import AppButton from 'src/components/AppButton.vue';
import FormField from 'src/components/FormField.vue';
import DateField from 'src/components/DateField.vue';
import { useAsyncTask } from 'src/composables/useAsyncTask';
import { optionsFrom, rules } from 'src/core/utils/options';
import { fieldIds } from 'src/core/utils/object';
import { todayIso } from 'src/core/utils/format';
import { opcionesEstablecimientos } from 'src/modules/establecimientos/services/establecimientos.service';
import { actualizarCampania, crearCampania } from 'src/modules/campanias/services/campanias.service';
import { TIPO_CAMPANIA_LABEL, type Campania, type CampaniaInput } from 'src/modules/campanias/types';

const props = defineProps<{ campania: Campania | null }>();
const emit = defineEmits<{ saved: [campania: Campania] }>();
const open = defineModel<boolean>({ required: true });

const ids = fieldIds(useId(), ['nombre', 'tipo', 'cars', 'inicio', 'fin', 'responsable', 'descripcion'] as const);
const tipos = optionsFrom(TIPO_CAMPANIA_LABEL);
const cars = computed(() => opcionesEstablecimientos());
const formRef = ref<QForm | null>(null);
const { loading, run } = useAsyncTask();

function emptyForm(): CampaniaInput {
  return {
    nombre: '',
    tipo: 'anual',
    descripcion: '',
    establecimientoIds: [],
    fechaInicio: todayIso(),
    fechaFin: todayIso(),
    responsable: 'Equipo de inventario 01 – USPNNA',
  };
}

const form = reactive<CampaniaInput>(emptyForm());

watch(open, (isOpen) => {
  if (!isOpen) return;
  const c = props.campania;
  Object.assign(
    form,
    c
      ? {
          nombre: c.nombre,
          tipo: c.tipo,
          descripcion: c.descripcion,
          establecimientoIds: [...c.establecimientoIds],
          fechaInicio: c.fechaInicio,
          fechaFin: c.fechaFin,
          responsable: c.responsable,
        }
      : emptyForm(),
  );
});

async function save(): Promise<void> {
  if (!(await formRef.value?.validate())) return;
  const actual = props.campania;
  const datos: CampaniaInput = { ...form, establecimientoIds: [...form.establecimientoIds] };
  const result = await run(
    () => (actual ? actualizarCampania(actual.id, datos) : crearCampania(datos)),
    (c) => (actual ? `Se actualizó la campaña ${c.id}.` : `Se creó la campaña ${c.id} en estado Planificada.`),
  );
  if (result.ok) {
    emit('saved', result.value);
    open.value = false;
  }
}
</script>
