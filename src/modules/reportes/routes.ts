import type { RouteRecordRaw } from 'vue-router';
import { crumbs } from 'src/router/meta';

const routes: RouteRecordRaw[] = [
  {
    path: 'reportes',
    component: () => import('src/modules/reportes/pages/ReportesPage.vue'),
    meta: { title: 'Reportes', menuKey: 'reportes', breadcrumb: crumbs() },
  },
];

export default routes;
