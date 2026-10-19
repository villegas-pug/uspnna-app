import type { RouteRecordRaw } from 'vue-router';
import { crumbs } from 'src/router/meta';

const MODULO = { label: 'Almacenes y suministros' };
const breadcrumb = crumbs(MODULO);
const movimientos = () => import('src/modules/suministros/pages/MovimientosPage.vue');

const routes: RouteRecordRaw[] = [
  {
    path: 'suministros',
    redirect: '/suministros/stock',
  },
  {
    path: 'suministros/stock',
    component: () => import('src/modules/suministros/pages/StockPage.vue'),
    meta: { title: 'Stock por almacén', menuKey: 'suministros-stock', breadcrumb },
  },
  {
    path: 'suministros/ingresos',
    component: movimientos,
    props: { tipo: 'ingreso' },
    meta: { title: 'Registro de ingresos', menuKey: 'suministros-ingresos', breadcrumb },
  },
  {
    path: 'suministros/salidas',
    component: movimientos,
    props: { tipo: 'salida' },
    meta: { title: 'Registro de salidas', menuKey: 'suministros-salidas', breadcrumb },
  },
  {
    path: 'suministros/transferencias',
    component: movimientos,
    props: { tipo: 'transferencia' },
    meta: { title: 'Transferencias', menuKey: 'suministros-transferencias', breadcrumb },
  },
  {
    path: 'suministros/lotes',
    component: () => import('src/modules/suministros/pages/LotesPage.vue'),
    meta: { title: 'Lotes y vencimientos', menuKey: 'suministros-lotes', breadcrumb },
  },
  {
    path: 'suministros/catalogo',
    component: () => import('src/modules/suministros/pages/CatalogoPage.vue'),
    meta: { title: 'Catálogo de suministros', menuKey: 'suministros-catalogo', breadcrumb },
  },
];

export default routes;
