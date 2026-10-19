<template>
  <q-layout view="lHh Lpr lFf">
    <AppHeader :menu-open="drawerOpen" @toggle-menu="drawerOpen = !drawerOpen" />
    <AppDrawer v-model="drawerOpen" />
    <q-page-container>
      <router-view />
    </q-page-container>
    <AppFooter />
  </q-layout>
</template>

<script setup lang="ts">
// Layout institucional: header de 60px con borde coral, menú lateral de 300px y footer fijo
import { ref } from 'vue';
import AppHeader from 'src/components/layout/AppHeader.vue';
import AppDrawer from 'src/components/layout/AppDrawer.vue';
import AppFooter from 'src/components/layout/AppFooter.vue';

const drawerOpen = ref(false);
</script>
