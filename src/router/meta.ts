// Metadatos tipados de las rutas: título del documento, migas de pan e ítem de menú activo
import type { BreadcrumbItem } from 'src/components/types';

declare module 'vue-router' {
  interface RouteMeta {
    title?: string;
    /** Migas anteriores a la página actual (la actual la agrega PageContainer). */
    breadcrumb?: BreadcrumbItem[];
    menuKey?: string;
  }
}

export const INICIO: BreadcrumbItem = { label: 'Inicio', to: '/inicio' };

/** Atajo para declarar las migas de un módulo: Inicio › Módulo › … */
export function crumbs(...items: BreadcrumbItem[]): BreadcrumbItem[] {
  return [INICIO, ...items];
}
