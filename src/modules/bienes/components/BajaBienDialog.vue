<template>
  <AppDialog
    v-model="open"
    title="Dar de baja el bien"
    :subtitle="bien ? `${bien.id} · ${bien.descripcion}` : ''"
    icon="block"
    size="md"
    persistent
  >
    <q-form ref="formRef" class="us-form-grid" @submit.prevent="save">
      <AppNotice class="us-form-grid__full">
        La baja no elimina el bien: queda en situación "Baja", sin posibilidad de editarlo ni transferirlo.
      </AppNotice>
      <FormField label="Motivo de la baja" :for-id="ids.motivo" required class="us-form-grid__full">
        <q-select
          v-model="form.motivo"
          :for="ids.motivo"
          :options="motivos"
          emit-value
          map-options
          outlined
          dense
          autofocus
          aria-required="true"
          :rules="[rules.required('Seleccione el motivo de la baja.')]"
        />
      </FormField>
      <FormField label="Sustento" :for-id="ids.sustento" required class="us-form-grid__full">
        <q-input
          v-model="form.sustento"
          :for="ids.sustento"
          type="textarea"
          autogrow
          outlined
          dense
          aria-required="true"
          placeholder="Ej.: Informe técnico N.° 012-2026-USPNNA"
          :rules="[rules.required('Describa el sustento.'), rules.minLength(10, 'Use al menos 10 caracteres.')]"
        />
      </FormField>
      <q-checkbox
        v-model="acknowledged"
        class="us-form-grid__full"
        label="Entiendo que esta acción actualizará el registro maestro del bien."
      />
    </q-form>

    <template #actions>
      <AppButton variant="outline" label="Cancelar" :disable="loading" @click="open = false" />
      <AppButton variant="negative" icon="block" label="Confirmar baja" :loading="loading" :disable="!acknowledged" @click="save" />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
// Baja de un bien (RN-B4): motivo, sustento y confirmación explícita
import { reactive, ref, useId, watch } from 'vue';
import type { QForm } from 'quasar';
import AppDialog from 'src/components/AppDialog.vue';
import AppButton from 'src/components/AppButton.vue';
import AppNotice from 'src/components/AppNotice.vue';
import FormField from 'src/components/FormField.vue';
import { useAsyncTask } from 'src/composables/useAsyncTask';
import { optionsFromList, rules } from 'src/core/utils/options';
import { darDeBajaBien } from 'src/modules/bienes/services/bienes.service';
import { MOTIVOS_BAJA, type BajaBienInput, type BienPatrimonial } from 'src/modules/bienes/types';

const props = defineProps<{ bien: BienPatrimonial | null }>();
const emit = defineEmits<{ saved: [bien: BienPatrimonial] }>();
const open = defineModel<boolean>({ required: true });

const prefix = useId();
const ids = { motivo: `${prefix}-motivo`, sustento: `${prefix}-sustento` };
const motivos = optionsFromList(MOTIVOS_BAJA);

const formRef = ref<QForm | null>(null);
const acknowledged = ref(false);
const { loading, run } = useAsyncTask();
const form = reactive<BajaBienInput>({ motivo: '', sustento: '' });

watch(open, (isOpen) => {
  if (isOpen) {
    Object.assign(form, { motivo: '', sustento: '' });
    acknowledged.value = false;
  }
});

async function save(): Promise<void> {
  const bien = props.bien;
  if (!bien || !acknowledged.value || !(await formRef.value?.validate())) return;
  const result = await run(() => darDeBajaBien(bien.id, { ...form }), `El bien ${bien.id} quedó dado de baja.`);
  if (result.ok) {
    emit('saved', result.value);
    open.value = false;
  }
}
</script>
