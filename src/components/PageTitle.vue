<template>
  <div v-if="variant === 'home'" class="us-home-title">
    <h1 class="us-home-title__text">
      {{ accent ? `${text} ` : text }}<span v-if="accent" class="us-home-title__accent">{{ accent }}</span>
    </h1>
    <div class="us-home-title__bar" aria-hidden="true" />
  </div>
  <h1 v-else class="us-page-title">{{ text }}</h1>
</template>

<script setup lang="ts">
// Título de página (h1): texto en tipo oración, el estilo lo pasa a mayúsculas
withDefaults(defineProps<{ text: string; variant?: 'module' | 'home' | undefined; accent?: string | undefined }>(), {
  variant: 'module',
});
</script>

<style scoped lang="scss">
.us-page-title {
  margin: 0 0 var(--space-16);
  color: var(--ink);
  font-size: 20px;
  line-height: 32px;
  font-weight: 700;
  letter-spacing: 0.25px;
  text-align: center;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.us-home-title {
  text-align: center;
  margin: 0 0 var(--space-24);
}

.us-home-title__text {
  margin: 0;
  color: var(--inabif-blue);
  font-size: 2.05rem;
  line-height: 1.2;
  font-weight: 900;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.us-home-title__accent {
  color: var(--inabif-red-title);
}

.us-home-title__bar {
  width: 184px;
  height: 10px;
  margin: 18px auto 0;
  border-radius: var(--radius-pill);
  background: var(--inabif-blue-bar);
}

@media (max-width: 1024px) {
  .us-home-title__text {
    font-size: 1.7rem;
  }
}

@media (max-width: 768px) {
  .us-home-title__text {
    font-size: 1.35rem;
  }

  .us-home-title__bar {
    width: 116px;
    height: 6px;
  }
}
</style>
