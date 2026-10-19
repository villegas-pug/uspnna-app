<template>
  <AppDialog
    v-model="open"
    title="Transferir bien"
    :subtitle="bien ? `${bien.id} · ${bien.descripcion}` : ''"
    icon="swap_horiz"
    size="md"
    persistent
  >
    <q-form v-if="bien" ref="formRef" class="us-form-grid" @submit.prevent="save">
      <div class="us-form-grid__full">
        <div class="field-caption">Ubicación actual</div>
        <div class="readonly-value">{{ ubicacionAmbiente(bien.ambienteId) }}</div>
      </div>
      <FormField label="CAR de destino" :for-id="ids.car" required class="us-form-grid__full">
        <q-select
          v-model="form.establecimientoId"
          :for="ids.car"
          :options="cars"
          emit-value
          map-options
          outlined
          dense
          autofocus
          aria-required="true"
          :rules="[rules.required('Seleccione el CAR de destino.')]"
          @update:model-value="onCarChange"
        />
      </FormField>
      <FormField label="Ambiente de destino" :for-id="ids.ambiente" required class="us-form-grid__full">
        <q-select
          v-model="form.ambienteId"
          :for="ids.ambiente"
          :options="ambientes"
          emit-value
          map-options
          outlined
          dense
          aria-required="true"
          :disable="!form.establecimientoId"
          :rules="[rules.required('Seleccione el ambiente de destino.')]"
          @update:model-value="onAmbienteChange"
        />
      </FormField>
      <FormField label="Custodio" :for-id="ids.custodio" class="us-form-grid__full">
        <q-input v-model="form.custodio" :for="ids.custodio" outlined dense hint="Se propone el custodio del ambiente de destino." />
      </FormField>
      <FormField label="Motivo de la transferencia" :for-id="ids.motivo" required class="us-form-grid__full">
        <q-input
          v-model="form.motivo"
          :for="ids.motivo"
          type="textarea"
          autogrow
          outlined
          dense
          aria-required="true"
          :rules="[rules.required('Indique el motivo.'), rules.minLength(5, 'Use al menos 5 caracteres.')]"
        />
      </FormField>
      <AppNotice v-if="form.ambienteId" tone="info" class="us-form-grid__full">
        El bien pasará de {{ ubicacionAmbiente(bien.ambienteId) }} a {{ ubicacionAmbiente(form.ambienteId) }} y
        el cambio quedará en su historial.
      </AppNotice>
    </q-form>

    <template #actions>
      <AppButton variant="outline" label="Cancelar" :disable="loading" @click="open = false" />
      <AppButton icon="swap_horiz" label="Confirmar transferencia" :loading="loading" @click="save" />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
// Transferencia de un bien a otro ambiente o CAR (RN-B3): exige motivo y registra el evento
import { computed, reactive, ref, useId, watch } from 'vue';
import type { QForm } from 'quasar';
import AppDialog from 'src/components/AppDialog.vue';
import AppButton from 'src/components/AppButton.vue';
import AppNotice from 'src/components/AppNotice.vue';
import FormField from 'src/components/FormField.vue';
import { useAsyncTask } from 'src/composables/useAsyncTask';
import { rules } from 'src/core/utils/options';
import {
  obtenerAmbiente,
  opcionesAmbientes,
  opcionesEstablecimientos,
  ubicacionAmbiente,
} from 'src/modules/establecimientos/services/establecimientos.service';
import { transferirBien } from 'src/modules/bienes/services/bienes.service';
import type { BienPatrimonial, TransferenciaBienInput } from 'src/modules/bienes/types';

const props = defineProps<{ bien: BienPatrimonial | null }>();
const emit = defineEmits<{ saved: [bien: BienPatrimonial] }>();
const open = defineModel<boolean>({ required: true });

const prefix = useId();
const ids = { car: `${prefix}-car`, ambiente: `${prefix}-ambiente`, custodio: `${prefix}-custodio`, motivo: `${prefix}-motivo` };

const formRef = ref<QForm | null>(null);
const { loading, run } = useAsyncTask();
const form = reactive<TransferenciaBienInput>({ establecimientoId: '', ambienteId: '', custodio: '', motivo: '' });

const cars = computed(() => opcionesEstablecimientos());
const ambientes = computed(() =>
  opcionesAmbientes(form.establecimientoId).filter((opcion) => opcion.value !== props.bien?.ambienteId),
);

watch(open, (isOpen) => {
  if (isOpen && props.bien) {
    Object.assign(form, { establecimientoId: props.bien.establecimientoId, ambienteId: '', custodio: '', motivo: '' });
  }
});

function onCarChange(): void {
  form.ambienteId = '';
  form.custodio = '';
}

function onAmbienteChange(id: string | null): void {
  form.custodio = obtenerAmbiente(id)?.custodio ?? '';
}

async function save(): Promise<void> {
  const bien = props.bien;
  if (!bien || !(await formRef.value?.validate())) return;
  const result = await run(() => transferirBien(bien.id, { ...form }), `Se transfirió el bien ${bien.id}.`);
  if (result.ok) {
    emit('saved', result.value);
    open.value = false;
  }
}
</script>

<style scoped lang="scss">
.field-caption {
  margin-bottom: var(--space-4);
  color: var(--ink-label);
  font-size: 0.95rem;
  font-weight: 500;
}

.readonly-value {
  padding: 10px 12px;
  border: 1px solid var(--border-readonly);
  border-radius: var(--radius-dialog);
  background: var(--field-readonly);
  color: #333;
  font-size: 0.95rem;
}
</style>
