// Modelo del módulo Almacenes y suministros
import type { Entity, EstadoRegistro, IsoDate, IsoDateTime } from 'src/core/types/common';

export type CategoriaSuministro = 'viveres' | 'limpieza' | 'aseo_personal' | 'utiles' | 'medicinas';

export type UnidadMedida =
  | 'unidad'
  | 'kg'
  | 'litro'
  | 'paquete'
  | 'caja'
  | 'frasco'
  | 'bolsa'
  | 'lata';

export interface Suministro extends Entity {
  nombre: string;
  categoria: CategoriaSuministro;
  unidad: UnidadMedida;
  stockMinimo: number;
  controlaVencimiento: boolean;
  descripcion: string;
  estado: EstadoRegistro;
}

export interface Lote extends Entity {
  suministroId: string;
  almacenId: string;
  numeroLote: string | null;
  fechaVencimiento: IsoDate | null;
  cantidad: number;
  fechaIngreso: IsoDate;
}

export type TipoMovimiento = 'ingreso' | 'salida' | 'transferencia' | 'ajuste';

export interface ItemMovimiento {
  suministroId: string;
  cantidad: number;
  numeroLote: string | null;
  fechaVencimiento: IsoDate | null;
}

export interface Movimiento extends Entity {
  tipo: TipoMovimiento;
  fecha: IsoDate;
  /** Almacén del que sale el stock (salida, transferencia, ajuste negativo). */
  almacenOrigenId: string | null;
  /** Almacén al que entra el stock (ingreso, transferencia, ajuste positivo). */
  almacenDestinoId: string | null;
  documento: string;
  motivo: string;
  items: ItemMovimiento[];
  observaciones: string;
  fechaRegistro: IsoDateTime;
}

export type EstadoStock = 'normal' | 'bajo_minimo' | 'agotado';
export type EstadoVencimiento = 'vigente' | 'por_vencer' | 'vencido' | 'sin_vencimiento';

/** Fila de stock: un suministro en un almacén. */
export interface StockItem {
  key: string;
  suministro: Suministro;
  almacenId: string;
  establecimientoId: string;
  cantidad: number;
  estado: EstadoStock;
  proximoVencimiento: IsoDate | null;
  estadoVencimiento: EstadoVencimiento;
}

export type SuministroInput = Omit<Suministro, 'id'>;

export type TipoMovimientoRegistrable = Exclude<TipoMovimiento, 'ajuste'>;

export interface MovimientoInput {
  tipo: TipoMovimientoRegistrable;
  fecha: IsoDate;
  almacenOrigenId: string | null;
  almacenDestinoId: string | null;
  documento: string;
  motivo: string;
  observaciones: string;
  items: ItemMovimiento[];
}

/** Valores iniciales del formulario de movimiento (desde una fila de stock). */
export interface MovimientoPreset {
  almacenId?: string;
  suministroId?: string;
}

/** Regla RN-S2: días de anticipación para alertar un vencimiento. */
export const DIAS_ALERTA_VENCIMIENTO = 30;

export const ESTADO_STOCK_LABEL: Record<EstadoStock, string> = {
  normal: 'Normal',
  bajo_minimo: 'Bajo mínimo',
  agotado: 'Agotado',
};

export const ESTADO_VENCIMIENTO_LABEL: Record<EstadoVencimiento, string> = {
  vigente: 'Vigente',
  por_vencer: 'Por vencer',
  vencido: 'Vencido',
  sin_vencimiento: 'Sin vencimiento',
};

export const CATEGORIA_SUMINISTRO_LABEL: Record<CategoriaSuministro, string> = {
  viveres: 'Víveres',
  limpieza: 'Limpieza',
  aseo_personal: 'Aseo personal',
  utiles: 'Útiles de escritorio',
  medicinas: 'Medicinas',
};

export const UNIDAD_LABEL: Record<UnidadMedida, string> = {
  unidad: 'unidad',
  kg: 'kg',
  litro: 'litro',
  paquete: 'paquete',
  caja: 'caja',
  frasco: 'frasco',
  bolsa: 'bolsa',
  lata: 'lata',
};

export const TIPO_MOVIMIENTO_LABEL: Record<TipoMovimiento, string> = {
  ingreso: 'Ingreso',
  salida: 'Salida',
  transferencia: 'Transferencia',
  ajuste: 'Ajuste',
};

export const MOTIVOS_MOVIMIENTO: Record<TipoMovimientoRegistrable, readonly string[]> = {
  ingreso: ['Compra', 'Donación', 'Distribución de sede central', 'Devolución'],
  salida: ['Consumo', 'Merma', 'Vencimiento', 'Deterioro'],
  transferencia: ['Redistribución entre almacenes', 'Reposición a otro CAR'],
};
