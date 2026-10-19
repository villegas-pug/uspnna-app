// Composición de rutas: cada módulo aporta las suyas bajo el layout institucional
import type { RouteRecordRaw } from 'vue-router';
import './meta';
import dashboardRoutes from 'src/modules/dashboard/routes';
import establecimientosRoutes from 'src/modules/establecimientos/routes';
import bienesRoutes from 'src/modules/bienes/routes';
import suministrosRoutes from 'src/modules/suministros/routes';
import campaniasRoutes from 'src/modules/campanias/routes';
import conciliacionRoutes from 'src/modules/conciliacion/routes';
import reportesRoutes from 'src/modules/reportes/routes';
import prototipoRoutes from 'src/modules/prototipo/routes';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('src/layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: '/inicio' },
      ...dashboardRoutes,
      ...establecimientosRoutes,
      ...bienesRoutes,
      ...suministrosRoutes,
      ...campaniasRoutes,
      ...conciliacionRoutes,
      ...reportesRoutes,
      ...prototipoRoutes,
      {
        path: ':catchAll(.*)*',
        component: () => import('src/pages/ErrorNotFound.vue'),
        meta: { title: 'Página no encontrada' },
      },
    ],
  },
];

export default routes;
