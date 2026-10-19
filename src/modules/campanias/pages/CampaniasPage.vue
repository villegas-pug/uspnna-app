<template>
  <PageContainer title="Campañas de inventario">
    <template #actions>
      <AppButton variant="outline" icon="refresh" label="Actualizar" :loading="loading" @click="refresh" />
      <AppButton icon="add" label="Nueva campaña" @click="openDialog(null)" />
    </template>

    <div class="us-card">
      <FilterBar :count="rows.length" :active="Boolean(estado)" @clear="estado = null">
        <q-select v-model="estado" :options="estados" label="Estado" emit-value map-options clearable outlined dense />
      </FilterBar>

      <DataTable
        :rows="rows"
        :columns="columns"
        row-key="id"
        :card-title="(row) => `${row.id} · ${row.nombre}`"
        :row-actions="actions"
        :loading="loading"
        :has-active-filters="Boolean(estado)"
        search-label="Buscar campañas"
        empty-icon="fact_check"
        empty-title="Aún no hay campañas"
        empty-text="Planifique la primera campaña de inventario."
        @clear-filters="estado = null"
      >
        <template #cell-id="{ row }">
          <router-link :to="`/campanias/${row.id}`" class="table-link u-num">{{ row.id }}</router-link>
        </template>
        <template #cell-avance="{ row }">
          <div class="avance">
            <q-linear-progress
              class="us-progress"
              :value="avanceCampania(row).porcentaje / 100"
              size="8px"
              color="accent"
              track-color="grey-3"
              :aria-label="`Avance ${Math.round(avanceCampania(row).porcentaje)} %`"
            />
            <span class="u-num">{{ Math.round(avanceCampania(row).porcentaje) }} %</span>
          </div>
        </template>
        <template #cell-estado="{ row }">
          <StatusChip domain="campania" :value="row.estado" />
        </template>
        <template #empty-action>
          <AppButton icon="add" label="Nueva campaña" @click="openDialog(null)" />
        </template>
      </DataTable>
    </div>

    <CampaniaFormDialog v-model="dialogOpen" :campania="editing" />
  </PageContainer>
</template>

<script setup lang="ts">
// Campañas de inventario: planificación, inicio, verificación y paso a conciliación
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import PageContainer from 'src/components/PageContainer.vue';
import AppButton from 'src/components/AppButton.vue';
import FilterBar from 'src/components/FilterBar.vue';
import DataTable from 'src/components/DataTable.vue';
import StatusChip from 'src/components/StatusChip.vue';
import CampaniaFormDialog from 'src/modules/campanias/components/CampaniaFormDialog.vue';
import { useCampaniaAcciones } from 'src/modules/campanias/composables/useCampaniaAcciones';
import { usePageLoader } from 'src/composables/usePageLoader';
import { optionsFrom } from 'src/core/utils/options';
import { formatDate } from 'src/core/utils/format';
import { avanceCampania, listarCampanias } from 'src/modules/campanias/services/campanias.service';
import {
  ESTADO_CAMPANIA_LABEL,
  TIPO_CAMPANIA_LABEL,
  type Campania,
  type EstadoCampania,
} from 'src/modules/campanias/types';
import type { ActionItem, DataColumn } from 'src/components/types';

const router = useRouter();
const { loading, refresh } = usePageLoader();
const acciones = useCampaniaAcciones();

const estados = optionsFrom(ESTADO_CAMPANIA_LABEL);
const estado = ref<EstadoCampania | null>(null);

const rows = computed(() => listarCampanias().filter((c) => !estado.value || c.estado === estado.value));

const columns: DataColumn<Campania>[] = [
  { name: 'id', label: 'Código', field: 'id', sortable: true, hideInCard: true },
  { name: 'nombre', label: 'Campaña', field: 'nombre', sortable: true, hideInCard: true, classes: 'u-wrap' },
  { name: 'tipo', label: 'Tipo', field: (row) => TIPO_CAMPANIA_LABEL[row.tipo], secondary: true },
  { name: 'cars', label: 'CAR', field: (row) => row.establecimientoIds.length, align: 'right', classes: 'u-num', secondary: true },
  { name: 'periodo', label: 'Periodo', field: (row) => `${formatDate(row.fechaInicio)} – ${formatDate(row.fechaFin)}`, classes: 'u-num' },
  { name: 'avance', label: 'Avance', field: (row) => avanceCampania(row).porcentaje, sortable: true },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center', sortable: true },
];

const dialogOpen = ref(false);
const editing = ref<Campania | null>(null);

function openDialog(campania: Campania | null): void {
  editing.value = campania;
  dialogOpen.value = true;
}

function actions(row: Campania): ActionItem[] {
  const planificada = row.estado === 'planificada';
  const lista: ActionItem[] = [
    { key: 'ver', label: 'Ver campaña', icon: 'visibility', tone: 'view', handler: () => void router.push(`/campanias/${row.id}`) },
  ];
  if (planificada) {
    lista.push(
      { key: 'editar', label: 'Editar campaña', icon: 'edit', tone: 'edit', handler: () => openDialog(row) },
      { key: 'iniciar', label: 'Iniciar campaña', icon: 'play_arrow', tone: 'success', handler: () => void acciones.iniciar(row) },
      { key: 'eliminar', label: 'Eliminar campaña', icon: 'delete', tone: 'danger', handler: () => void acciones.eliminar(row) },
    );
  }
  if (row.estado === 'en_curso') {
    lista.push(
      { key: 'verificar', label: 'Ir a la verificación', icon: 'fact_check', tone: 'move', handler: () => void router.push(`/campanias/${row.id}`) },
      { key: 'conciliar', label: 'Pasar a conciliación', icon: 'compare_arrows', tone: 'success', handler: () => void acciones.conciliar(row) },
    );
  }
  if (row.estado === 'en_conciliacion' || row.estado === 'cerrada') {
    lista.push({
      key: 'conciliacion',
      label: 'Ver conciliación',
      icon: 'compare_arrows',
      tone: 'move',
      handler: () => void router.push(`/conciliacion/${row.id}`),
    });
  }
  return lista;
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

.avance {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  min-width: 140px;

  .us-progress {
    flex: 1 1 auto;
  }
}
</style>
