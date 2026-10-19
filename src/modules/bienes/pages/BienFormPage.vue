<template>
  <PageContainer :title="isEdit ? 'Editar bien patrimonial' : 'Nuevo bien patrimonial'" :crumb="isEdit ? id : 'Nuevo bien'" reserve-fab>
    <EmptyState
      v-if="isEdit && !bien"
      icon="search_off"
      title="El bien no existe"
      text="Puede haber sido eliminado al restaurar los datos iniciales. Vuelva al registro de bienes."
    >
      <AppButton label="Ir al registro de bienes" to="/bienes" />
    </EmptyState>

    <AppNotice v-else-if="bien && bien.situacion === 'baja'" blocking>
      El bien {{ bien.id }} está dado de baja y no se puede editar.
    </AppNotice>

    <q-form v-else ref="formRef" class="us-stack us-stack--lg" @submit.prevent="save">
      <section>
        <SectionHeader title="Identificación" icon="badge" />
        <div class="us-form-grid us-form-grid--3">
          <FormField label="ID interno" :for-id="ids.id">
            <q-input :model-value="bien?.id ?? 'Se generará al guardar'" :for="ids.id" outlined dense readonly />
          </FormField>
          <FormField label="Código patrimonial" :for-id="ids.codigo">
            <q-input
              v-model="form.codigoPatrimonial"
              :for="ids.codigo"
              outlined
              dense
              clearable
              inputmode="numeric"
              maxlength="12"
              counter
              hint="Déjelo vacío si el bien aún no tiene código oficial."
              :rules="[rules.pattern(CODIGO_PATRIMONIAL_REGEX, 'El código patrimonial tiene 12 dígitos.'), codigoUnico]"
            />
          </FormField>
          <FormField label="Categoría" :for-id="ids.categoria" required>
            <q-select
              v-model="form.categoria"
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
          <FormField label="Descripción" :for-id="ids.descripcion" required class="us-form-grid__full">
            <q-input
              v-model="form.descripcion"
              :for="ids.descripcion"
              outlined
              dense
              autofocus
              aria-required="true"
              placeholder="Ej.: Refrigeradora de 14 pies cúbicos"
              :rules="[rules.required('Ingrese la descripción del bien.'), rules.minLength(3, 'Use al menos 3 caracteres.')]"
            />
          </FormField>
        </div>
      </section>

      <section>
        <SectionHeader title="Características" icon="tune" />
        <div class="us-form-grid us-form-grid--3">
          <FormField label="Marca" :for-id="ids.marca">
            <q-input v-model="form.marca" :for="ids.marca" outlined dense />
          </FormField>
          <FormField label="Modelo" :for-id="ids.modelo">
            <q-input v-model="form.modelo" :for="ids.modelo" outlined dense />
          </FormField>
          <FormField label="Serie" :for-id="ids.serie">
            <q-input v-model="form.serie" :for="ids.serie" outlined dense />
          </FormField>
          <FormField label="Color" :for-id="ids.color">
            <q-input v-model="form.color" :for="ids.color" outlined dense />
          </FormField>
          <FormField label="Fecha de adquisición" :for-id="ids.fecha">
            <DateField v-model="form.fechaAdquisicion" :for-id="ids.fecha" :max="hoy" />
          </FormField>
          <FormField label="Valor referencial (S/)" :for-id="ids.valor">
            <q-input
              :model-value="form.valorReferencial ?? ''"
              :for="ids.valor"
              type="number"
              min="0"
              step="0.01"
              outlined
              dense
              :rules="[rules.nonNegativeNumber('El valor no puede ser negativo.')]"
              @update:model-value="setValor"
            />
          </FormField>
        </div>
      </section>

      <section>
        <SectionHeader title="Ubicación y custodia" icon="place" />
        <AppNotice v-if="isEdit" tone="info" class="q-mb-md">
          Para cambiar el CAR o el ambiente use "Transferir bien" desde la ficha: así queda registrado en el historial.
        </AppNotice>
        <div class="us-form-grid us-form-grid--3">
          <FormField label="Establecimiento (CAR)" :for-id="ids.car" required>
            <q-select
              v-model="form.establecimientoId"
              :for="ids.car"
              :options="cars"
              emit-value
              map-options
              outlined
              dense
              aria-required="true"
              :readonly="isEdit"
              :rules="[rules.required('Seleccione el CAR.')]"
              @update:model-value="onCarChange"
            />
          </FormField>
          <FormField label="Ambiente" :for-id="ids.ambiente" required>
            <q-select
              v-model="form.ambienteId"
              :for="ids.ambiente"
              :options="ambientes"
              emit-value
              map-options
              outlined
              dense
              aria-required="true"
              :readonly="isEdit"
              :disable="!form.establecimientoId"
              :rules="[rules.required('Seleccione el ambiente.')]"
              @update:model-value="onAmbienteChange"
            />
          </FormField>
          <FormField label="Custodio" :for-id="ids.custodio">
            <q-input v-model="form.custodio" :for="ids.custodio" outlined dense hint="Se propone el custodio del ambiente." />
          </FormField>
        </div>
      </section>

      <section>
        <SectionHeader title="Estado del bien" icon="health_and_safety" />
        <div class="us-form-grid">
          <FormField label="Estado de conservación" :for-id="ids.estado" required class="us-form-grid__full">
            <q-option-group
              :id="ids.estado"
              v-model="form.estadoConservacion"
              :options="estados"
              inline
              color="primary"
              class="estado-group"
            />
          </FormField>
          <FormField label="Observaciones" :for-id="ids.observaciones" class="us-form-grid__full">
            <q-input v-model="form.observaciones" :for="ids.observaciones" type="textarea" autogrow outlined dense maxlength="500" counter />
          </FormField>
        </div>
      </section>

      <section>
        <SectionHeader title="Fotografías y evidencias" icon="photo_library" />
        <BienFotos v-model="form.fotos" :for-id="ids.fotos" />
      </section>

      <FloatingActions :actions="floatingActions" />
    </q-form>
  </PageContainer>
</template>

<script setup lang="ts">
// Registro y edición de un bien patrimonial: ID interno generado y código patrimonial opcional (RN-B1, RN-B2)
import { computed, reactive, ref, useId, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { QForm } from 'quasar';
import PageContainer from 'src/components/PageContainer.vue';
import AppButton from 'src/components/AppButton.vue';
import AppNotice from 'src/components/AppNotice.vue';
import EmptyState from 'src/components/EmptyState.vue';
import SectionHeader from 'src/components/SectionHeader.vue';
import FormField from 'src/components/FormField.vue';
import DateField from 'src/components/DateField.vue';
import FloatingActions from 'src/components/FloatingActions.vue';
import BienFotos from 'src/modules/bienes/components/BienFotos.vue';
import { useAsyncTask } from 'src/composables/useAsyncTask';
import { optionsFrom, rules } from 'src/core/utils/options';
import { todayIso } from 'src/core/utils/format';
import { fieldIds } from 'src/core/utils/object';
import {
  obtenerAmbiente,
  opcionesAmbientes,
  opcionesEstablecimientos,
} from 'src/modules/establecimientos/services/establecimientos.service';
import {
  actualizarBien,
  codigoPatrimonialEnUso,
  obtenerBien,
  registrarBien,
} from 'src/modules/bienes/services/bienes.service';
import {
  CATEGORIA_BIEN_LABEL,
  CODIGO_PATRIMONIAL_REGEX,
  ESTADO_CONSERVACION_LABEL,
  type BienInput,
} from 'src/modules/bienes/types';
import type { FloatingAction } from 'src/components/types';

const props = defineProps<{ id?: string | undefined }>();

const router = useRouter();
const { loading, run } = useAsyncTask();
const formRef = ref<QForm | null>(null);
const hoy = todayIso();

const isEdit = computed(() => Boolean(props.id));
const bien = computed(() => obtenerBien(props.id));

const prefix = useId();
const ids = fieldIds(prefix, [
  'id',
  'codigo',
  'categoria',
  'descripcion',
  'marca',
  'modelo',
  'serie',
  'color',
  'fecha',
  'valor',
  'car',
  'ambiente',
  'custodio',
  'estado',
  'observaciones',
  'fotos',
] as const);

const cars = computed(() => opcionesEstablecimientos());
const categorias = optionsFrom(CATEGORIA_BIEN_LABEL);
const estados = optionsFrom(ESTADO_CONSERVACION_LABEL);

function emptyForm(): BienInput {
  return {
    codigoPatrimonial: null,
    descripcion: '',
    categoria: 'mobiliario',
    marca: '',
    modelo: '',
    serie: '',
    color: '',
    establecimientoId: '',
    ambienteId: '',
    custodio: '',
    estadoConservacion: 'bueno',
    fechaAdquisicion: null,
    valorReferencial: null,
    observaciones: '',
    fotos: [],
  };
}

const form = reactive<BienInput>(emptyForm());
const ambientes = computed(() => opcionesAmbientes(form.establecimientoId));

watch(
  bien,
  (actual) => {
    if (!actual) return;
    Object.assign(form, {
      codigoPatrimonial: actual.codigoPatrimonial,
      descripcion: actual.descripcion,
      categoria: actual.categoria,
      marca: actual.marca,
      modelo: actual.modelo,
      serie: actual.serie,
      color: actual.color,
      establecimientoId: actual.establecimientoId,
      ambienteId: actual.ambienteId,
      custodio: actual.custodio,
      estadoConservacion: actual.estadoConservacion,
      fechaAdquisicion: actual.fechaAdquisicion,
      valorReferencial: actual.valorReferencial,
      observaciones: actual.observaciones,
      fotos: [...actual.fotos],
    });
  },
  { immediate: true },
);

function codigoUnico(value: unknown): true | string {
  const codigo = typeof value === 'string' ? value.trim() : '';
  if (!codigo) return true;
  const enUso = codigoPatrimonialEnUso(codigo, props.id);
  return !enUso || `El código ya está asignado al bien ${enUso.id}. Verifique la etiqueta.`;
}

function setValor(value: string | number | null): void {
  form.valorReferencial = value === null || value === '' ? null : Number(value);
}

function onCarChange(): void {
  form.ambienteId = '';
  form.custodio = '';
}

function onAmbienteChange(id: string | null): void {
  form.custodio = obtenerAmbiente(id)?.custodio ?? '';
}

async function save(): Promise<void> {
  if (!(await formRef.value?.validate())) return;
  const datos: BienInput = { ...form, fotos: [...form.fotos] };
  const actual = bien.value;
  const result = await run(
    () => (actual ? actualizarBien(actual.id, datos) : registrarBien(datos)),
    (guardado) => (actual ? `Se actualizó el bien ${guardado.id}.` : `Se registró el bien con el ID interno ${guardado.id}.`),
  );
  if (result.ok) await router.push(`/bienes/${result.value.id}`);
}

function cancel(): void {
  void router.push(bien.value ? `/bienes/${bien.value.id}` : '/bienes');
}

const floatingActions = computed<FloatingAction[]>(() => [
  { key: 'cancelar', icon: 'close', label: 'Cancelar', tone: 'neutral', handler: cancel, disabled: loading.value },
  { key: 'guardar', icon: 'save', label: 'Guardar bien', tone: 'primary', handler: () => void save(), loading: loading.value },
]);
</script>

<style scoped lang="scss">
.estado-group {
  :deep(.q-radio) {
    margin-right: 20px;
  }
}
</style>
