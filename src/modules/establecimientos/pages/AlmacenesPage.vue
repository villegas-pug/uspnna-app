<template>
  <PageContainer title="Almacenes">
    <template #actions>
      <AppButton variant="outline" icon="refresh" label="Actualizar" :loading="loading" @click="refresh" />
      <AppButton icon="add" label="Nuevo almacén" @click="tableRef?.openCreate()" />
    </template>

    <div class="us-card">
      <FilterBar :active="Boolean(car)" @clear="car = null">
        <q-select v-model="car" :options="cars" label="Establecimiento (CAR)" emit-value map-options clearable outlined dense />
      </FilterBar>
      <AlmacenesTable
        ref="tableRef"
        :establecimiento-id="car"
        :loading="loading"
        :has-active-filters="Boolean(car)"
        @clear-filters="car = null"
      />
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
// Almacenes de todos los CAR
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import PageContainer from 'src/components/PageContainer.vue';
import AppButton from 'src/components/AppButton.vue';
import FilterBar from 'src/components/FilterBar.vue';
import AlmacenesTable from 'src/modules/establecimientos/components/AlmacenesTable.vue';
import { usePageLoader } from 'src/composables/usePageLoader';
import { opcionesEstablecimientos } from 'src/modules/establecimientos/services/establecimientos.service';

const route = useRoute();
const { loading, refresh } = usePageLoader();
const tableRef = ref<InstanceType<typeof AlmacenesTable> | null>(null);

const cars = computed(() => opcionesEstablecimientos(false));
const car = ref<string | null>(typeof route.query.establecimiento === 'string' ? route.query.establecimiento : null);
</script>
