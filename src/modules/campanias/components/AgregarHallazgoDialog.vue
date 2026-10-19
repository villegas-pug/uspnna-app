<template>
  <AppDialog
    v-model="open"
    title="Agregar bien encontrado"
    subtitle="Bien que no figura en la lista del ambiente: registrado en otra ubicación o sin registro."
    icon="add_location_alt"
    size="md"
    persistent
  >
    <q-tabs v-model="modo" class="us-tabs q-mb-md" align="justify" no-caps>
      <q-tab name="registrado" icon="inventory_2" label="Bien registrado" />
      <q-tab name="sobrante" icon="add_circle_outline" label="Bien sin registro" />
    </q-tabs>

    <q-form ref="formRef" class="us-form-grid" @submit.prevent="add">
      <template v-if="modo === 'registrado'">
        <FormField label="Bien" :for-id="ids.bien" required class="us-form-grid__full">
          <q-select
            v-model="bienId"
            :for="ids.bien"
            :options="opciones"
            emit-value
            map-options
            use-input
            input-debounce="200"
            outlined
            dense
            autofocus
            aria-required="true"
            hint="Busque por ID interno, código patrimonial o descripción."
            :rules="[rules.required('Seleccione el bien encontrado.')]"
            @filter="onFilter"
          >
            <template #no-option>
              <q-item>
                <q-item-section class="text-grey-8">Sin coincidencias. Registre el bien como "sin registro".</q-item-section>
              </q-item>
            </template>
          </q-select>
        </FormField>
        <AppNotice v-if="seleccionado" tone="info" class="us-form-grid__full">
          Registrado en {{ ubicacionAmbiente(seleccionado.ambienteId) }}: se conciliará como diferencia de ubicación.
        </AppNotice>
      </template>

      <template v-else>
        <FormField label="Descripción del bien" :for-id="ids.descripcion" required class="us-form-grid__full">
          <q-input
            v-model="descripcion"
            :for="ids.descripcion"
            outlined
            dense
            autofocus
            aria-required="true"
            placeholder="Ej.: Silla de plástico apilable color azul"
            :rules="[rules.required('Describa el bien.'), rules.minLength(3, 'Use al menos 3 caracteres.')]"
          />
        </FormField>
        <FormField label="Código patrimonial leído" :for-id="ids.codigo" class="us-form-grid__full">
          <q-input
            v-model="codigo"
            :for="ids.codigo"
            outlined
            dense
            inputmode="numeric"
            maxlength="12"
            hint="Solo si el bien tiene una etiqueta patrimonial."
            :rules="[rules.pattern(CODIGO_PATRIMONIAL_REGEX, 'El código patrimonial tiene 12 dígitos.')]"
          />
        </FormField>
      </template>

      <FormField label="Estado de conservación" :for-id="ids.estado" required class="us-form-grid__full">
        <q-option-group :id="ids.estado" v-model="estado" :options="estados" inline color="primary" />
      </FormField>
      <FormField label="Observaciones" :for-id="ids.observaciones" class="us-form-grid__full">
        <q-input v-model="observaciones" :for="ids.observaciones" type="textarea" autogrow outlined dense />
      </FormField>
    </q-form>

    <template #actions>
      <AppButton variant="outline" label="Cancelar" @click="open = false" />
      <AppButton icon="add" label="Agregar a la verificación" @click="add" />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
// Registro de un hallazgo adicional: bien registrado en otra ubicación (diferencia de ubicación) o sobrante
import { computed, ref, useId, watch } from 'vue';
import type { QForm } from 'quasar';
import AppDialog from 'src/components/AppDialog.vue';
import AppButton from 'src/components/AppButton.vue';
import AppNotice from 'src/components/AppNotice.vue';
import FormField from 'src/components/FormField.vue';
import { optionsFrom, rules } from 'src/core/utils/options';
import { fieldIds } from 'src/core/utils/object';
import { matchesSearch } from 'src/core/utils/format';
import { ubicacionAmbiente } from 'src/modules/establecimientos/services/establecimientos.service';
import { listarBienes, obtenerBien } from 'src/modules/bienes/services/bienes.service';
import {
  CODIGO_PATRIMONIAL_REGEX,
  ESTADO_CONSERVACION_LABEL,
  type EstadoConservacion,
} from 'src/modules/bienes/types';
import type { HallazgoAdicionalInput } from 'src/modules/campanias/types';

const props = defineProps<{
  /** Bienes que no se ofrecen (esperados en el ambiente o ya agregados). */
  excluidos: string[];
}>();
const emit = defineEmits<{ add: [hallazgo: HallazgoAdicionalInput] }>();
const open = defineModel<boolean>({ required: true });

const ids = fieldIds(useId(), ['bien', 'descripcion', 'codigo', 'estado', 'observaciones'] as const);
const estados = optionsFrom(ESTADO_CONSERVACION_LABEL);
const formRef = ref<QForm | null>(null);

const modo = ref<'registrado' | 'sobrante'>('registrado');
const bienId = ref<string | null>(null);
const descripcion = ref('');
const codigo = ref('');
const estado = ref<EstadoConservacion>('bueno');
const observaciones = ref('');
const needle = ref('');

const seleccionado = computed(() => obtenerBien(bienId.value));

const opciones = computed(() => {
  const excluidos = new Set(props.excluidos);
  return listarBienes()
    .filter((bien) => bien.situacion === 'activo' && !excluidos.has(bien.id))
    .filter((bien) => matchesSearch(needle.value, bien.id, bien.codigoPatrimonial, bien.descripcion))
    .slice(0, 50)
    .map((bien) => ({
      label: `${bien.id} · ${bien.descripcion} (${ubicacionAmbiente(bien.ambienteId)})`,
      value: bien.id,
    }));
});

function onFilter(value: string, update: (callback: () => void) => void): void {
  update(() => {
    needle.value = value;
  });
}

watch(open, (isOpen) => {
  if (!isOpen) return;
  modo.value = 'registrado';
  bienId.value = null;
  descripcion.value = '';
  codigo.value = '';
  estado.value = 'bueno';
  observaciones.value = '';
  needle.value = '';
});

watch(seleccionado, (bien) => {
  if (bien) estado.value = bien.estadoConservacion;
});

async function add(): Promise<void> {
  if (!(await formRef.value?.validate())) return;
  const bien = modo.value === 'registrado' ? seleccionado.value : undefined;
  emit('add', {
    bienId: bien ? bien.id : null,
    descripcion: bien ? bien.descripcion : descripcion.value.trim(),
    codigoPatrimonialLeido: bien ? null : codigo.value.trim() || null,
    estadoConservacion: estado.value,
    observaciones: observaciones.value.trim(),
  });
  open.value = false;
}
</script>
