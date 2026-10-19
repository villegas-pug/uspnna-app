import type { RouteRecordRaw } from 'vue-router';
import { crumbs } from 'src/router/meta';

const MODULO = { label: 'Conciliación', to: '/conciliacion' };

const routes: RouteRecordRaw[] = [
  {
    path: 'conciliacion',
    component: () => import('src/modules/conciliacion/pages/ConciliacionPage.vue'),
    meta: { title: 'Conciliación', menuKey: 'conciliacion', breadcrumb: crumbs() },
  },
  {
    path: 'conciliacion/:campaniaId',
    component: () => import('src/modules/conciliacion/pages/ConciliacionDetailPage.vue'),
    props: true,
    meta: { title: 'Resultados de conciliación', menuKey: 'conciliacion', breadcrumb: crumbs(MODULO) },
  },
];

export default routes;
