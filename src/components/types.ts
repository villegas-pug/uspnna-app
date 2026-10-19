// Contratos de los componentes compartidos del sistema de diseño
import type { RouteLocationRaw } from 'vue-router';
import type { StatusDomain } from 'src/composables/useStatusTone';

export interface BreadcrumbItem {
  label: string;
  to?: RouteLocationRaw;
}

/** Avatar del menú de acciones: ver, editar, mover, éxito, neutro o destructiva. */
export type ActionTone = 'view' | 'edit' | 'move' | 'success' | 'neutral' | 'danger';

export interface ActionItem {
  key: string;
  label: string;
  icon: string;
  tone: ActionTone;
  handler: () => void;
  disabled?: boolean;
  /** Motivo visible cuando la acción está deshabilitada. */
  disabledReason?: string;
}

export interface DataColumn<T> {
  name: string;
  label: string;
  field: Extract<keyof T, string> | ((row: T) => unknown);
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  sort?: (a: unknown, b: unknown) => number;
  format?: (value: unknown, row: T) => string;
  /** Columna principal: no se oculta. */
  required?: boolean;
  /** Columna secundaria: se oculta en tablet (gt-sm). */
  secondary?: boolean;
  /** No se muestra en la tarjeta móvil (p. ej. porque ya es el título). */
  hideInCard?: boolean;
  classes?: string;
  style?: string;
}

export interface DetailRow {
  key: string;
  label: string;
  icon?: string;
  value?: string | number | null;
}

export interface ContextItem {
  label: string;
  value: string;
}

export type ResultTone = 'ok' | 'bad' | 'obs' | 'na';

export interface ResultRow {
  key: string;
  tone: ResultTone;
  icon: string;
  label: string;
  value: number;
}

export type FloatingTone = 'primary' | 'secondary' | 'neutral';

export interface FloatingAction {
  key: string;
  icon: string;
  label: string;
  tone: FloatingTone;
  handler: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export interface ConfirmDetail {
  label: string;
  value: string;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: 'primary' | 'negative';
  /** Texto de la casilla que debe marcarse para habilitar la confirmación. */
  acknowledge?: string;
  details?: ConfirmDetail[];
}

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'flat' | 'negative';

/** Barra de BarChart: la identidad la da el texto o el StatusChip, nunca el color. */
export interface BarDatum {
  key: string;
  label: string;
  value: number;
  status?: { domain: StatusDomain; value: string };
  to?: RouteLocationRaw;
}
