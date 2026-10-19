<template>
  <q-table
    v-model:pagination="pagination"
    class="us-table"
    :class="{ 'us-table--sticky': stickyHeader }"
    flat
    bordered
    dense
    wrap-cells
    :rows="rows"
    :columns="tableColumns"
    :row-key="rowKey"
    :filter="search"
    :filter-method="filterRows"
    :loading="loading"
    :grid="isGrid"
    card-container-class="us-record-list"
    :rows-per-page-options="[10, 20, 50, 0]"
    rows-per-page-label="Filas por página"
    :pagination-label="paginationLabel"
    :hide-top="!searchable && !$slots['top-left']"
  >
    <template v-if="$slots['top-left']" #top-left>
      <slot name="top-left" />
    </template>

    <template v-if="searchable" #top-right>
      <q-input
        v-model="search"
        class="data-table__search"
        dense
        outlined
        clearable
        debounce="300"
        placeholder="Buscar..."
        :aria-label="searchLabel"
      >
        <template #append>
          <q-icon name="search" aria-hidden="true" />
        </template>
      </q-input>
    </template>

    <template #body-cell="cell">
      <q-td :props="cell">
        <template v-if="cell.col.name === NUMBER_COLUMN">
          <span class="u-num">{{ rowNumber(cell.rowIndex + 1) }}</span>
        </template>
        <ActionMenu
          v-else-if="cell.col.name === ACTIONS_COLUMN"
          :actions="actionsFor(cell.row)"
          :label="`Acciones de ${cardTitle(cell.row)}`"
        />
        <slot v-else :name="`cell-${cell.col.name}`" :row="cell.row as T" :value="cell.value">
          {{ cell.value }}
        </slot>
      </q-td>
    </template>

    <template #item="card">
      <article class="us-record-card">
        <header class="us-record-card__head">
          <div class="us-record-card__heading">
            <span class="us-record-card__number u-num">N° {{ rowNumber(card.rowIndex + 1) }}</span>
            <h3 class="us-record-card__title">{{ cardTitle(card.row) }}</h3>
          </div>
          <ActionMenu
            v-if="rowActions"
            :actions="actionsFor(card.row)"
            :label="`Acciones de ${cardTitle(card.row)}`"
          />
        </header>
        <dl class="us-record-card__fields">
          <template v-for="column in cardColumns" :key="column.name">
            <dt>{{ column.label }}</dt>
            <dd>
              <slot :name="`cell-${column.name}`" :row="card.row as T" :value="rawValue(column, card.row)">
                {{ displayValue(column, card.row) }}
              </slot>
            </dd>
          </template>
        </dl>
      </article>
    </template>

    <template #no-data>
      <div class="full-width q-py-sm">
        <EmptyState
          v-if="search || hasActiveFilters"
          icon="search_off"
          title="Sin resultados"
          text="Ningún registro coincide con la búsqueda o los filtros aplicados."
        >
          <AppButton variant="outline" icon="filter_alt_off" label="Limpiar filtros" @click="clearAll" />
        </EmptyState>
        <EmptyState v-else :icon="emptyIcon" :title="emptyTitle ?? ''" :text="emptyText">
          <slot name="empty-action" />
        </EmptyState>
      </div>
    </template>

    <template #loading>
      <q-inner-loading showing color="primary" label="Cargando..." label-class="text-body2" />
    </template>
  </q-table>
</template>

<script setup lang="ts" generic="T extends object">
// Tabla de registros (QTable flat bordered dense): cabecera institucional, N° con ceros, columna ACCIONES,
// columnas secundarias ocultas en tablet y tarjetas (modo grid) por debajo de 600px con las mismas acciones.
import { computed, ref } from 'vue';
import { useQuasar, type QTableColumn } from 'quasar';
import ActionMenu from 'src/components/ActionMenu.vue';
import AppButton from 'src/components/AppButton.vue';
import EmptyState from 'src/components/EmptyState.vue';
import { matchesSearch, toText } from 'src/core/utils/format';
import { rowNumber } from 'src/core/utils/id';
import type { ActionItem, DataColumn } from 'src/components/types';

const NUMBER_COLUMN = '__numero';
const ACTIONS_COLUMN = '__acciones';

const props = withDefaults(
  defineProps<{
    rows: readonly T[];
    columns: DataColumn<T>[];
    rowKey: Extract<keyof T, string>;
    /** Título de la tarjeta móvil y nombre del registro en el menú de acciones. */
    cardTitle: (row: T) => string;
    rowActions?: ((row: T) => ActionItem[]) | undefined;
    loading?: boolean | undefined;
    searchable?: boolean | undefined;
    searchLabel?: string | undefined;
    /** Texto adicional en el que busca la caja "Buscar..." (además de las columnas). */
    searchText?: ((row: T) => string) | undefined;
    numbered?: boolean | undefined;
    stickyHeader?: boolean | undefined;
    rowsPerPage?: number | undefined;
    hasActiveFilters?: boolean | undefined;
    emptyIcon?: string | undefined;
    emptyTitle?: string | undefined;
    emptyText?: string | undefined;
  }>(),
  {
    loading: false,
    searchable: true,
    searchLabel: 'Buscar en la tabla',
    numbered: true,
    stickyHeader: false,
    rowsPerPage: 20,
    hasActiveFilters: false,
    emptyIcon: 'inventory',
    emptyTitle: 'Aún no hay registros',
    emptyText: 'Los registros aparecerán aquí cuando se agreguen.',
  },
);

const emit = defineEmits<{ clearFilters: [] }>();

defineSlots<
  {
    'top-left'?: () => unknown;
    'empty-action'?: () => unknown;
  } & {
    [key: `cell-${string}`]: (scope: { row: T; value: unknown }) => unknown;
  }
>();

const $q = useQuasar();
const search = ref('');
const pagination = ref({ page: 1, rowsPerPage: props.rowsPerPage, sortBy: null as string | null, descending: false });

const isGrid = computed(() => $q.screen.lt.sm);

function joinClasses(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

const tableColumns = computed<QTableColumn[]>(() => {
  const columns: QTableColumn[] = [];
  if (props.numbered) {
    columns.push({ name: NUMBER_COLUMN, label: 'N°', field: () => '', align: 'center', required: true, headerStyle: 'width: 72px; text-align: center' });
  }
  for (const column of props.columns) {
    const responsive = column.secondary ? 'gt-sm' : undefined;
    const mapped: QTableColumn = {
      name: column.name,
      label: column.label,
      field: column.field as NonNullable<QTableColumn['field']>,
      align: column.align ?? 'left',
      sortable: column.sortable ?? false,
      required: column.required ?? !column.secondary,
      classes: joinClasses(column.classes, responsive),
      headerClasses: joinClasses(responsive),
      headerStyle: 'text-align: center',
    };
    if (column.format) mapped.format = (value: unknown, row: T) => column.format?.(value, row) ?? '';
    if (column.sort) mapped.sort = column.sort;
    if (column.style) mapped.style = column.style;
    columns.push(mapped);
  }
  if (props.rowActions) {
    columns.push({ name: ACTIONS_COLUMN, label: 'Acciones', field: () => '', align: 'center', required: true, headerStyle: 'width: 96px; text-align: center' });
  }
  return columns;
});

const cardColumns = computed(() => props.columns.filter((column) => !column.hideInCard));

function rawValue(column: DataColumn<T>, row: T): unknown {
  return typeof column.field === 'function' ? column.field(row) : row[column.field];
}

function displayValue(column: DataColumn<T>, row: T): string {
  const value = rawValue(column, row);
  const formatted = column.format ? column.format(value, row) : value;
  return toText(formatted);
}

function actionsFor(row: T): ActionItem[] {
  return props.rowActions ? props.rowActions(row) : [];
}

// Búsqueda sin tildes ni mayúsculas sobre las columnas visibles y el texto adicional
function filterRows(rows: readonly T[], terms: string): readonly T[] {
  if (!terms) return rows;
  return rows.filter(
    (row) =>
      props.columns.some((column) => matchesSearch(terms, displayValue(column, row))) ||
      (props.searchText ? matchesSearch(terms, props.searchText(row)) : false),
  );
}

function paginationLabel(first: number, end: number, total: number): string {
  return `${first}-${end} de ${total}`;
}

function clearAll(): void {
  search.value = '';
  emit('clearFilters');
}
</script>

<style scoped lang="scss">
.data-table__search {
  width: 280px;
  max-width: 100%;
}

@media (max-width: 599.98px) {
  .data-table__search {
    width: 100%;
  }
}

.us-record-card {
  display: grid;
  gap: var(--space-6);
  min-width: 0;
  padding: var(--space-12);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-box);
  background: var(--surface);
}

.us-record-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-8);
}

.us-record-card__heading {
  min-width: 0;
}

.us-record-card__number {
  display: block;
  font-size: 0.75rem;
  color: var(--ink-muted);
}

.us-record-card__title {
  margin: 2px 0 0;
  font-size: 0.95rem;
  line-height: 1.35;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.us-record-card__fields {
  display: grid;
  grid-template-columns: minmax(96px, auto) minmax(0, 1fr);
  gap: 4px var(--space-12);
  margin: 0;
  font-size: 13px;
  line-height: 20px;

  dt {
    color: var(--ink-muted);
  }

  dd {
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;
  }
}
</style>
