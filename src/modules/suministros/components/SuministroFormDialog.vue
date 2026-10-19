<template>
  <AppDialog
    v-model="open"
    :title="suministro ? 'Editar suministro' : 'Nuevo suministro'"
    :subtitle="suministro ? suministro.id : 'El código se generará al guardar'"
    icon="category"
    size="md"
    persistent
  >
    <q-form ref="formRef" class="us-form-grid" @submit.prevent="save">
      <FormField label="Nombre del suministro" :for-id="ids.nombre" required class="us-form-grid__full">
        <q-input
          v-model="form.nombre"
          :for="ids.nombre"
          outlined
          dense
          autofocus
          aria-required="true"
          placeholder="Ej.: Arroz extra"
          :rules="[rules.required('Ingrese el nombre del suministro.'), rules.minLength(3, 'Use al menos 3 caracteres.')]"
        />
      </FormField>
      <FormField label="Categoría" :for-id="ids.categoria" required>
        <q-select v-model="form.categoria" :for="ids.categoria" :options="categorias" emit-value map-options outlined dense aria-required="true" />
      </FormField>
      <FormField label="Unidad de medida" :for-id="ids.unidad" required>
        <q-select v-model="form.unidad" :for="ids.unidad" :options="unidades" emit-value map-options outlined dense aria-required="true" />
      </FormField>
      <FormField label="Stock mínimo" :for-id="ids.minimo" required>
        <q-input
          v-model.number="form.stockMinimo"
          :for="ids.minimo"
          type="number"
          min="0"
          outlined
          dense
          aria-required="true"
          hint="Por debajo de este valor se alerta en el stock de cada almacén."
          :rules="[rules.required('Ingrese el stock mínimo.'), rules.nonNegativeNumber('El stock mínimo no puede ser negativo.')]"
        />
      </FormField>
      <FormField label="Control de vencimiento" :for-id="ids.vence">
        <q-toggle :id="ids.vence" v-model="form.controlaVencimiento" color="primary" label="Exige lote y fecha de vencimiento" />
      </FormField>
      <FormField label="Descripción" :for-id="ids.descripcion" class="us-form-grid__full">
        <q-input v-model="form.descripcion" :for="ids.descripcion" type="textarea" autogrow outlined dense />
      </FormField>
    </q-form>

    <template #actions>
      <AppButton variant="outline" label="Cancelar" :disable="loading" @click="open = false" />
      <AppButton icon="save" label="Guardar suministro" :loading="loading" @click="save" />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
// Diálogo de registro y edición del catálogo de suministros
import { reactive, ref, useId, watch } from 'vue';
import type { QForm } from 'quasar';
import AppDialog from 'src/components/AppDialog.vue';
import AppButton from 'src/components/AppButton.vue';
import FormField from 'src/components/FormField.vue';
import { useAsyncTask } from 'src/composables/useAsyncTask';
import { optionsFrom, rules } from 'src/core/utils/options';
import { fieldIds, omitId } from 'src/core/utils/object';
import { actualizarSuministro, crearSuministro } from 'src/modules/suministros/services/suministros.service';
import {
  CATEGORIA_SUMINISTRO_LABEL,
  UNIDAD_LABEL,
  type Suministro,
  type SuministroInput,
} from 'src/modules/suministros/types';

const props = defineProps<{ suministro: Suministro | null }>();
const emit = defineEmits<{ saved: [suministro: Suministro] }>();
const open = defineModel<boolean>({ required: true });

const ids = fieldIds(useId(), ['nombre', 'categoria', 'unidad', 'minimo', 'vence', 'descripcion'] as const);
const categorias = optionsFrom(CATEGORIA_SUMINISTRO_LABEL);
const unidades = optionsFrom(UNIDAD_LABEL);
const formRef = ref<QForm | null>(null);
const { loading, run } = useAsyncTask();

function emptyForm(): SuministroInput {
  return { nombre: '', categoria: 'viveres', unidad: 'unidad', stockMinimo: 10, controlaVencimiento: true, descripcion: '', estado: 'activo' };
}

const form = reactive<SuministroInput>(emptyForm());

watch(open, (isOpen) => {
  if (isOpen) Object.assign(form, props.suministro ? omitId(props.suministro) : emptyForm());
});

async function save(): Promise<void> {
  if (!(await formRef.value?.validate())) return;
  const actual = props.suministro;
  const datos: SuministroInput = { ...form, stockMinimo: Number(form.stockMinimo) };
  const result = await run(
    () => (actual ? actualizarSuministro(actual.id, datos) : crearSuministro(datos)),
    (s) => (actual ? `Se actualizó ${s.nombre}.` : `Se registró ${s.nombre} con el código ${s.id}.`),
  );
  if (result.ok) {
    emit('saved', result.value);
    open.value = false;
  }
}
</script>
