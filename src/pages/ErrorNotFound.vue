<template>
  <PageContainer title="Página no encontrada" hide-breadcrumbs>
    <EmptyState
      icon="travel_explore"
      title="La dirección no existe"
      text="Revise el enlace o vuelva al inicio para continuar desde el menú."
    >
      <AppButton icon="home" label="Ir al inicio" to="/inicio" />
    </EmptyState>
  </PageContainer>
</template>

<script setup lang="ts">
import AppButton from 'src/components/AppButton.vue';
import EmptyState from 'src/components/EmptyState.vue';
import PageContainer from 'src/components/PageContainer.vue';
</script>
