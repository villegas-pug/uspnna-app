// Modelo del módulo Campañas de inventario y verificación física
import type { Entity, IsoDate, IsoDateTime } from 'src/core/types/common';
import type { EstadoConservacion } from 'src/modules/bienes/types';

export type EstadoCampania = 'planificada' | 'en_curso' | 'en_conciliacion' | 'cerrada';
export type TipoCampania = 'inicial' | 'anual' | 'extraordinaria';

export interface Campania extends Entity {
  nombre: string;
  tipo: TipoCampania;
  descripcion: string;
  establecimientoIds: string[];
  fechaInicio: IsoDate;
  fechaFin: IsoDate;
  responsable: string;
  estado: EstadoCampania;
  fechaConciliacion: IsoDateTime | null;
  fechaCierre: IsoDateTime | null;
}

export type Hallazgo = 'encontrado' | 'no_encontrado';

export interface VerificacionBien extends Entity {
  campaniaId: string;
  establecimientoId: string;
  /** Ambiente donde se hizo la verificación (donde se esperaba o donde se encontró el bien). */
  ambienteId: string;
  /** null: bien encontrado sin registro (sobrante). */
  bienId: string | null;
  hallazgo: Hallazgo;
  estadoConservacion: EstadoConservacion;
  descripcion: string;
  codigoPatrimonialLeido: string | null;
  observaciones: string;
  fecha: IsoDateTime;
}

export interface ConteoSuministro extends Entity {
  campaniaId: string;
  establecimientoId: string;
  almacenId: string;
  suministroId: string;
  /** Stock del sistema al momento del conteo. */
  cantidadSistema: number;
  cantidadFisica: number;
  observaciones: string;
  fecha: IsoDateTime;
}

export type TipoUnidad = 'ambiente' | 'almacen';

export interface UnidadVerificada extends Entity {
  campaniaId: string;
  establecimientoId: string;
  tipo: TipoUnidad;
  unidadId: string;
  fecha: IsoDateTime;
}

export type EstadoUnidad = 'pendiente' | 'en_proceso' | 'verificada';

export interface AvanceUnidad {
  tipo: TipoUnidad;
  unidadId: string;
  establecimientoId: string;
  nombre: string;
  responsable: string;
  esperados: number;
  verificados: number;
  estado: EstadoUnidad;
}

export interface AvanceCampania {
  unidades: number;
  unidadesVerificadas: number;
  porcentaje: number;
}

export type CampaniaInput = Pick<
  Campania,
  'nombre' | 'tipo' | 'descripcion' | 'establecimientoIds' | 'fechaInicio' | 'fechaFin' | 'responsable'
>;

/** Marca de un bien esperado en el ambiente (borrador de la vista de verificación). */
export interface MarcaBienInput {
  bienId: string;
  hallazgo: Hallazgo | null;
  estadoConservacion: EstadoConservacion;
  observaciones: string;
}

/** Bien encontrado no esperado: registrado en otra ubicación (bienId) o sin registro (sobrante). */
export interface HallazgoAdicionalInput {
  bienId: string | null;
  descripcion: string;
  codigoPatrimonialLeido: string | null;
  estadoConservacion: EstadoConservacion;
  observaciones: string;
}

export interface ConteoInput {
  suministroId: string;
  cantidadSistema: number;
  cantidadFisica: number | null;
  observaciones: string;
}

export const ESTADO_CAMPANIA_LABEL: Record<EstadoCampania, string> = {
  planificada: 'Planificada',
  en_curso: 'En curso',
  en_conciliacion: 'En conciliación',
  cerrada: 'Cerrada',
};

export const ESTADO_UNIDAD_LABEL: Record<EstadoUnidad, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  verificada: 'Verificada',
};

export const HALLAZGO_LABEL: Record<Hallazgo, string> = {
  encontrado: 'Encontrado',
  no_encontrado: 'No encontrado',
};

export const TIPO_CAMPANIA_LABEL: Record<TipoCampania, string> = {
  inicial: 'Levantamiento inicial',
  anual: 'Inventario anual',
  extraordinaria: 'Inventario extraordinario',
};
