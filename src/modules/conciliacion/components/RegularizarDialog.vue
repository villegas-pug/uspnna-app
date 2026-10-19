<template>
  <AppDialog
    v-model="open"
    title="Confirmar regularización"
    :subtitle="item ? `${item.id} · ${RESULTADO_LABEL[item.resultado]}` : ''"
    icon="rule"
    size="md"
    persistent
  >
    <q-form v-if="item" ref="formRef" class="us-form-grid" @submit.prevent="save">
      <AppNotice class="us-form-grid__full">
        Esta acción actualizará el registro maestro: {{ accion?.toLowerCase() }}. No se puede deshacer desde el prototipo.
      </AppNotice>

      <div class="us-form-grid__full">
        <DetailTable :rows="cambios" caption="Cambio que se aplicará" />
      </div>

      <FormField v-if="item.resultado === 'sobrante'" label="Categoría del bien que se incorpora" :for-id="ids.categoria" required class="us-form-grid__full">
        <q-select
          v-model="categoria"
          :for="ids.categoria"
          :options="categorias"
          emit-value
          map-options
          outlined
          dense
          aria-required="true"
          :rules="[rules.required('Seleccione la categoría.')]"
        />
      </FormField>

      <FormField label="Sustento de la regularización" :for-id="ids.sustento" required class="us-form-grid__full">
        <q-input
          v-model="sustento"
          :for="ids.sustento"
          type="textarea"
          autogrow
          outlined
          dense
          autofocus
          aria-required="true"
          placeholder="Ej.: Acta de verificación firmada por el custodio"
          :rules="[rules.required('Describa el sustento.'), rules.minLength(10, 'Use al menos 10 caracteres.')]"
        />
      </FormField>

      <q-checkbox
        v-model="acknowledged"
        class="us-form-grid__full"
        label="Entiendo que esta acción actualizará el registro maestro."
      />
    </q-form>

    <template #actions>
      <AppButton variant="outline" label="Cancelar" :disable="loading" @click="open = false" />
      <AppButton
        :variant="item?.resultado === 'faltante' ? 'negative' : 'primary'"
        icon="rule"
        label="Confirmar regularización"
        :loading="loading"
        :disable="!acknowledged"
        @click="save"
      />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
// Regularización de un resultado (RN-K2): muestra el cambio, exige sustento y casilla de confirmación
import { computed, ref, useId, watch } from 'vue';
import type { QForm } from 'quasar';
import AppDialog from 'src/components/AppDialog.vue';
import AppButton from 'src/components/AppButton.vue';
import AppNotice from 'src/components/AppNotice.vue';
import FormField from 'src/components/FormField.vue';
import DetailTable from 'src/components/DetailTable.vue';
import { useAsyncTask } from 'src/composables/useAsyncTask';
import { optionsFrom, rules } from 'src/core/utils/options';
import { fieldIds } from 'src/core/utils/object';
import { formatNumber } from 'src/core/utils/format';
import { nombreAlmacen, ubicacionAmbiente } from 'src/modules/establecimientos/services/establecimientos.service';
import { stockDe } from 'src/modules/suministros/services/stock.service';
import { obtenerSuministro } from 'src/modules/suministros/services/suministros.service';
import { regularizarItem } from 'src/modules/conciliacion/services/conciliacion.service';
import { codigoRegistro } from 'src/modules/conciliacion/utils/descripcion-item';
import { CATEGORIA_BIEN_LABEL, type CategoriaBien } from 'src/modules/bienes/types';
import {
  ACCION_REGULARIZACION,
  RESULTADO_LABEL,
  type ItemConciliacion,
} from 'src/modules/conciliacion/types';
import type { DetailRow } from 'src/components/types';

const props = defineProps<{ item: ItemConciliacion | null }>();
const emit = defineEmits<{ saved: [item: ItemConciliacion] }>();
const open = defineModel<boolean>({ required: true });

const ids = fieldIds(useId(), ['categoria', 'sustento'] as const);
const categorias = optionsFrom(CATEGORIA_BIEN_LABEL);
const formRef = ref<QForm | null>(null);
const { loading, run } = useAsyncTask();

const sustento = ref('');
const categoria = ref<CategoriaBien | null>(null);
const acknowledged = ref(false);

const accion = computed(() => (props.item ? ACCION_REGULARIZACION[props.item.resultado] : undefined));

const cambios = computed<DetailRow[]>(() => {
  const item = props.item;
  if (!item) return [];
  const filas: DetailRow[] = [
    { key: 'registro', label: 'Registro', icon: 'tag', value: `${codigoRegistro(item)} · ${item.descripcion}` },
    { key: 'accion', label: 'Acción', icon: 'rule', value: accion.value ?? '' },
  ];
  if (item.resultado === 'diferencia_ubicacion') {
    filas.push(
      { key: 'antes', label: 'Ubicación actual', icon: 'logout', value: ubicacionAmbiente(item.ambienteRegistradoId) },
      { key: 'despues', label: 'Nueva ubicación', icon: 'login', value: ubicacionAmbiente(item.ambienteEncontradoId) },
    );
  }
  if (item.resultado === 'faltante') {
    filas.push({ key: 'despues', label: 'Nueva situación', icon: 'block', value: 'Baja por faltante en inventario' });
  }
  if (item.resultado === 'sobrante') {
    filas.push({ key: 'despues', label: 'Se incorporará en', icon: 'add_box', value: ubicacionAmbiente(item.ambienteEncontradoId) });
  }
  if (item.resultado === 'diferencia_cantidad' && item.almacenId && item.suministroId) {
    const unidad = obtenerSuministro(item.suministroId)?.unidad ?? '';
    const diferencia = (item.cantidadFisica ?? 0) - (item.cantidadSistema ?? 0);
    const actual = stockDe(item.almacenId, item.suministroId);
    filas.push(
      { key: 'almacen', label: 'Almacén', icon: 'warehouse', value: nombreAlmacen(item.almacenId) },
      { key: 'ajuste', label: 'Ajuste', icon: 'tune', value: `${diferencia > 0 ? '+' : ''}${formatNumber(diferencia)} ${unidad}` },
      { key: 'stock', label: 'Stock actual → resultante', icon: 'inventory', value: `${formatNumber(actual)} → ${formatNumber(actual + diferencia)} ${unidad}` },
    );
  }
  return filas;
});

watch(open, (isOpen) => {
  if (!isOpen) return;
  sustento.value = '';
  categoria.value = null;
  acknowledged.value = false;
});

async function save(): Promise<void> {
  const item = props.item;
  if (!item || !acknowledged.value || !(await formRef.value?.validate())) return;
  const result = await run(
    () => regularizarItem(item.id, { sustento: sustento.value, categoria: categoria.value }),
    `Se regularizó el resultado ${item.id}.`,
  );
  if (result.ok) {
    emit('saved', result.value);
    open.value = false;
  }
}
</script>
