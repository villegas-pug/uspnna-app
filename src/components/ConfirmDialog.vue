<template>
  <q-dialog ref="dialogRef" :aria-labelledby="titleId" @hide="onDialogHide">
    <q-card class="us-dialog us-dialog--sm">
      <header :id="titleId" class="us-dialog__title">{{ title }}</header>
      <div class="us-dialog__body">
        <p class="confirm__message">{{ message }}</p>
        <dl v-if="details && details.length > 0" class="confirm__details">
          <template v-for="detail in details" :key="detail.label">
            <dt>{{ detail.label }}</dt>
            <dd>{{ detail.value }}</dd>
          </template>
        </dl>
        <q-checkbox v-if="acknowledge" v-model="acknowledged" class="confirm__check" :label="acknowledge" />
      </div>
      <footer class="us-dialog__actions">
        <AppButton variant="outline" label="Cancelar" block autofocus @click="onDialogCancel" />
        <AppButton
          :variant="tone === 'negative' ? 'negative' : 'primary'"
          :label="confirmLabel"
          :disable="Boolean(acknowledge) && !acknowledged"
          block
          @click="onDialogOK"
        />
      </footer>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
// Confirmación (diálogo sm) para el plugin Dialog de Quasar. Con `acknowledge`, la acción
// solo se habilita al marcar la casilla: confirmación explícita de cambios al registro maestro.
import { ref, useId } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import AppButton from 'src/components/AppButton.vue';
import type { ConfirmDetail } from 'src/components/types';

withDefaults(
  defineProps<{
    title: string;
    message: string;
    confirmLabel: string;
    tone?: 'primary' | 'negative' | undefined;
    acknowledge?: string | undefined;
    details?: ConfirmDetail[] | undefined;
  }>(),
  { tone: 'primary' },
);

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();
const acknowledged = ref(false);
const titleId = useId();
</script>

<style scoped lang="scss">
.confirm__message {
  margin: 0 0 var(--space-12);
}

.confirm__details {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 4px var(--space-12);
  margin: 0 0 var(--space-12);
  padding: var(--space-10) var(--space-12);
  border-radius: var(--radius-dialog);
  background: var(--surface-sunken);

  dt {
    font-weight: 700;
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
}

.confirm__check {
  margin-left: -8px;
}
</style>
