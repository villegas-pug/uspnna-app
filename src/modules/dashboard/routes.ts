import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: 'inicio',
    name: 'inicio',
    component: () => import('src/modules/dashboard/pages/DashboardPage.vue'),
    meta: { title: 'Inicio', menuKey: 'inicio' },
  },
];

export default routes;
