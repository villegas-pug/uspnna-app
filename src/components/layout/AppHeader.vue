<template>
  <q-header class="us-header">
    <q-toolbar>
      <q-btn
        flat
        round
        dense
        icon="menu"
        class="us-header__menu"
        :aria-label="menuOpen ? 'Cerrar menú' : 'Abrir menú'"
        :aria-expanded="menuOpen ? 'true' : 'false'"
        aria-controls="menu-principal"
        @click="emit('toggleMenu')"
      />
      <router-link v-if="$q.screen.gt.xs" to="/inicio" class="us-header__home" aria-label="Ir al inicio">
        <AppLogo :size="$q.screen.gt.sm ? 'lg' : 'md'" />
      </router-link>
      <div class="us-header__identity">
        <span class="us-header__name">{{ systemName }}</span>
        <span class="us-header__unit">{{ unit }}</span>
      </div>
    </q-toolbar>
  </q-header>
</template>

<script setup lang="ts">
// Barra superior: botón de menú, logo (oculto <600px) y, a la derecha, nombre del sistema y unidad.
// Sin autenticación: donde SISEC muestra el usuario va el nombre del sistema.
import AppLogo from 'src/components/layout/AppLogo.vue';

withDefaults(defineProps<{ menuOpen: boolean; systemName?: string | undefined; unit?: string | undefined }>(), {
  systemName: 'Sistema Integral de Gestión de Inventarios',
  unit: 'USPNNA – INABIF',
});

const emit = defineEmits<{ toggleMenu: [] }>();
</script>

<style scoped lang="scss">
.us-header__menu {
  flex: 0 0 auto;
  width: var(--touch-target);
  height: var(--touch-target);
  color: var(--toolbar-icon);

  :deep(.q-icon) {
    font-size: 24px;
  }
}

.us-header__home {
  display: flex;
  min-width: 0;
  flex: 0 1 auto;
  border-radius: var(--radius-field);
}

.us-header__identity {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
}

.us-header__name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink-strong);
  font-size: 0.92rem;
  line-height: 1.2;
  font-weight: 700;
}

.us-header__unit {
  margin-top: 2px;
  color: var(--ink);
  font-size: 0.78rem;
  line-height: 1.2;
  text-transform: uppercase;
}

@media (max-width: 1023.98px) {
  .us-header__name {
    font-size: 0.88rem;
  }

  .us-header__unit {
    font-size: 0.74rem;
  }
}

@media (max-width: 599.98px) {
  .us-header__name {
    font-size: 0.82rem;
  }

  .us-header__unit {
    font-size: 0.7rem;
  }
}
</style>
