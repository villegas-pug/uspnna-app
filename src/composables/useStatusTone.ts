// Mapa central de estados del dominio → tono, icono y texto (StatusChip).
// Nadie elige colores a mano: cada estado se describe aquí una sola vez (icono + texto + color).
import { ESTADO_REGISTRO_LABEL } from 'src/core/types/common';
import { ESTADO_LEVANTAMIENTO_LABEL } from 'src/modules/establecimientos/types';
import { ESTADO_CONSERVACION_LABEL, SITUACION_BIEN_LABEL } from 'src/modules/bienes/types';
import { ESTADO_STOCK_LABEL, ESTADO_VENCIMIENTO_LABEL } from 'src/modules/suministros/types';
import { ESTADO_CAMPANIA_LABEL, ESTADO_UNIDAD_LABEL, HALLAZGO_LABEL } from 'src/modules/campanias/types';
import { ESTADO_REGULARIZACION_LABEL, RESULTADO_LABEL } from 'src/modules/conciliacion/types';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'extra' | 'neutral';

export interface StatusDescriptor {
  label: string;
  tone: Tone;
  icon: string;
}

const ICON_BY_TONE: Record<Tone, string> = {
  success: 'check_circle',
  warning: 'error_outline',
  danger: 'cancel',
  info: 'info',
  extra: 'add_circle_outline',
  neutral: 'schedule',
};

/** Color de relleno por tono para gráficos (≥3:1 sobre surface). */
export const TONE_COLOR: Record<Tone, string> = {
  success: 'var(--status-success-ink)',
  warning: 'var(--notice-ink)',
  danger: 'var(--status-danger-ink)',
  info: 'var(--inabif-blue)',
  extra: 'var(--status-extra-ink)',
  neutral: 'var(--border-control)',
};

function s(label: string, tone: Tone, icon = ICON_BY_TONE[tone]): StatusDescriptor {
  return { label, tone, icon };
}

const STATUS = {
  registro: {
    activo: s(ESTADO_REGISTRO_LABEL.activo, 'success'),
    inactivo: s(ESTADO_REGISTRO_LABEL.inactivo, 'neutral', 'pause_circle_outline'),
  },
  levantamiento: {
    pendiente: s(ESTADO_LEVANTAMIENTO_LABEL.pendiente, 'neutral'),
    en_curso: s(ESTADO_LEVANTAMIENTO_LABEL.en_curso, 'info', 'autorenew'),
    completado: s(ESTADO_LEVANTAMIENTO_LABEL.completado, 'success'),
  },
  conservacion: {
    bueno: s(ESTADO_CONSERVACION_LABEL.bueno, 'success'),
    regular: s(ESTADO_CONSERVACION_LABEL.regular, 'warning'),
    malo: s(ESTADO_CONSERVACION_LABEL.malo, 'danger'),
    sin_evaluar: s(ESTADO_CONSERVACION_LABEL.sin_evaluar, 'neutral', 'help_outline'),
  },
  situacion: {
    activo: s(SITUACION_BIEN_LABEL.activo, 'success'),
    baja: s(SITUACION_BIEN_LABEL.baja, 'danger', 'block'),
  },
  codigo: {
    sin_codigo: s('Sin código patrimonial', 'neutral', 'label_off'),
  },
  stock: {
    normal: s(ESTADO_STOCK_LABEL.normal, 'success'),
    bajo_minimo: s(ESTADO_STOCK_LABEL.bajo_minimo, 'warning'),
    agotado: s(ESTADO_STOCK_LABEL.agotado, 'danger'),
  },
  vencimiento: {
    vigente: s(ESTADO_VENCIMIENTO_LABEL.vigente, 'success'),
    por_vencer: s(ESTADO_VENCIMIENTO_LABEL.por_vencer, 'warning', 'event'),
    vencido: s(ESTADO_VENCIMIENTO_LABEL.vencido, 'danger'),
    sin_vencimiento: s(ESTADO_VENCIMIENTO_LABEL.sin_vencimiento, 'neutral', 'remove_circle_outline'),
  },
  campania: {
    planificada: s(ESTADO_CAMPANIA_LABEL.planificada, 'neutral', 'event'),
    en_curso: s(ESTADO_CAMPANIA_LABEL.en_curso, 'info', 'play_circle_outline'),
    en_conciliacion: s(ESTADO_CAMPANIA_LABEL.en_conciliacion, 'extra', 'compare_arrows'),
    cerrada: s(ESTADO_CAMPANIA_LABEL.cerrada, 'success'),
  },
  unidad: {
    pendiente: s(ESTADO_UNIDAD_LABEL.pendiente, 'neutral'),
    en_proceso: s(ESTADO_UNIDAD_LABEL.en_proceso, 'info', 'autorenew'),
    verificada: s(ESTADO_UNIDAD_LABEL.verificada, 'success'),
  },
  hallazgo: {
    encontrado: s(HALLAZGO_LABEL.encontrado, 'success'),
    no_encontrado: s(HALLAZGO_LABEL.no_encontrado, 'danger'),
    pendiente: s('Sin marcar', 'neutral'),
  },
  conciliacion: {
    coincidente: s(RESULTADO_LABEL.coincidente, 'success'),
    faltante: s(RESULTADO_LABEL.faltante, 'danger'),
    sobrante: s(RESULTADO_LABEL.sobrante, 'extra', 'add_circle_outline'),
    diferencia_ubicacion: s(RESULTADO_LABEL.diferencia_ubicacion, 'info', 'place'),
    diferencia_cantidad: s(RESULTADO_LABEL.diferencia_cantidad, 'warning'),
    pendiente: s(RESULTADO_LABEL.pendiente, 'neutral', 'schedule'),
  },
  regularizacion: {
    pendiente: s(ESTADO_REGULARIZACION_LABEL.pendiente, 'warning', 'pending_actions'),
    regularizado: s(ESTADO_REGULARIZACION_LABEL.regularizado, 'success'),
    no_aplica: s(ESTADO_REGULARIZACION_LABEL.no_aplica, 'neutral', 'remove_circle_outline'),
  },
} satisfies Record<string, Record<string, StatusDescriptor>>;

export type StatusDomain = keyof typeof STATUS;

const FALLBACK: StatusDescriptor = s('Sin estado', 'neutral', 'help_outline');

export function statusDescriptor(domain: StatusDomain, value: string): StatusDescriptor {
  const domainMap: Record<string, StatusDescriptor> = STATUS[domain];
  return domainMap[value] ?? FALLBACK;
}

export function useStatusTone() {
  return { describe: statusDescriptor, toneColor: (tone: Tone) => TONE_COLOR[tone] };
}
