import type { RouteRecordRaw } from 'vue-router';
import { crumbs } from 'src/router/meta';

const routes: RouteRecordRaw[] = [
  {
    path: 'prototipo',
    component: () => import('src/modules/prototipo/pages/DatosPrototipoPage.vue'),
    meta: { title: 'Datos del prototipo', menuKey: 'prototipo', breadcrumb: crumbs() },
  },
];

export default routes;
