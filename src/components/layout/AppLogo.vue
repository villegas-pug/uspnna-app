<template>
  <div class="us-logo" :class="`us-logo--${size}`">
    <img v-show="loaded" :src="LOGO_SRC" alt="Logo INABIF" class="us-logo__img" @load="loaded = true" @error="loaded = false" />
    <span v-if="!loaded" class="us-logo__slot" role="img" aria-label="Logo INABIF (archivo oficial pendiente)">Logo INABIF</span>
  </div>
</template>

<script setup lang="ts">
// Logo institucional: archivo oficial LOGO_INABIF_2020.png en public/img (no incluido).
// Mientras falte se muestra un marcador punteado; la marca no se redibuja ni se aproxima.
import { ref } from 'vue';

defineProps<{ size: 'lg' | 'md' }>();

const LOGO_SRC = 'img/LOGO_INABIF_2020.png';
const loaded = ref(false);
</script>

<style scoped lang="scss">
.us-logo {
  flex: 0 1 auto;
  display: flex;
  min-width: 0;
  max-width: 100%;
}

.us-logo--lg {
  width: var(--logo-width-lg);
}

.us-logo--md {
  width: var(--logo-width-md);
}

.us-logo__img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 46px;
  object-fit: contain;
  object-position: left center;
}

.us-logo__slot {
  flex: 1 1 auto;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--space-8);
  border: 1px dashed var(--border-control);
  border-radius: var(--radius-field);
  color: var(--ink-muted);
  font-size: 12px;
  line-height: 1.2;
  text-align: center;
}
</style>
