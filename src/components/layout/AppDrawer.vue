<template>
  <q-drawer
    v-model="open"
    show-if-above
    bordered
    side="left"
    :width="300"
    :breakpoint="1023"
    class="us-drawer"
  >
    <nav id="menu-principal" aria-label="Menú principal" class="us-nav" :class="{ 'us-nav--touch': touch }">
      <q-list dense>
        <template v-for="node in MENU" :key="node.key">
          <q-item
            v-if="!node.children"
            :to="node.to"
            clickable
            class="us-nav__item"
            :class="{ 'us-nav__item--root': node.key === 'inicio' }"
            :active="activeKey === node.key"
            active-class="us-nav__item--active"
            :aria-current="activeKey === node.key ? 'page' : undefined"
          >
            <q-item-section avatar class="us-nav__icon">
              <q-icon :name="node.icon" size="24px" aria-hidden="true" />
            </q-item-section>
            <q-item-section>{{ node.label }}</q-item-section>
          </q-item>

          <q-expansion-item
            v-else
            :model-value="expanded[node.key] === true"
            @update:model-value="(value: boolean) => (expanded[node.key] = value)"
            dense
            :icon="node.icon"
            :label="node.label"
            class="us-nav__group"
            :header-class="['us-nav__group-header', { 'us-nav__group-header--open': expanded[node.key] === true }]"
            expand-icon-class="us-nav__chevron"
          >
            <q-item
              v-for="leaf in node.children"
              :key="leaf.key"
              :to="leaf.to"
              clickable
              class="us-nav__item us-nav__item--leaf"
              :active="activeKey === leaf.key"
              active-class="us-nav__item--active"
              :aria-current="activeKey === leaf.key ? 'page' : undefined"
            >
              <q-item-section avatar class="us-nav__icon">
                <q-icon :name="leaf.icon" size="20px" aria-hidden="true" />
              </q-item-section>
              <q-item-section>{{ leaf.label }}</q-item-section>
            </q-item>
          </q-expansion-item>
        </template>
      </q-list>
    </nav>
  </q-drawer>
</template>

<script setup lang="ts">
// Menú lateral: fijo ≥1024px; por debajo, overlay oculto al cargar que se cierra al navegar.
// El grupo que contiene la ruta actual se abre por defecto.
import { computed, reactive, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { MENU } from 'src/layouts/menu';

const open = defineModel<boolean>({ required: true });

const route = useRoute();
const $q = useQuasar();

const activeKey = computed(() => route.meta.menuKey ?? '');
const touch = computed(() => $q.screen.lt.md);

const expanded = reactive<Record<string, boolean>>(
  Object.fromEntries(MENU.filter((node) => node.children).map((node) => [node.key, false])),
);

function groupOf(key: string): string | undefined {
  return MENU.find((node) => node.children?.some((leaf) => leaf.key === key))?.key;
}

watch(
  activeKey,
  (key) => {
    const group = groupOf(key);
    if (group) expanded[group] = true;
  },
  { immediate: true },
);

// En overlay (<1024px) el menú se cierra al elegir una opción
watch(
  () => route.fullPath,
  () => {
    if ($q.screen.lt.md) open.value = false;
  },
);
</script>

<style scoped lang="scss">
.us-nav {
  padding: var(--space-8) 0;
}

.us-nav :deep(.q-item) {
  min-height: var(--drawer-item);
  padding: 2px 16px;
  margin: var(--space-4) 0;
  color: var(--drawer-ink);
  font-size: 14px;

  &:hover {
    color: var(--ink);
  }
}

.us-nav--touch :deep(.q-item) {
  min-height: var(--touch-target);
}

.us-nav :deep(.q-item__section--avatar) {
  min-width: 56px;
  padding-right: 0;
}

.us-nav__item--root {
  margin-bottom: var(--space-8) !important;
}

/* Subítems: sangría de 24 px respecto al grupo para que su icono no quede alineado con el del padre */
.us-nav :deep(.q-item.us-nav__item--leaf) {
  padding-left: 40px;
}

.us-nav :deep(.us-nav__group-header) {
  margin: 0;
}

.us-nav :deep(.us-nav__group-header--open) {
  background: var(--primary);
  color: var(--on-primary);

  &:hover {
    color: var(--on-primary);
  }

  .q-icon {
    color: var(--on-primary);
  }
}

.us-nav :deep(.us-nav__item--active) {
  position: relative;
  color: var(--inabif-red-title);
  font-weight: 700;

  .q-icon {
    color: var(--inabif-red);
  }

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--inabif-red);
    box-shadow: var(--shadow-active-bar);
  }
}
</style>
