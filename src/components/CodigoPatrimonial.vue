<template>
  <span v-if="codigo" class="u-num codigo">{{ codigo }}</span>
  <StatusChip v-else domain="codigo" value="sin_codigo" />
</template>

<script setup lang="ts">
// Código patrimonial oficial o chip neutro "Sin código patrimonial" (nunca un guion)
import StatusChip from 'src/components/StatusChip.vue';

defineProps<{ codigo: string | null }>();
</script>

<style scoped lang="scss">
.codigo {
  white-space: nowrap;
}
</style>
