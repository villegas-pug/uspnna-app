// Modelo del módulo Bienes patrimoniales
import type { Entity, IsoDate, IsoDateTime } from 'src/core/types/common';

export type EstadoConservacion = 'bueno' | 'regular' | 'malo' | 'sin_evaluar';
export type SituacionBien = 'activo' | 'baja';
export type CategoriaBien =
  | 'mobiliario'
  | 'equipo_computo'
  | 'electrodomestico'
  | 'equipo_cocina'
  | 'equipo_salud'
  | 'equipo_recreativo'
  | 'otros';

export interface FotoBien {
  id: string;
  nombre: string;
  dataUrl: string;
  fecha: IsoDateTime;
}

export interface BienPatrimonial extends Entity {
  /** Código oficial de 12 dígitos; null mientras el bien no tenga codificación patrimonial. */
  codigoPatrimonial: string | null;
  descripcion: string;
  categoria: CategoriaBien;
  marca: string;
  modelo: string;
  serie: string;
  color: string;
  establecimientoId: string;
  ambienteId: string;
  custodio: string;
  estadoConservacion: EstadoConservacion;
  situacion: SituacionBien;
  fechaAdquisicion: IsoDate | null;
  valorReferencial: number | null;
  observaciones: string;
  fotos: FotoBien[];
  motivoBaja: string | null;
  fechaRegistro: IsoDateTime;
  fechaActualizacion: IsoDateTime;
}

export type TipoEventoBien =
  | 'registro'
  | 'actualizacion'
  | 'transferencia'
  | 'baja'
  | 'verificacion'
  | 'regularizacion';

export interface EventoBien extends Entity {
  bienId: string;
  fecha: IsoDateTime;
  tipo: TipoEventoBien;
  descripcion: string;
  ambienteOrigenId: string | null;
  ambienteDestinoId: string | null;
  responsable: string;
}

/** Datos del formulario. La ubicación solo se fija al registrar; luego se cambia con transferencia. */
export type BienInput = Pick<
  BienPatrimonial,
  | 'codigoPatrimonial'
  | 'descripcion'
  | 'categoria'
  | 'marca'
  | 'modelo'
  | 'serie'
  | 'color'
  | 'establecimientoId'
  | 'ambienteId'
  | 'custodio'
  | 'estadoConservacion'
  | 'fechaAdquisicion'
  | 'valorReferencial'
  | 'observaciones'
  | 'fotos'
>;

export interface TransferenciaBienInput {
  establecimientoId: string;
  ambienteId: string;
  custodio: string;
  motivo: string;
}

export interface BajaBienInput {
  motivo: string;
  sustento: string;
}

export const ESTADO_CONSERVACION_LABEL: Record<EstadoConservacion, string> = {
  bueno: 'Bueno',
  regular: 'Regular',
  malo: 'Malo',
  sin_evaluar: 'Sin evaluar',
};

export const SITUACION_BIEN_LABEL: Record<SituacionBien, string> = {
  activo: 'Activo',
  baja: 'Baja',
};

export const CATEGORIA_BIEN_LABEL: Record<CategoriaBien, string> = {
  mobiliario: 'Mobiliario',
  equipo_computo: 'Equipo de cómputo',
  electrodomestico: 'Electrodoméstico',
  equipo_cocina: 'Equipo de cocina',
  equipo_salud: 'Equipo de salud',
  equipo_recreativo: 'Equipo recreativo',
  otros: 'Otros',
};

export const TIPO_EVENTO_BIEN_LABEL: Record<TipoEventoBien, string> = {
  registro: 'Registro',
  actualizacion: 'Actualización',
  transferencia: 'Transferencia',
  baja: 'Baja',
  verificacion: 'Verificación',
  regularizacion: 'Regularización',
};

export const TIPO_EVENTO_BIEN_ICON: Record<TipoEventoBien, string> = {
  registro: 'add_box',
  actualizacion: 'edit',
  transferencia: 'swap_horiz',
  baja: 'block',
  verificacion: 'fact_check',
  regularizacion: 'rule',
};

export const MOTIVOS_BAJA = [
  'Deterioro irreparable',
  'Obsolescencia técnica',
  'Pérdida o sustracción',
  'Faltante en inventario',
  'Otro motivo',
] as const;

/** Regla RN-B2: código patrimonial oficial de 12 dígitos. */
export const CODIGO_PATRIMONIAL_REGEX = /^\d{12}$/;

/** Regla RN-B5: máximo de fotografías por bien. */
export const MAX_FOTOS_BIEN = 4;
