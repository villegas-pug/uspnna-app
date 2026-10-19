<template>
  <AppDialog v-model="open" :title="TITULO[tipo]" :subtitle="SUBTITULO[tipo]" :icon="ICONO[tipo]" size="lg" persistent>
    <q-form ref="formRef" class="us-stack" @submit.prevent="save">
      <div class="us-form-grid us-form-grid--3">
        <FormField label="Fecha" :for-id="ids.fecha" required>
          <DateField v-model="form.fecha" :for-id="ids.fecha" required :max="hoy" />
        </FormField>
        <FormField v-if="tipo !== 'ingreso'" label="Almacén de origen" :for-id="ids.origen" required>
          <q-select
            v-model="form.almacenOrigenId"
            :for="ids.origen"
            :options="almacenes"
            emit-value
            map-options
            outlined
            dense
            aria-required="true"
            :rules="[rules.required('Seleccione el almacén de origen.')]"
            @update:model-value="resetItems"
          />
        </FormField>
        <FormField v-if="tipo !== 'salida'" label="Almacén de destino" :for-id="ids.destino" required>
          <q-select
            v-model="form.almacenDestinoId"
            :for="ids.destino"
            :options="almacenesDestino"
            emit-value
            map-options
            outlined
            dense
            aria-required="true"
            :rules="[rules.required('Seleccione el almacén de destino.')]"
          />
        </FormField>
        <FormField label="Motivo" :for-id="ids.motivo" required>
          <q-select
            v-model="form.motivo"
            :for="ids.motivo"
            :options="motivos"
            emit-value
            map-options
            outlined
            dense
            aria-required="true"
            :rules="[rules.required('Seleccione el motivo.')]"
            @update:model-value="tipo === 'salida' && resetItems()"
          />
        </FormField>
        <FormField label="Documento de referencia" :for-id="ids.documento" :required="tipo === 'ingreso'">
          <q-input
            v-model="form.documento"
            :for="ids.documento"
            outlined
            dense
            :aria-required="tipo === 'ingreso' ? 'true' : undefined"
            :placeholder="PLACEHOLDER_DOCUMENTO[tipo]"
            :rules="tipo === 'ingreso' ? [rules.required('Ingrese la guía, PECOSA o acta del ingreso.')] : []"
          />
        </FormField>
        <FormField label="Observaciones" :for-id="ids.observaciones" class="us-form-grid__full">
          <q-input v-model="form.observaciones" :for="ids.observaciones" type="textarea" autogrow outlined dense />
        </FormField>
      </div>

      <section>
        <SectionHeader title="Suministros del movimiento" icon="list_alt" tag="h3" />
        <AppNotice v-if="tipo !== 'ingreso'" tone="info" class="q-mb-md">
          {{
            esSalidaPorVencimiento
              ? 'Con el motivo "Vencimiento" solo se descuentan lotes vencidos.'
              : 'Se descuenta primero el lote que vence antes (FEFO). Los lotes vencidos no se despachan.'
          }}
        </AppNotice>
        <AppNotice v-if="tipo !== 'ingreso' && !form.almacenOrigenId" class="q-mb-md">
          Seleccione el almacén de origen para ver los suministros con stock disponible.
        </AppNotice>

        <ol class="item-list">
          <li v-for="(item, index) in items" :key="item.key" class="item-row">
            <span class="item-row__number u-num" aria-hidden="true">{{ index + 1 }}</span>
            <div class="item-row__fields" :class="{ 'item-row__fields--lote': requiereLote(item) }">
              <q-select
                v-model="item.suministroId"
                :options="opcionesSuministro"
                :label="`Suministro ${index + 1}`"
                emit-value
                map-options
                outlined
                dense
                options-dense
                :disable="tipo !== 'ingreso' && !form.almacenOrigenId"
                :rules="[rules.required('Seleccione el suministro.')]"
                @update:model-value="onSuministroChange(item)"
              />
              <q-input
                v-model.number="item.cantidad"
                type="number"
                min="0"
                step="any"
                label="Cantidad"
                outlined
                dense
                :suffix="unidadDe(item.suministroId)"
                :hint="hintDisponible(item)"
                :rules="[rules.required('Ingrese la cantidad.'), cantidadValida(item)]"
              />
              <template v-if="requiereLote(item)">
                <q-input
                  v-model="item.numeroLote"
                  label="N.° de lote"
                  outlined
                  dense
                  :rules="[rules.required('Ingrese el número de lote.')]"
                />
                <DateField v-model="item.fechaVencimiento" :for-id="`${ids.items}-${item.key}`" label="Vencimiento" required />
              </template>
            </div>
            <q-btn
              flat
              round
              dense
              icon="delete"
              color="negative"
              class="item-row__remove"
              :aria-label="`Quitar suministro ${index + 1}`"
              :disable="items.length === 1"
              @click="items.splice(index, 1)"
            />
          </li>
        </ol>
        <AppButton variant="outline" icon="add" label="Agregar suministro" @click="addItem()" />
      </section>
    </q-form>

    <template #actions>
      <AppButton variant="outline" label="Cancelar" :disable="loading" @click="open = false" />
      <AppButton :icon="ICONO[tipo]" :label="TITULO[tipo]" :loading="loading" @click="save" />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
// Registro de ingresos, salidas y transferencias con varios suministros (RN-S3 a RN-S5)
import { computed, reactive, ref, useId, watch } from 'vue';
import type { QForm } from 'quasar';
import AppDialog from 'src/components/AppDialog.vue';
import AppButton from 'src/components/AppButton.vue';
import AppNotice from 'src/components/AppNotice.vue';
import FormField from 'src/components/FormField.vue';
import DateField from 'src/components/DateField.vue';
import SectionHeader from 'src/components/SectionHeader.vue';
import { useAsyncTask } from 'src/composables/useAsyncTask';
import { optionsFromList, rules } from 'src/core/utils/options';
import { fieldIds } from 'src/core/utils/object';
import { formatNumber, todayIso } from 'src/core/utils/format';
import { opcionesAlmacenes } from 'src/modules/establecimientos/services/establecimientos.service';
import { obtenerSuministro, suministrosActivos } from 'src/modules/suministros/services/suministros.service';
import { registrarMovimiento, stockDisponible } from 'src/modules/suministros/services/stock.service';
import {
  MOTIVOS_MOVIMIENTO,
  TIPO_MOVIMIENTO_LABEL,
  type Movimiento,
  type MovimientoInput,
  type MovimientoPreset,
  type TipoMovimientoRegistrable,
} from 'src/modules/suministros/types';

interface ItemDraft {
  key: number;
  suministroId: string | null;
  cantidad: number | null;
  numeroLote: string;
  fechaVencimiento: string | null;
}

const props = defineProps<{ tipo: TipoMovimientoRegistrable; preset?: MovimientoPreset | null | undefined }>();
const emit = defineEmits<{ saved: [movimiento: Movimiento] }>();
const open = defineModel<boolean>({ required: true });

const TITULO: Record<TipoMovimientoRegistrable, string> = {
  ingreso: 'Registrar ingreso',
  salida: 'Registrar salida',
  transferencia: 'Registrar transferencia',
};
const SUBTITULO: Record<TipoMovimientoRegistrable, string> = {
  ingreso: 'Entrada de suministros a un almacén por compra, donación o distribución.',
  salida: 'Salida de suministros por consumo, merma, deterioro o vencimiento.',
  transferencia: 'Traslado de suministros entre almacenes; se conservan lote y vencimiento.',
};
const ICONO: Record<TipoMovimientoRegistrable, string> = { ingreso: 'input', salida: 'output', transferencia: 'swap_horiz' };
const PLACEHOLDER_DOCUMENTO: Record<TipoMovimientoRegistrable, string> = {
  ingreso: 'Ej.: Guía de remisión N.° 001-000123',
  salida: 'Ej.: Nota de salida N.° 0045-2026',
  transferencia: 'Ej.: Guía de remisión N.° 002-000045',
};

const ids = fieldIds(useId(), ['fecha', 'origen', 'destino', 'motivo', 'documento', 'observaciones', 'items'] as const);
const hoy = todayIso();
const formRef = ref<QForm | null>(null);
const { loading, run } = useAsyncTask();

const form = reactive<{
  fecha: string | null;
  almacenOrigenId: string | null;
  almacenDestinoId: string | null;
  motivo: string;
  documento: string;
  observaciones: string;
}>({
  fecha: hoy,
  almacenOrigenId: null,
  almacenDestinoId: null,
  motivo: '',
  documento: '',
  observaciones: '',
});
const items = ref<ItemDraft[]>([]);
let nextKey = 1;

const almacenes = computed(() => opcionesAlmacenes());
const almacenesDestino = computed(() => almacenes.value.filter((opcion) => opcion.value !== form.almacenOrigenId));
const motivos = computed(() => optionsFromList(MOTIVOS_MOVIMIENTO[props.tipo]));
const esSalidaPorVencimiento = computed(() => props.tipo === 'salida' && form.motivo === 'Vencimiento');
const motivoStock = computed(() => (props.tipo === 'salida' ? form.motivo : ''));

function disponible(suministroId: string | null): number {
  if (!suministroId || !form.almacenOrigenId) return 0;
  return stockDisponible(form.almacenOrigenId, suministroId, motivoStock.value);
}

const opcionesSuministro = computed(() => {
  const activos = suministrosActivos();
  if (props.tipo === 'ingreso') return activos.map((s) => ({ label: s.nombre, value: s.id }));
  return activos
    .map((s) => ({ suministro: s, cantidad: disponible(s.id) }))
    .filter(({ cantidad }) => cantidad > 0)
    .map(({ suministro, cantidad }) => ({
      label: `${suministro.nombre} (disp. ${formatNumber(cantidad)} ${suministro.unidad})`,
      value: suministro.id,
    }));
});

function unidadDe(suministroId: string | null): string {
  return obtenerSuministro(suministroId)?.unidad ?? '';
}

function requiereLote(item: ItemDraft): boolean {
  return props.tipo === 'ingreso' && Boolean(obtenerSuministro(item.suministroId)?.controlaVencimiento);
}

function hintDisponible(item: ItemDraft): string {
  if (props.tipo === 'ingreso' || !item.suministroId) return '';
  return `Disponible: ${formatNumber(disponible(item.suministroId))} ${unidadDe(item.suministroId)}`;
}

/** Valida contra el stock disponible restando lo ya pedido en otras líneas del mismo suministro. */
function cantidadValida(item: ItemDraft) {
  return (value: unknown): true | string => {
    const cantidad = Number(value);
    if (!Number.isFinite(cantidad) || cantidad <= 0) return 'Ingrese una cantidad mayor que cero.';
    if (props.tipo === 'ingreso' || !item.suministroId) return true;
    const otras = items.value
      .filter((otro) => otro.key !== item.key && otro.suministroId === item.suministroId)
      .reduce((total, otro) => total + (otro.cantidad ?? 0), 0);
    const libre = disponible(item.suministroId) - otras;
    return (
      cantidad <= libre ||
      `El stock disponible (${formatNumber(libre)}) es menor que la cantidad (${formatNumber(cantidad)}). Reduzca la cantidad o registre un ingreso.`
    );
  };
}

function addItem(suministroId: string | null = null): void {
  items.value.push({ key: nextKey++, suministroId, cantidad: null, numeroLote: '', fechaVencimiento: null });
}

function resetItems(): void {
  items.value = [];
  addItem();
}

function onSuministroChange(item: ItemDraft): void {
  item.numeroLote = '';
  item.fechaVencimiento = null;
}

watch(open, (isOpen) => {
  if (!isOpen) return;
  const almacenId = props.preset?.almacenId ?? null;
  Object.assign(form, {
    fecha: hoy,
    almacenOrigenId: props.tipo === 'ingreso' ? null : almacenId,
    almacenDestinoId: props.tipo === 'ingreso' ? almacenId : null,
    motivo: MOTIVOS_MOVIMIENTO[props.tipo][0] ?? '',
    documento: '',
    observaciones: '',
  });
  items.value = [];
  addItem(props.preset?.suministroId ?? null);
});

async function save(): Promise<void> {
  if (!(await formRef.value?.validate())) return;
  const input: MovimientoInput = {
    tipo: props.tipo,
    fecha: form.fecha ?? hoy,
    almacenOrigenId: props.tipo === 'ingreso' ? null : form.almacenOrigenId,
    almacenDestinoId: props.tipo === 'salida' ? null : form.almacenDestinoId,
    documento: form.documento,
    motivo: form.motivo,
    observaciones: form.observaciones,
    items: items.value.map((item) => ({
      suministroId: item.suministroId ?? '',
      cantidad: Number(item.cantidad),
      numeroLote: item.numeroLote.trim() || null,
      fechaVencimiento: item.fechaVencimiento,
    })),
  };
  const result = await run(
    () => registrarMovimiento(input),
    (movimiento) => `Se registró ${TIPO_MOVIMIENTO_LABEL[movimiento.tipo].toLowerCase()} ${movimiento.id}.`,
  );
  if (result.ok) {
    emit('saved', result.value);
    open.value = false;
  }
}
</script>

<style scoped lang="scss">
.item-list {
  list-style: none;
  margin: 0 0 var(--space-12);
  padding: 0;
  display: grid;
  gap: var(--space-10);
}

.item-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  gap: var(--space-8);
  align-items: start;
  padding: var(--space-12);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-box);
  background: var(--surface);
}

.item-row__number {
  padding-top: 10px;
  color: var(--ink-muted);
  font-weight: 700;
  text-align: center;
}

.item-row__fields {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: var(--space-8) var(--space-12);
}

.item-row__fields--lote {
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
}

.item-row__remove {
  margin-top: 4px;
}

@media (max-width: 1023.98px) {
  .item-row__fields--lote {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 599.98px) {
  .item-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .item-row__number {
    display: none;
  }

  .item-row__fields,
  .item-row__fields--lote {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
