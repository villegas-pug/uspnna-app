<template>
  <PageContainer title="Gestión de bienes patrimoniales" crumb="Registro de bienes">
    <template #actions>
      <AppButton variant="outline" icon="refresh" label="Actualizar" :loading="loading" @click="refresh" />
      <AppButton icon="add" label="Nuevo bien" to="/bienes/nuevo" />
    </template>

    <div class="us-card">
      <FilterBar :count="rows.length" :active="filtersActive" :more-active="moreActive" @clear="clearFilters">
        <q-select
          v-model="filters.car"
          :options="cars"
          label="Establecimiento (CAR)"
          emit-value
          map-options
          clearable
          outlined
          dense
          @update:model-value="filters.ambiente = null"
        />
        <q-select
          v-model="filters.ambiente"
          :options="ambientes"
          label="Ambiente"
          emit-value
          map-options
          clearable
          outlined
          dense
          :disable="!filters.car"
          :hint="filters.car ? undefined : 'Seleccione primero un CAR'"
        />
        <q-select
          v-model="filters.estado"
          :options="estados"
          label="Estado de conservación"
          emit-value
          map-options
          clearable
          outlined
          dense
        />
        <template #more>
          <q-select v-model="filters.categoria" :options="categorias" label="Categoría" emit-value map-options clearable outlined dense />
          <q-select v-model="filters.codigo" :options="codigos" label="Código patrimonial" emit-value map-options clearable outlined dense />
          <q-select v-model="filters.situacion" :options="situaciones" label="Situación" emit-value map-options outlined dense />
        </template>
      </FilterBar>

      <DataTable
        :rows="rows"
        :columns="columns"
        row-key="id"
        :card-title="(row) => `${row.id} · ${row.descripcion}`"
        :row-actions="actions"
        :loading="loading"
        :has-active-filters="filtersActive"
        :search-text="(row) => `${row.marca} ${row.modelo} ${row.serie} ${row.custodio}`"
        search-label="Buscar por ID, código, descripción, marca o serie"
        sticky-header
        empty-icon="inventory_2"
        empty-title="Aún no hay bienes registrados"
        empty-text="Registre el primer bien patrimonial del CAR."
        @clear-filters="clearFilters"
      >
        <template #cell-id="{ row }">
          <router-link :to="`/bienes/${row.id}`" class="table-link u-num">{{ row.id }}</router-link>
        </template>
        <template #cell-codigo="{ row }">
          <CodigoPatrimonial :codigo="row.codigoPatrimonial" />
        </template>
        <template #cell-estado="{ row }">
          <StatusChip domain="conservacion" :value="row.estadoConservacion" />
        </template>
        <template #cell-situacion="{ row }">
          <StatusChip domain="situacion" :value="row.situacion" />
        </template>
        <template #empty-action>
          <AppButton icon="add" label="Nuevo bien" to="/bienes/nuevo" />
        </template>
      </DataTable>
    </div>

    <TransferirBienDialog v-model="transferOpen" :bien="selected" />
    <BajaBienDialog v-model="bajaOpen" :bien="selected" />
  </PageContainer>
</template>

<script setup lang="ts">
// Registro de bienes patrimoniales con filtros por CAR, ambiente, estado, categoría, código y situación
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageContainer from 'src/components/PageContainer.vue';
import AppButton from 'src/components/AppButton.vue';
import FilterBar from 'src/components/FilterBar.vue';
import DataTable from 'src/components/DataTable.vue';
import StatusChip from 'src/components/StatusChip.vue';
import CodigoPatrimonial from 'src/components/CodigoPatrimonial.vue';
import TransferirBienDialog from 'src/modules/bienes/components/TransferirBienDialog.vue';
import BajaBienDialog from 'src/modules/bienes/components/BajaBienDialog.vue';
import { usePageLoader } from 'src/composables/usePageLoader';
import { optionsFrom } from 'src/core/utils/options';
import {
  nombreAmbiente,
  nombreEstablecimiento,
  opcionesAmbientes,
  opcionesEstablecimientos,
} from 'src/modules/establecimientos/services/establecimientos.service';
import { listarBienes } from 'src/modules/bienes/services/bienes.service';
import {
  CATEGORIA_BIEN_LABEL,
  ESTADO_CONSERVACION_LABEL,
  type BienPatrimonial,
  type CategoriaBien,
  type EstadoConservacion,
} from 'src/modules/bienes/types';
import type { ActionItem, DataColumn } from 'src/components/types';

type FiltroCodigo = 'con' | 'sin';
type FiltroSituacion = 'activo' | 'baja' | 'todos';

const route = useRoute();
const router = useRouter();
const { loading, refresh } = usePageLoader();

function queryText(key: string): string | null {
  const value = route.query[key];
  return typeof value === 'string' ? value : null;
}

const filters = reactive<{
  car: string | null;
  ambiente: string | null;
  estado: EstadoConservacion | null;
  categoria: CategoriaBien | null;
  codigo: FiltroCodigo | null;
  situacion: FiltroSituacion;
}>({
  car: queryText('establecimiento'),
  ambiente: queryText('ambiente'),
  estado: null,
  categoria: null,
  codigo: null,
  situacion: 'activo',
});

const cars = computed(() => opcionesEstablecimientos(false));
const ambientes = computed(() => opcionesAmbientes(filters.car));
const estados = optionsFrom(ESTADO_CONSERVACION_LABEL);
const categorias = optionsFrom(CATEGORIA_BIEN_LABEL);
const codigos = optionsFrom<FiltroCodigo>({ con: 'Con código patrimonial', sin: 'Sin código patrimonial' });
const situaciones = optionsFrom<FiltroSituacion>({ activo: 'Activos', baja: 'Dados de baja', todos: 'Todos' });

const moreActive = computed(() => Boolean(filters.categoria || filters.codigo || filters.situacion !== 'activo'));
const filtersActive = computed(() => Boolean(filters.car || filters.ambiente || filters.estado) || moreActive.value);

function clearFilters(): void {
  Object.assign(filters, { car: null, ambiente: null, estado: null, categoria: null, codigo: null, situacion: 'activo' });
}

const rows = computed(() =>
  listarBienes().filter(
    (bien) =>
      (filters.situacion === 'todos' || bien.situacion === filters.situacion) &&
      (!filters.car || bien.establecimientoId === filters.car) &&
      (!filters.ambiente || bien.ambienteId === filters.ambiente) &&
      (!filters.estado || bien.estadoConservacion === filters.estado) &&
      (!filters.categoria || bien.categoria === filters.categoria) &&
      (!filters.codigo || (filters.codigo === 'con') === Boolean(bien.codigoPatrimonial)),
  ),
);

const columns: DataColumn<BienPatrimonial>[] = [
  { name: 'id', label: 'ID interno', field: 'id', sortable: true, hideInCard: true },
  { name: 'codigo', label: 'Código patrimonial', field: (row) => row.codigoPatrimonial ?? 'Sin código patrimonial', sortable: true },
  { name: 'descripcion', label: 'Descripción', field: 'descripcion', sortable: true, hideInCard: true, classes: 'u-wrap' },
  { name: 'categoria', label: 'Categoría', field: (row) => CATEGORIA_BIEN_LABEL[row.categoria], secondary: true },
  { name: 'car', label: 'CAR', field: (row) => nombreEstablecimiento(row.establecimientoId), sortable: true, secondary: true },
  { name: 'ambiente', label: 'Ambiente', field: (row) => nombreAmbiente(row.ambienteId), sortable: true, secondary: true },
  { name: 'estado', label: 'Estado', field: 'estadoConservacion', align: 'center', sortable: true },
  { name: 'situacion', label: 'Situación', field: 'situacion', align: 'center', secondary: true },
];

const selected = ref<BienPatrimonial | null>(null);
const transferOpen = ref(false);
const bajaOpen = ref(false);

function actions(row: BienPatrimonial): ActionItem[] {
  const baja = row.situacion === 'baja';
  const motivo = 'El bien está dado de baja.';
  return [
    { key: 'ver', label: 'Ver bien', icon: 'visibility', tone: 'view', handler: () => void router.push(`/bienes/${row.id}`) },
    {
      key: 'editar',
      label: 'Editar bien',
      icon: 'edit',
      tone: 'edit',
      disabled: baja,
      disabledReason: motivo,
      handler: () => void router.push(`/bienes/${row.id}/editar`),
    },
    {
      key: 'transferir',
      label: 'Transferir bien',
      icon: 'swap_horiz',
      tone: 'move',
      disabled: baja,
      disabledReason: motivo,
      handler: () => {
        selected.value = row;
        transferOpen.value = true;
      },
    },
    {
      key: 'baja',
      label: 'Dar de baja',
      icon: 'delete',
      tone: 'danger',
      disabled: baja,
      disabledReason: motivo,
      handler: () => {
        selected.value = row;
        bajaOpen.value = true;
      },
    },
  ];
}
</script>

<style scoped lang="scss">
.table-link {
  color: var(--inabif-blue-bar);
  font-weight: 700;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}
</style>
