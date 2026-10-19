<template>
  <AppDialog
    v-model="open"
    :title="establecimiento ? 'Editar establecimiento' : 'Nuevo establecimiento'"
    :subtitle="establecimiento ? establecimiento.id : 'El código se generará al guardar'"
    icon="home_work"
    size="md"
    persistent
  >
    <q-form ref="formRef" class="us-form-grid" @submit.prevent="save">
      <FormField label="Nombre del CAR" :for-id="ids.nombre" required class="us-form-grid__full">
        <q-input
          v-model="form.nombre"
          :for="ids.nombre"
          outlined
          dense
          autofocus
          aria-required="true"
          placeholder="Ej.: CAR Esperanza"
          :rules="[rules.required('Ingrese el nombre del CAR.'), rules.minLength(3, 'Use al menos 3 caracteres.')]"
        />
      </FormField>
      <FormField label="Población objetivo" :for-id="ids.poblacion" required class="us-form-grid__full">
        <q-input
          v-model="form.tipoPoblacion"
          :for="ids.poblacion"
          outlined
          dense
          aria-required="true"
          placeholder="Ej.: Niñas y adolescentes mujeres de 6 a 17 años"
          :rules="[rules.required('Indique la población objetivo.')]"
        />
      </FormField>
      <FormField label="Capacidad (plazas)" :for-id="ids.capacidad" required>
        <q-input
          v-model.number="form.capacidad"
          :for="ids.capacidad"
          type="number"
          min="1"
          outlined
          dense
          aria-required="true"
          :rules="[rules.required('Ingrese la capacidad.'), rules.positiveInteger('La capacidad debe ser un entero mayor que cero.')]"
        />
      </FormField>
      <FormField label="Departamento" :for-id="ids.departamento" required>
        <q-select
          v-model="form.departamento"
          :for="ids.departamento"
          :options="departamentos"
          emit-value
          map-options
          outlined
          dense
          aria-required="true"
          :rules="[rules.required('Seleccione el departamento.')]"
        />
      </FormField>
      <FormField label="Provincia" :for-id="ids.provincia" required>
        <q-input v-model="form.provincia" :for="ids.provincia" outlined dense aria-required="true" :rules="[rules.required('Ingrese la provincia.')]" />
      </FormField>
      <FormField label="Distrito" :for-id="ids.distrito" required>
        <q-input v-model="form.distrito" :for="ids.distrito" outlined dense aria-required="true" :rules="[rules.required('Ingrese el distrito.')]" />
      </FormField>
      <FormField label="Dirección" :for-id="ids.direccion" class="us-form-grid__full">
        <q-input v-model="form.direccion" :for="ids.direccion" outlined dense hint="Use una dirección referencial; el prototipo no registra datos reales." />
      </FormField>
      <FormField label="Responsable" :for-id="ids.responsable" required class="us-form-grid__full">
        <q-input
          v-model="form.responsable"
          :for="ids.responsable"
          outlined
          dense
          aria-required="true"
          placeholder="Ej.: Responsable 01 – Dirección del CAR"
          :rules="[rules.required('Indique el responsable.')]"
        />
      </FormField>
    </q-form>

    <template #actions>
      <AppButton variant="outline" label="Cancelar" :disable="loading" @click="open = false" />
      <AppButton icon="save" label="Guardar establecimiento" :loading="loading" @click="save" />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
// Diálogo de registro y edición de un CAR. El estado del levantamiento lo gestionan las campañas.
import { reactive, ref, useId, watch } from 'vue';
import type { QForm } from 'quasar';
import AppDialog from 'src/components/AppDialog.vue';
import AppButton from 'src/components/AppButton.vue';
import FormField from 'src/components/FormField.vue';
import { useAsyncTask } from 'src/composables/useAsyncTask';
import { optionsFromList, rules } from 'src/core/utils/options';
import { omitId } from 'src/core/utils/object';
import {
  actualizarEstablecimiento,
  crearEstablecimiento,
} from 'src/modules/establecimientos/services/establecimientos.service';
import {
  DEPARTAMENTOS,
  type Establecimiento,
  type EstablecimientoInput,
} from 'src/modules/establecimientos/types';

const props = defineProps<{ establecimiento: Establecimiento | null }>();
const emit = defineEmits<{ saved: [establecimiento: Establecimiento] }>();
const open = defineModel<boolean>({ required: true });

const prefix = useId();
const ids = {
  nombre: `${prefix}-nombre`,
  poblacion: `${prefix}-poblacion`,
  capacidad: `${prefix}-capacidad`,
  departamento: `${prefix}-departamento`,
  provincia: `${prefix}-provincia`,
  distrito: `${prefix}-distrito`,
  direccion: `${prefix}-direccion`,
  responsable: `${prefix}-responsable`,
};

const departamentos = optionsFromList(DEPARTAMENTOS);
const formRef = ref<QForm | null>(null);
const { loading, run } = useAsyncTask();

function emptyForm(): EstablecimientoInput {
  return {
    nombre: '',
    tipoPoblacion: '',
    capacidad: 20,
    departamento: 'Lima',
    provincia: '',
    distrito: '',
    direccion: '',
    responsable: '',
    estado: 'activo',
    estadoLevantamiento: 'pendiente',
    fechaLevantamiento: null,
  };
}

const form = reactive<EstablecimientoInput>(emptyForm());

watch(open, (isOpen) => {
  if (!isOpen) return;
  Object.assign(form, props.establecimiento ? omitId(props.establecimiento) : emptyForm());
});

async function save(): Promise<void> {
  const valid = await formRef.value?.validate();
  if (!valid) return;
  const datos: EstablecimientoInput = { ...form, capacidad: Number(form.capacidad) };
  const actual = props.establecimiento;
  const result = await run(
    () => (actual ? actualizarEstablecimiento(actual.id, datos) : crearEstablecimiento(datos)),
    (car) => (actual ? `Se actualizó ${car.nombre}.` : `Se registró ${car.nombre} con el código ${car.id}.`),
  );
  if (result.ok) {
    emit('saved', result.value);
    open.value = false;
  }
}
</script>
