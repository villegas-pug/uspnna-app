import type { RouteRecordRaw } from 'vue-router';
import { crumbs } from 'src/router/meta';

const MODULO = { label: 'Bienes patrimoniales' };
const REGISTRO = { label: 'Registro de bienes', to: '/bienes' };

const routes: RouteRecordRaw[] = [
  {
    path: 'bienes',
    component: () => import('src/modules/bienes/pages/BienesPage.vue'),
    meta: { title: 'Registro de bienes', menuKey: 'bienes-registro', breadcrumb: crumbs(MODULO) },
  },
  {
    path: 'bienes/nuevo',
    component: () => import('src/modules/bienes/pages/BienFormPage.vue'),
    meta: { title: 'Nuevo bien', menuKey: 'bienes-nuevo', breadcrumb: crumbs(MODULO, REGISTRO) },
  },
  {
    path: 'bienes/historial',
    component: () => import('src/modules/bienes/pages/HistorialBienesPage.vue'),
    meta: { title: 'Historial de bienes', menuKey: 'bienes-historial', breadcrumb: crumbs(MODULO) },
  },
  {
    path: 'bienes/:id',
    component: () => import('src/modules/bienes/pages/BienDetailPage.vue'),
    props: true,
    meta: { title: 'Ficha del bien', menuKey: 'bienes-registro', breadcrumb: crumbs(MODULO, REGISTRO) },
  },
  {
    path: 'bienes/:id/editar',
    component: () => import('src/modules/bienes/pages/BienFormPage.vue'),
    props: true,
    meta: { title: 'Editar bien', menuKey: 'bienes-registro', breadcrumb: crumbs(MODULO, REGISTRO) },
  },
];

export default routes;
