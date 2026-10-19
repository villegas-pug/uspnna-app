<template>
  <AppDialog
    v-model="open"
    :title="almacen ? 'Editar almacén' : 'Nuevo almacén'"
    :subtitle="almacen ? almacen.id : 'El código se generará al guardar'"
    icon="warehouse"
    size="md"
    persistent
  >
    <q-form ref="formRef" class="us-form-grid" @submit.prevent="save">
      <FormField label="Establecimiento (CAR)" :for-id="ids.car" required class="us-form-grid__full">
        <q-select
          v-model="form.establecimientoId"
          :for="ids.car"
          :options="cars"
          emit-value
          map-options
          outlined
          dense
          aria-required="true"
          :rules="[rules.required('Seleccione el CAR.')]"
        />
      </FormField>
      <FormField label="Nombre del almacén" :for-id="ids.nombre" required class="us-form-grid__full">
        <q-input
          v-model="form.nombre"
          :for="ids.nombre"
          outlined
          dense
          autofocus
          aria-required="true"
          placeholder="Ej.: Almacén de víveres"
          :rules="[rules.required('Ingrese el nombre del almacén.'), rules.minLength(3, 'Use al menos 3 caracteres.')]"
        />
      </FormField>
      <FormField label="Tipo" :for-id="ids.tipo" required class="us-form-grid__full">
        <q-select v-model="form.tipo" :for="ids.tipo" :options="tipos" emit-value map-options outlined dense aria-required="true" />
      </FormField>
      <FormField label="Responsable" :for-id="ids.responsable" required class="us-form-grid__full">
        <q-input
          v-model="form.responsable"
          :for="ids.responsable"
          outlined
          dense
          aria-required="true"
          placeholder="Ej.: Responsable 01 – Almacén de víveres"
          :rules="[rules.required('Indique el responsable del almacén.')]"
        />
      </FormField>
      <FormField v-if="almacen" label="Estado" :for-id="ids.estado" class="us-form-grid__full">
        <q-option-group v-model="form.estado" :options="estados" inline color="primary" />
      </FormField>
    </q-form>

    <template #actions>
      <AppButton variant="outline" label="Cancelar" :disable="loading" @click="open = false" />
      <AppButton icon="save" label="Guardar almacén" :loading="loading" @click="save" />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
// Diálogo de registro y edición de almacenes de un CAR
import { computed, reactive, ref, useId, watch } from 'vue';
import type { QForm } from 'quasar';
import AppDialog from 'src/components/AppDialog.vue';
import AppButton from 'src/components/AppButton.vue';
import FormField from 'src/components/FormField.vue';
import { useAsyncTask } from 'src/composables/useAsyncTask';
import { optionsFrom, rules } from 'src/core/utils/options';
import { omitId } from 'src/core/utils/object';
import { ESTADO_REGISTRO_LABEL } from 'src/core/types/common';
import {
  actualizarAlmacen,
  crearAlmacen,
  opcionesEstablecimientos,
} from 'src/modules/establecimientos/services/establecimientos.service';
import { TIPO_ALMACEN_LABEL, type Almacen, type AlmacenInput } from 'src/modules/establecimientos/types';

const props = defineProps<{ almacen: Almacen | null; establecimientoId?: string | null | undefined }>();
const emit = defineEmits<{ saved: [almacen: Almacen] }>();
const open = defineModel<boolean>({ required: true });

const prefix = useId();
const ids = {
  car: `${prefix}-car`,
  nombre: `${prefix}-nombre`,
  tipo: `${prefix}-tipo`,
  responsable: `${prefix}-responsable`,
  estado: `${prefix}-estado`,
};

const cars = computed(() => opcionesEstablecimientos());
const tipos = optionsFrom(TIPO_ALMACEN_LABEL);
const estados = optionsFrom(ESTADO_REGISTRO_LABEL);
const formRef = ref<QForm | null>(null);
const { loading, run } = useAsyncTask();

function emptyForm(): AlmacenInput {
  return {
    establecimientoId: props.establecimientoId ?? '',
    nombre: '',
    tipo: 'general',
    responsable: '',
    estado: 'activo',
  };
}

const form = reactive<AlmacenInput>(emptyForm());

watch(open, (isOpen) => {
  if (isOpen) Object.assign(form, props.almacen ? omitId(props.almacen) : emptyForm());
});

async function save(): Promise<void> {
  if (!(await formRef.value?.validate())) return;
  const actual = props.almacen;
  const datos: AlmacenInput = { ...form };
  const result = await run(
    () => (actual ? actualizarAlmacen(actual.id, datos) : crearAlmacen(datos)),
    (almacen) => (actual ? `Se actualizó ${almacen.nombre}.` : `Se registró ${almacen.nombre} (${almacen.id}).`),
  );
  if (result.ok) {
    emit('saved', result.value);
    open.value = false;
  }
}
</script>
