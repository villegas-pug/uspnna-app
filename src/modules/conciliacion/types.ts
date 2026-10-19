// Modelo del módulo Conciliación de resultados de campaña
import type { Entity, IsoDateTime } from 'src/core/types/common';
import type { CategoriaBien } from 'src/modules/bienes/types';

export type ResultadoConciliacion =
  | 'coincidente'
  | 'faltante'
  | 'sobrante'
  | 'diferencia_ubicacion'
  | 'diferencia_cantidad'
  | 'pendiente';

export type EstadoRegularizacion = 'pendiente' | 'regularizado' | 'no_aplica';
export type TipoRegistro = 'bien' | 'suministro';

export interface ItemConciliacion extends Entity {
  campaniaId: string;
  establecimientoId: string;
  tipoRegistro: TipoRegistro;
  resultado: ResultadoConciliacion;
  bienId: string | null;
  verificacionId: string | null;
  suministroId: string | null;
  almacenId: string | null;
  descripcion: string;
  codigoPatrimonial: string | null;
  ambienteRegistradoId: string | null;
  ambienteEncontradoId: string | null;
  establecimientoEncontradoId: string | null;
  cantidadSistema: number | null;
  cantidadFisica: number | null;
  estadoRegularizacion: EstadoRegularizacion;
  accionRegularizacion: string | null;
  sustento: string | null;
  fechaRegularizacion: IsoDateTime | null;
}

export interface RegularizacionInput {
  sustento: string;
  /** Solo para sobrantes: categoría del bien que se incorpora. */
  categoria: CategoriaBien | null;
}

export interface TotalesConciliacion {
  coincidentes: number;
  faltantes: number;
  sobrantes: number;
  diferenciasUbicacion: number;
  diferenciasCantidad: number;
  pendientes: number;
  porRegularizar: number;
  regularizados: number;
}

export const RESULTADO_LABEL: Record<ResultadoConciliacion, string> = {
  coincidente: 'Coincidente',
  faltante: 'Faltante',
  sobrante: 'Sobrante',
  diferencia_ubicacion: 'Diferencia de ubicación',
  diferencia_cantidad: 'Diferencia de cantidad',
  pendiente: 'Pendiente de verificar',
};

export const ESTADO_REGULARIZACION_LABEL: Record<EstadoRegularizacion, string> = {
  pendiente: 'Por regularizar',
  regularizado: 'Regularizado',
  no_aplica: 'No aplica',
};

/** Acción de regularización que corresponde a cada resultado (RN-K2). */
export const ACCION_REGULARIZACION: Partial<Record<ResultadoConciliacion, string>> = {
  diferencia_ubicacion: 'Actualizar ubicación del bien',
  faltante: 'Registrar baja por faltante',
  sobrante: 'Incorporar bien al registro',
  diferencia_cantidad: 'Ajustar stock del almacén',
};
