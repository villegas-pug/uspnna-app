<template>
  <PageContainer title="Centros de Acogida Residencial">
    <template #actions>
      <AppButton variant="outline" icon="refresh" label="Actualizar" :loading="loading" @click="refresh" />
      <AppButton icon="add" label="Nuevo establecimiento" @click="openCreate" />
    </template>

    <div class="us-card">
      <FilterBar :count="rows.length" :active="filtersActive" @clear="clearFilters">
        <q-select
          v-model="filters.departamento"
          :options="departamentos"
          label="Departamento"
          emit-value
          map-options
          clearable
          outlined
          dense
        />
        <q-select
          v-model="filters.levantamiento"
          :options="levantamientos"
          label="Levantamiento"
          emit-value
          map-options
          clearable
          outlined
          dense
        />
        <q-select v-model="filters.estado" :options="estados" label="Estado" emit-value map-options clearable outlined dense />
      </FilterBar>

      <DataTable
        :rows="rows"
        :columns="columns"
        row-key="id"
        :card-title="(row) => row.nombre"
        :row-actions="actions"
        :loading="loading"
        :has-active-filters="filtersActive"
        search-label="Buscar establecimientos"
        empty-icon="home_work"
        empty-title="Aún no hay establecimientos"
        empty-text="Registre el primer Centro de Acogida Residencial (CAR)."
        @clear-filters="clearFilters"
      >
        <template #cell-nombre="{ row }">
          <router-link :to="`/establecimientos/${row.id}`" class="table-link">{{ row.nombre }}</router-link>
        </template>
        <template #cell-levantamiento="{ row }">
          <StatusChip domain="levantamiento" :value="row.estadoLevantamiento" />
        </template>
        <template #cell-estado="{ row }">
          <StatusChip domain="registro" :value="row.estado" />
        </template>
        <template #empty-action>
          <AppButton icon="add" label="Nuevo establecimiento" @click="openCreate" />
        </template>
      </DataTable>
    </div>

    <EstablecimientoFormDialog v-model="dialogOpen" :establecimiento="editing" />
  </PageContainer>
</template>

<script setup lang="ts">
// Listado de Centros de Acogida Residencial (CAR) con su estado de levantamiento
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import PageContainer from 'src/components/PageContainer.vue';
import AppButton from 'src/components/AppButton.vue';
import FilterBar from 'src/components/FilterBar.vue';
import DataTable from 'src/components/DataTable.vue';
import StatusChip from 'src/components/StatusChip.vue';
import EstablecimientoFormDialog from 'src/modules/establecimientos/components/EstablecimientoFormDialog.vue';
import { usePageLoader } from 'src/composables/usePageLoader';
import { useAsyncTask } from 'src/composables/useAsyncTask';
import { useConfirm } from 'src/composables/useConfirm';
import { optionsFrom, optionsFromList } from 'src/core/utils/options';
import { ESTADO_REGISTRO_LABEL, type EstadoRegistro } from 'src/core/types/common';
import {
  cambiarEstadoEstablecimiento,
  contarBienesActivos,
  listarEstablecimientos,
} from 'src/modules/establecimientos/services/establecimientos.service';
import {
  DEPARTAMENTOS,
  ESTADO_LEVANTAMIENTO_LABEL,
  type Establecimiento,
  type EstadoLevantamiento,
} from 'src/modules/establecimientos/types';
import type { ActionItem, DataColumn } from 'src/components/types';

const router = useRouter();
const { loading, refresh } = usePageLoader();
const { run } = useAsyncTask();
const { confirm } = useConfirm();

const departamentos = optionsFromList(DEPARTAMENTOS);
const levantamientos = optionsFrom(ESTADO_LEVANTAMIENTO_LABEL);
const estados = optionsFrom(ESTADO_REGISTRO_LABEL);

const filters = reactive<{
  departamento: string | null;
  levantamiento: EstadoLevantamiento | null;
  estado: EstadoRegistro | null;
}>({ departamento: null, levantamiento: null, estado: null });

const filtersActive = computed(() => Boolean(filters.departamento || filters.levantamiento || filters.estado));

function clearFilters(): void {
  Object.assign(filters, { departamento: null, levantamiento: null, estado: null });
}

const rows = computed(() =>
  listarEstablecimientos().filter(
    (car) =>
      (!filters.departamento || car.departamento === filters.departamento) &&
      (!filters.levantamiento || car.estadoLevantamiento === filters.levantamiento) &&
      (!filters.estado || car.estado === filters.estado),
  ),
);

const columns: DataColumn<Establecimiento>[] = [
  { name: 'id', label: 'Código', field: 'id', sortable: true, classes: 'u-num' },
  { name: 'nombre', label: 'Nombre', field: 'nombre', sortable: true, hideInCard: true },
  {
    name: 'ubicacion',
    label: 'Ubicación',
    field: (row) => `${row.distrito}, ${row.provincia} – ${row.departamento}`,
    secondary: true,
  },
  { name: 'capacidad', label: 'Capacidad', field: 'capacidad', align: 'right', sortable: true, secondary: true, classes: 'u-num' },
  { name: 'bienes', label: 'Bienes', field: (row) => contarBienesActivos({ establecimientoId: row.id }), align: 'right', sortable: true, classes: 'u-num' },
  { name: 'levantamiento', label: 'Levantamiento', field: 'estadoLevantamiento', align: 'center', sortable: true },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center', secondary: true },
];

const dialogOpen = ref(false);
const editing = ref<Establecimiento | null>(null);

function openCreate(): void {
  editing.value = null;
  dialogOpen.value = true;
}

function actions(row: Establecimiento): ActionItem[] {
  const activo = row.estado === 'activo';
  return [
    { key: 'ver', label: 'Ver establecimiento', icon: 'visibility', tone: 'view', handler: () => void router.push(`/establecimientos/${row.id}`) },
    {
      key: 'editar',
      label: 'Editar establecimiento',
      icon: 'edit',
      tone: 'edit',
      handler: () => {
        editing.value = row;
        dialogOpen.value = true;
      },
    },
    {
      key: 'bienes',
      label: 'Ver bienes del CAR',
      icon: 'inventory_2',
      tone: 'move',
      handler: () => void router.push({ path: '/bienes', query: { establecimiento: row.id } }),
    },
    {
      key: 'estado',
      label: activo ? 'Desactivar establecimiento' : 'Activar establecimiento',
      icon: activo ? 'block' : 'check_circle',
      tone: activo ? 'danger' : 'success',
      handler: () => void toggleEstado(row),
    },
  ];
}

async function toggleEstado(row: Establecimiento): Promise<void> {
  const nuevo: EstadoRegistro = row.estado === 'activo' ? 'inactivo' : 'activo';
  const ok = await confirm({
    title: nuevo === 'inactivo' ? 'Desactivar establecimiento' : 'Activar establecimiento',
    message:
      nuevo === 'inactivo'
        ? `${row.nombre} dejará de aparecer en los formularios. Sus bienes, almacenes e historial se conservan.`
        : `${row.nombre} volverá a estar disponible en los formularios.`,
    confirmLabel: nuevo === 'inactivo' ? 'Desactivar' : 'Activar',
    tone: nuevo === 'inactivo' ? 'negative' : 'primary',
  });
  if (ok) {
    await run(
      () => cambiarEstadoEstablecimiento(row.id, nuevo),
      `${row.nombre} quedó ${nuevo === 'activo' ? 'activo' : 'inactivo'}.`,
    );
  }
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
