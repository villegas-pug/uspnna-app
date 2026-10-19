<template>
  <div v-if="floating" class="us-fab-stack" role="toolbar" :aria-label="ariaLabel">
    <q-btn
      v-for="action in actions"
      :key="action.key"
      round
      class="us-fab"
      :class="`us-fab--${action.tone}`"
      :icon="action.icon"
      :aria-label="action.label"
      :loading="action.loading === true"
      :disable="action.disabled === true"
      @click="action.handler()"
    >
      <span class="sr-only">{{ action.label }}</span>
      <q-tooltip anchor="center left" self="center right">{{ action.label }}</q-tooltip>
    </q-btn>
  </div>
  <div v-else class="us-form-actions">
    <AppButton
      v-for="action in actions"
      :key="action.key"
      :variant="VARIANT[action.tone]"
      :icon="action.icon"
      :label="action.label"
      :loading="action.loading === true"
      :disable="action.disabled === true"
      @click="action.handler()"
    />
  </div>
</template>

<script setup lang="ts">
// Acciones principales de fichas y formularios largos: botones flotantes <1024px, botones con texto ≥1024px.
// La acción principal va al final (a la derecha).
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import AppButton from 'src/components/AppButton.vue';
import type { ButtonVariant, FloatingAction, FloatingTone } from 'src/components/types';

withDefaults(defineProps<{ actions: FloatingAction[]; ariaLabel?: string | undefined }>(), {
  ariaLabel: 'Acciones principales',
});

const VARIANT: Record<FloatingTone, ButtonVariant> = {
  primary: 'primary',
  secondary: 'secondary',
  neutral: 'outline',
};

const $q = useQuasar();
const floating = computed(() => $q.screen.lt.md);
</script>

<style scoped lang="scss">
.us-fab-stack {
  position: fixed;
  right: 12px;
  bottom: calc(88px + env(safe-area-inset-bottom));
  z-index: 1000;
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-8);
}

.us-fab {
  width: var(--fab);
  height: var(--fab);
  box-shadow: var(--shadow-fab);

  :deep(.q-icon) {
    font-size: 24px;
  }
}

.us-fab--primary {
  background: var(--primary);
  color: var(--on-primary);
}

.us-fab--secondary {
  background: var(--secondary);
  color: var(--on-primary);
}

.us-fab--neutral {
  background: var(--surface);
  color: #455a64;
}

.us-form-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-8);
  margin-top: var(--space-24);
  padding-top: var(--space-16);
  border-top: 1px solid var(--border-readonly);
}
</style>
