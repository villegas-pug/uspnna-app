// Tipos transversales del dominio

/** Toda entidad persistida tiene un ID interno legible (BP-000001, CAR-01, ...). */
export interface Entity {
  id: string;
}

/** Fecha sin hora en formato YYYY-MM-DD (se interpreta en hora local). */
export type IsoDate = string;

/** Fecha y hora ISO 8601 (Date.toISOString). */
export type IsoDateTime = string;

export type EstadoRegistro = 'activo' | 'inactivo';

export const ESTADO_REGISTRO_LABEL: Record<EstadoRegistro, string> = {
  activo: 'Activo',
  inactivo: 'Inactivo',
};

export interface SelectOption<V = string> {
  label: string;
  value: V;
}

/** Responsable de todas las acciones mientras el prototipo no tenga autenticación. */
export const RESPONSABLE_PROTOTIPO = 'Equipo de inventario USPNNA';
