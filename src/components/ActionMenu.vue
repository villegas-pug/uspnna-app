<template>
  <q-btn
    class="us-row-action"
    unelevated
    dense
    color="primary"
    icon="settings"
    :aria-label="label"
    :disable="actions.length === 0"
  >
    <q-tooltip>{{ label }}</q-tooltip>
    <q-menu class="us-menu" anchor="bottom right" self="top right" auto-close @show="focusFirst">
      <q-list ref="listRef" role="menu" :aria-label="label" @keydown="onKeydown">
        <q-item
          v-for="action in actions"
          :key="action.key"
          clickable
          role="menuitem"
          class="us-menu-item"
          :class="{ 'us-menu-item--danger': action.tone === 'danger' }"
          :disable="action.disabled === true"
          @click="action.handler()"
        >
          <q-item-section avatar class="us-menu-item__avatar-section">
            <span class="us-menu-avatar" :class="`us-menu-avatar--${action.tone}`" aria-hidden="true">
              <q-icon :name="action.icon" size="18px" />
            </span>
          </q-item-section>
          <q-item-section>
            <q-item-label class="us-menu-item__label">{{ action.label }}</q-item-label>
            <q-item-label v-if="action.disabled && action.disabledReason" caption class="us-menu-item__reason">
              {{ action.disabledReason }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>
</template>

<script setup lang="ts">
// Menú de acciones por registro (QBtn settings + QMenu). Flechas para recorrer, Esc cierra y devuelve el foco.
import { ref } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import type { ActionItem } from 'src/components/types';

defineProps<{
  actions: ActionItem[];
  /** Nombra el registro: "Acciones de BP-000127". */
  label: string;
}>();

const listRef = ref<ComponentPublicInstance | null>(null);

function items(): HTMLElement[] {
  const root = listRef.value?.$el as HTMLElement | undefined;
  return root ? Array.from(root.querySelectorAll<HTMLElement>('.q-item:not(.disabled)')) : [];
}

function focusFirst(): void {
  items()[0]?.focus();
}

function onKeydown(event: KeyboardEvent): void {
  const list = items();
  if (list.length === 0) return;
  const current = list.indexOf(document.activeElement as HTMLElement);
  let next: number | null = null;
  if (event.key === 'ArrowDown') next = (current + 1) % list.length;
  if (event.key === 'ArrowUp') next = (current - 1 + list.length) % list.length;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = list.length - 1;
  if (next !== null) {
    event.preventDefault();
    list[next]?.focus();
  }
}
</script>

<style scoped lang="scss">
.us-row-action {
  width: var(--row-action);
  height: var(--row-action);
  min-height: var(--row-action);
  padding: 0;
  border-radius: var(--radius-btn);
}

@media (max-width: 599.98px) {
  .us-row-action {
    width: var(--touch-target);
    height: var(--touch-target);
    min-height: var(--touch-target);
  }
}

.us-menu-item {
  min-height: var(--menu-item-height);
  padding: var(--space-6) var(--space-10);
  color: var(--ink-dialog);

  &:hover {
    background: var(--menu-item-hover);
  }
}

.us-menu-item__avatar-section {
  min-width: 44px;
}

.us-menu-item__label {
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.us-menu-item__reason {
  color: var(--ink-muted);
}

.us-menu-item--danger {
  color: var(--status-danger-ink);

  &:hover {
    background: var(--menu-item-danger-hover);
  }
}

.us-menu-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.us-menu-avatar--view {
  background: var(--kpi-blue-tint);
  color: var(--inabif-blue);
}

.us-menu-avatar--edit {
  background: var(--notice-bg);
  color: var(--notice-ink);
}

.us-menu-avatar--move {
  background: var(--kpi-purple-tint);
  color: var(--status-extra-ink);
}

.us-menu-avatar--success {
  background: var(--kpi-green-tint);
  color: var(--status-success-ink);
}

.us-menu-avatar--neutral {
  background: var(--status-neutral-bg);
  color: var(--drawer-ink);
}

.us-menu-avatar--danger {
  background: var(--kpi-red-tint);
  color: var(--status-danger-ink);
}
</style>
