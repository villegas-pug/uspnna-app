<template>
  <PageContainer title="Inicio" hide-breadcrumbs>
    <template #title>
      <PageTitle variant="home" text="Sistema Integral de Gestión de Inventarios" accent="USPNNA" />
    </template>

    <div class="us-stack us-stack--lg">
      <section class="kpi-panel" aria-label="Indicadores principales">
        <KpiCard
          icon="home_work"
          tone="blue"
          :value="kpi.establecimientos"
          label="Establecimientos CAR"
          :hint="`${kpi.carCompletados} con levantamiento completado`"
          to="/establecimientos"
        />
        <KpiCard
          icon="inventory_2"
          tone="red"
          :value="kpi.bienes"
          label="Bienes patrimoniales"
          :hint="`${kpi.sinCodigo} sin código patrimonial`"
          to="/bienes"
        />
        <KpiCard
          icon="warehouse"
          tone="green"
          :value="kpi.suministros"
          label="Suministros registrados"
          :hint="`${kpi.alertas.bajoMinimo + kpi.alertas.agotados} con stock bajo el mínimo`"
          to="/suministros/stock"
        />
        <KpiCard
          icon="fact_check"
          tone="purple"
          :value="kpi.campaniasActivas"
          label="Campañas activas"
          :hint="`${kpi.campaniasEnCurso} en verificación física`"
          to="/campanias"
        />
        <KpiCard
          icon="task_alt"
          tone="green"
          :value="`${kpi.carCompletados} / ${kpi.establecimientos}`"
          label="Inventarios completados"
          :hint="`${kpi.carCompletados} de ${kpi.establecimientos} CAR verificados`"
        />
        <KpiCard
          icon="compare_arrows"
          tone="red"
          :value="kpi.diferencias"
          label="Diferencias encontradas"
          hint="En campañas abiertas"
          to="/conciliacion"
        />
        <KpiCard
          icon="pending_actions"
          tone="blue"
          :value="kpi.porRegularizar"
          label="Observaciones pendientes"
          hint="Resultados por regularizar"
          to="/conciliacion"
        />
      </section>

      <AppNotice v-if="alertCount > 0">
        Hay {{ kpi.alertas.agotados }} suministros agotados, {{ kpi.alertas.bajoMinimo }} bajo el mínimo,
        {{ kpi.alertas.porVencer }} lotes por vencer en los próximos 30 días y {{ kpi.alertas.vencidos }} lotes vencidos con stock.
        <router-link to="/suministros/lotes" class="notice-link">Revisar lotes y vencimientos</router-link>
      </AppNotice>

      <div class="chart-grid">
        <ChartCard title="Bienes por estado de conservación" subtitle="Bienes activos de todos los CAR">
          <BarChart :data="porEstado" label="Bienes por estado de conservación" show-share />
        </ChartCard>

        <ChartCard title="Bienes por establecimiento" subtitle="Seleccione un CAR para ver sus bienes">
          <BarChart :data="porCar" label="Bienes activos por CAR" />
        </ChartCard>

        <ChartCard title="Avance del levantamiento inicial" subtitle="Unidades (ambientes y almacenes) verificadas por CAR">
          <ul class="progress-list">
            <li v-for="car in avance" :key="car.id" class="progress-list__row">
              <div class="progress-list__head">
                <router-link :to="`/establecimientos/${car.id}`" class="progress-list__name">{{ car.nombre }}</router-link>
                <StatusChip domain="levantamiento" :value="car.estado" />
              </div>
              <q-linear-progress
                class="us-progress"
                :value="car.porcentaje / 100"
                size="10px"
                color="accent"
                track-color="grey-3"
                :aria-label="`Avance de ${car.nombre}: ${car.porcentaje} %`"
              />
              <div class="u-hint">{{ car.porcentaje }} % · {{ car.detalle }}</div>
            </li>
          </ul>
        </ChartCard>

        <ChartCard
          v-if="conciliacion"
          title="Resultados de conciliación"
          :subtitle="`${conciliacion.id} · ${conciliacion.nombre}`"
        >
          <BarChart :data="resultados" label="Resultados de la última conciliación" show-share />
          <template #actions>
            <AppButton variant="flat" icon="visibility" label="Ver" :to="`/conciliacion/${conciliacion.id}`" />
          </template>
        </ChartCard>

        <ChartCard title="Alertas de stock" subtitle="Suministros que requieren reposición o salida por vencimiento">
          <ul v-if="alertas.length > 0" class="alert-list">
            <li v-for="fila in alertas" :key="fila.key" class="alert-list__row">
              <div class="alert-list__main">
                <span class="alert-list__name">{{ fila.suministro.nombre }}</span>
                <span class="u-hint">{{ nombreAlmacen(fila.almacenId) }}</span>
              </div>
              <div class="alert-list__chips">
                <StatusChip
                  v-if="fila.estado !== 'normal'"
                  domain="stock"
                  :value="fila.estado"
                  :label="`${statusDescriptor('stock', fila.estado).label}: ${formatQuantity(fila.cantidad, fila.suministro.unidad)}`"
                />
                <StatusChip
                  v-if="fila.estadoVencimiento === 'vencido' || fila.estadoVencimiento === 'por_vencer'"
                  domain="vencimiento"
                  :value="fila.estadoVencimiento"
                  :label="`${statusDescriptor('vencimiento', fila.estadoVencimiento).label}: ${formatDate(fila.proximoVencimiento)}`"
                />
              </div>
            </li>
          </ul>
          <EmptyState v-else icon="task_alt" title="Sin alertas" text="Todos los suministros están sobre el mínimo y vigentes." />
          <template #actions>
            <AppButton variant="flat" icon="warehouse" label="Stock" to="/suministros/stock" />
          </template>
        </ChartCard>
      </div>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
// Inicio: indicadores (KPI) y gráficos responsivos del inventario
import { computed } from 'vue';
import PageContainer from 'src/components/PageContainer.vue';
import PageTitle from 'src/components/PageTitle.vue';
import KpiCard from 'src/components/KpiCard.vue';
import AppNotice from 'src/components/AppNotice.vue';
import AppButton from 'src/components/AppButton.vue';
import StatusChip from 'src/components/StatusChip.vue';
import EmptyState from 'src/components/EmptyState.vue';
import ChartCard from 'src/components/charts/ChartCard.vue';
import BarChart from 'src/components/charts/BarChart.vue';
import { statusDescriptor } from 'src/composables/useStatusTone';
import { formatDate, formatQuantity } from 'src/core/utils/format';
import { nombreAlmacen } from 'src/modules/establecimientos/services/establecimientos.service';
import {
  alertasStock,
  avanceLevantamiento,
  bienesPorCar,
  bienesPorEstado,
  indicadores,
  ultimaConciliacion,
} from 'src/modules/dashboard/services/dashboard.service';
import { resultadosPorTipo } from 'src/modules/conciliacion/services/conciliacion.service';

const kpi = computed(() => indicadores());
const alertCount = computed(() => {
  const a = kpi.value.alertas;
  return a.agotados + a.bajoMinimo + a.porVencer + a.vencidos;
});
const porEstado = computed(() => bienesPorEstado());
const porCar = computed(() => bienesPorCar());
const avance = computed(() => avanceLevantamiento());
const conciliacion = computed(() => ultimaConciliacion());
const resultados = computed(() => (conciliacion.value ? resultadosPorTipo(conciliacion.value.id) : []));
const alertas = computed(() => alertasStock());
</script>

<style scoped lang="scss">
.kpi-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: var(--space-16);
  padding: var(--space-20);
  border: 1px solid var(--border-panel);
  border-radius: var(--radius-panel);
  background: var(--surface);
}

@media (max-width: 599.98px) {
  .kpi-panel {
    padding: var(--space-12);
  }
}

.notice-link {
  margin-left: var(--space-4);
  color: inherit;
  font-weight: 700;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
  gap: var(--space-16);
}

.progress-list,
.alert-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-12);
}

.progress-list__head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-8);
  margin-bottom: var(--space-6);
}

.progress-list__name {
  color: var(--ink);
  font-weight: 700;
  text-decoration: none;

  &:hover {
    color: var(--inabif-blue-bar);
    text-decoration: underline;
  }
}

.progress-list__row .u-hint {
  margin-top: var(--space-4);
}

.alert-list__row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-8);
  padding-bottom: var(--space-10);
  border-bottom: 1px solid var(--border-soft);

  &:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }
}

.alert-list__main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.alert-list__name {
  font-weight: 700;
}

.alert-list__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
}
</style>
