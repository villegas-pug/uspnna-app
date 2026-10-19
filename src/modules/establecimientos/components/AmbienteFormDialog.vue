<template>
  <AppDialog
    v-model="open"
    :title="ambiente ? 'Editar ambiente' : 'Nuevo ambiente'"
    :subtitle="ambiente ? ambiente.id : 'El código se generará al guardar'"
    icon="meeting_room"
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
      <FormField label="Nombre del ambiente" :for-id="ids.nombre" required class="us-form-grid__full">
        <q-input
          v-model="form.nombre"
          :for="ids.nombre"
          outlined
          dense
          autofocus
          aria-required="true"
          placeholder="Ej.: Dormitorio 3"
          :rules="[rules.required('Ingrese el nombre del ambiente.'), rules.minLength(3, 'Use al menos 3 caracteres.')]"
        />
      </FormField>
      <FormField label="Tipo" :for-id="ids.tipo" required>
        <q-select v-model="form.tipo" :for="ids.tipo" :options="tipos" emit-value map-options outlined dense aria-required="true" />
      </FormField>
      <FormField label="Piso" :for-id="ids.piso" required>
        <q-input v-model="form.piso" :for="ids.piso" outlined dense aria-required="true" :rules="[rules.required('Indique el piso.')]" />
      </FormField>
      <FormField label="Custodio" :for-id="ids.custodio" required class="us-form-grid__full">
        <q-input
          v-model="form.custodio"
          :for="ids.custodio"
          outlined
          dense
          aria-required="true"
          placeholder="Ej.: Custodio 03 – Área de cocina"
          hint="Sin datos personales: use el cargo o área."
          :rules="[rules.required('Indique el custodio del ambiente.')]"
        />
      </FormField>
      <FormField v-if="ambiente" label="Estado" :for-id="ids.estado" class="us-form-grid__full">
        <q-option-group v-model="form.estado" :options="estados" inline color="primary" />
      </FormField>
    </q-form>

    <template #actions>
      <AppButton variant="outline" label="Cancelar" :disable="loading" @click="open = false" />
      <AppButton icon="save" label="Guardar ambiente" :loading="loading" @click="save" />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
// Diálogo de registro y edición de ambientes de un CAR
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
  actualizarAmbiente,
  crearAmbiente,
  opcionesEstablecimientos,
} from 'src/modules/establecimientos/services/establecimientos.service';
import { TIPO_AMBIENTE_LABEL, type Ambiente, type AmbienteInput } from 'src/modules/establecimientos/types';

const props = defineProps<{ ambiente: Ambiente | null; establecimientoId?: string | null | undefined }>();
const emit = defineEmits<{ saved: [ambiente: Ambiente] }>();
const open = defineModel<boolean>({ required: true });

const prefix = useId();
const ids = {
  car: `${prefix}-car`,
  nombre: `${prefix}-nombre`,
  tipo: `${prefix}-tipo`,
  piso: `${prefix}-piso`,
  custodio: `${prefix}-custodio`,
  estado: `${prefix}-estado`,
};

const cars = computed(() => opcionesEstablecimientos());
const tipos = optionsFrom(TIPO_AMBIENTE_LABEL);
const estados = optionsFrom(ESTADO_REGISTRO_LABEL);
const formRef = ref<QForm | null>(null);
const { loading, run } = useAsyncTask();

function emptyForm(): AmbienteInput {
  return {
    establecimientoId: props.establecimientoId ?? '',
    nombre: '',
    tipo: 'dormitorio',
    piso: 'Piso 1',
    custodio: '',
    estado: 'activo',
  };
}

const form = reactive<AmbienteInput>(emptyForm());

watch(open, (isOpen) => {
  if (isOpen) Object.assign(form, props.ambiente ? omitId(props.ambiente) : emptyForm());
});

async function save(): Promise<void> {
  if (!(await formRef.value?.validate())) return;
  const actual = props.ambiente;
  const datos: AmbienteInput = { ...form };
  const result = await run(
    () => (actual ? actualizarAmbiente(actual.id, datos) : crearAmbiente(datos)),
    (ambiente) => (actual ? `Se actualizó el ambiente ${ambiente.nombre}.` : `Se registró el ambiente ${ambiente.nombre} (${ambiente.id}).`),
  );
  if (result.ok) {
    emit('saved', result.value);
    open.value = false;
  }
}
</script>
