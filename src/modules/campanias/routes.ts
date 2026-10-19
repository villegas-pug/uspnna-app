import type { RouteRecordRaw } from 'vue-router';
import { crumbs } from 'src/router/meta';

const MODULO = { label: 'Campañas de inventario' };
const LISTA = { label: 'Campañas', to: '/campanias' };

const routes: RouteRecordRaw[] = [
  {
    path: 'campanias',
    component: () => import('src/modules/campanias/pages/CampaniasPage.vue'),
    meta: { title: 'Campañas de inventario', menuKey: 'campanias-lista', breadcrumb: crumbs(MODULO) },
  },
  {
    path: 'campanias/verificacion',
    component: () => import('src/modules/campanias/pages/VerificacionIndexPage.vue'),
    meta: { title: 'Verificación física', menuKey: 'campanias-verificacion', breadcrumb: crumbs(MODULO) },
  },
  {
    path: 'campanias/:id',
    component: () => import('src/modules/campanias/pages/CampaniaDetailPage.vue'),
    props: true,
    meta: { title: 'Ficha de campaña', menuKey: 'campanias-lista', breadcrumb: crumbs(MODULO, LISTA) },
  },
  {
    path: 'campanias/:id/ambientes/:ambienteId',
    component: () => import('src/modules/campanias/pages/VerificacionAmbientePage.vue'),
    props: true,
    meta: { title: 'Verificación de ambiente', menuKey: 'campanias-verificacion', breadcrumb: crumbs(MODULO, LISTA) },
  },
  {
    path: 'campanias/:id/almacenes/:almacenId',
    component: () => import('src/modules/campanias/pages/ConteoAlmacenPage.vue'),
    props: true,
    meta: { title: 'Conteo de almacén', menuKey: 'campanias-verificacion', breadcrumb: crumbs(MODULO, LISTA) },
  },
];

export default routes;
