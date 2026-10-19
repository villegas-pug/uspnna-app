<template>
  <PageContainer title="Ambientes">
    <template #actions>
      <AppButton variant="outline" icon="refresh" label="Actualizar" :loading="loading" @click="refresh" />
      <AppButton icon="add" label="Nuevo ambiente" @click="tableRef?.openCreate()" />
    </template>

    <div class="us-card">
      <FilterBar :active="filtersActive" @clear="clearFilters">
        <q-select v-model="filters.car" :options="cars" label="Establecimiento (CAR)" emit-value map-options clearable outlined dense />
        <q-select v-model="filters.tipo" :options="tipos" label="Tipo de ambiente" emit-value map-options clearable outlined dense />
      </FilterBar>
      <AmbientesTable
        ref="tableRef"
        :establecimiento-id="filters.car"
        :tipo="filters.tipo"
        :loading="loading"
        :has-active-filters="filtersActive"
        @clear-filters="clearFilters"
      />
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
// Ambientes de todos los CAR, filtrables por establecimiento y tipo
import { computed, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import PageContainer from 'src/components/PageContainer.vue';
import AppButton from 'src/components/AppButton.vue';
import FilterBar from 'src/components/FilterBar.vue';
import AmbientesTable from 'src/modules/establecimientos/components/AmbientesTable.vue';
import { usePageLoader } from 'src/composables/usePageLoader';
import { optionsFrom } from 'src/core/utils/options';
import { opcionesEstablecimientos } from 'src/modules/establecimientos/services/establecimientos.service';
import { TIPO_AMBIENTE_LABEL, type TipoAmbiente } from 'src/modules/establecimientos/types';

const route = useRoute();
const { loading, refresh } = usePageLoader();
const tableRef = ref<InstanceType<typeof AmbientesTable> | null>(null);

const cars = computed(() => opcionesEstablecimientos(false));
const tipos = optionsFrom(TIPO_AMBIENTE_LABEL);

const filters = reactive<{ car: string | null; tipo: TipoAmbiente | null }>({
  car: typeof route.query.establecimiento === 'string' ? route.query.establecimiento : null,
  tipo: null,
});

const filtersActive = computed(() => Boolean(filters.car || filters.tipo));

function clearFilters(): void {
  filters.car = null;
  filters.tipo = null;
}
</script>
