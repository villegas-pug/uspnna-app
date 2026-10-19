import type { RouteRecordRaw } from 'vue-router';
import { crumbs } from 'src/router/meta';

const MODULO = { label: 'Establecimientos' };

const routes: RouteRecordRaw[] = [
  {
    path: 'establecimientos',
    component: () => import('src/modules/establecimientos/pages/EstablecimientosPage.vue'),
    meta: { title: 'Centros de Acogida Residencial', menuKey: 'establecimientos-car', breadcrumb: crumbs(MODULO) },
  },
  {
    path: 'establecimientos/ambientes',
    component: () => import('src/modules/establecimientos/pages/AmbientesPage.vue'),
    meta: { title: 'Ambientes', menuKey: 'establecimientos-ambientes', breadcrumb: crumbs(MODULO) },
  },
  {
    path: 'establecimientos/almacenes',
    component: () => import('src/modules/establecimientos/pages/AlmacenesPage.vue'),
    meta: { title: 'Almacenes', menuKey: 'establecimientos-almacenes', breadcrumb: crumbs(MODULO) },
  },
  {
    path: 'establecimientos/:id',
    component: () => import('src/modules/establecimientos/pages/EstablecimientoDetailPage.vue'),
    props: true,
    meta: {
      title: 'Ficha del establecimiento',
      menuKey: 'establecimientos-car',
      breadcrumb: crumbs(MODULO, { label: 'Centros de Acogida Residencial', to: '/establecimientos' }),
    },
  },
];

export default routes;
