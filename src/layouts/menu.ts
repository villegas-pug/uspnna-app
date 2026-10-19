// Árbol del menú lateral. Cada ruta declara en meta.menuKey la clave del ítem que debe quedar activo.

export interface MenuLeaf {
  key: string;
  label: string;
  icon: string;
  to: string;
}

export interface MenuNode {
  key: string;
  label: string;
  icon: string;
  to?: string;
  children?: MenuLeaf[];
}

export const MENU: MenuNode[] = [
  { key: 'inicio', label: 'Inicio', icon: 'home', to: '/inicio' },
  {
    key: 'establecimientos',
    label: 'Establecimientos',
    icon: 'home_work',
    children: [
      { key: 'establecimientos-car', label: 'Centros de Acogida Residencial', icon: 'domain', to: '/establecimientos' },
      { key: 'establecimientos-ambientes', label: 'Ambientes', icon: 'meeting_room', to: '/establecimientos/ambientes' },
      { key: 'establecimientos-almacenes', label: 'Almacenes', icon: 'warehouse', to: '/establecimientos/almacenes' },
    ],
  },
  {
    key: 'bienes',
    label: 'Bienes patrimoniales',
    icon: 'inventory_2',
    children: [
      { key: 'bienes-registro', label: 'Registro de bienes', icon: 'list_alt', to: '/bienes' },
      { key: 'bienes-nuevo', label: 'Nuevo bien', icon: 'add_box', to: '/bienes/nuevo' },
      { key: 'bienes-historial', label: 'Historial de movimientos', icon: 'history', to: '/bienes/historial' },
    ],
  },
  {
    key: 'suministros',
    label: 'Almacenes y suministros',
    icon: 'warehouse',
    children: [
      { key: 'suministros-stock', label: 'Stock por almacén', icon: 'inventory', to: '/suministros/stock' },
      { key: 'suministros-ingresos', label: 'Registro de ingresos', icon: 'move_to_inbox', to: '/suministros/ingresos' },
      { key: 'suministros-salidas', label: 'Registro de salidas', icon: 'outbox', to: '/suministros/salidas' },
      { key: 'suministros-transferencias', label: 'Transferencias', icon: 'swap_horiz', to: '/suministros/transferencias' },
      { key: 'suministros-lotes', label: 'Lotes y vencimientos', icon: 'event_available', to: '/suministros/lotes' },
      { key: 'suministros-catalogo', label: 'Catálogo de suministros', icon: 'category', to: '/suministros/catalogo' },
    ],
  },
  {
    key: 'campanias',
    label: 'Campañas de inventario',
    icon: 'fact_check',
    children: [
      { key: 'campanias-lista', label: 'Campañas', icon: 'event_note', to: '/campanias' },
      { key: 'campanias-verificacion', label: 'Verificación física', icon: 'checklist', to: '/campanias/verificacion' },
    ],
  },
  { key: 'conciliacion', label: 'Conciliación', icon: 'compare_arrows', to: '/conciliacion' },
  { key: 'reportes', label: 'Reportes', icon: 'assessment', to: '/reportes' },
  { key: 'prototipo', label: 'Datos del prototipo', icon: 'settings_backup_restore', to: '/prototipo' },
];
