// Modelo del módulo Establecimientos: Centros de Acogida Residencial (CAR), ambientes y almacenes
import type { Entity, EstadoRegistro, IsoDate } from 'src/core/types/common';

export type EstadoLevantamiento = 'pendiente' | 'en_curso' | 'completado';

export interface Establecimiento extends Entity {
  nombre: string;
  tipoPoblacion: string;
  capacidad: number;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  responsable: string;
  estado: EstadoRegistro;
  estadoLevantamiento: EstadoLevantamiento;
  fechaLevantamiento: IsoDate | null;
}

export type TipoAmbiente =
  | 'dormitorio'
  | 'cocina'
  | 'comedor'
  | 'oficina'
  | 'estudio'
  | 'salud'
  | 'servicios'
  | 'recreacion';

export interface Ambiente extends Entity {
  establecimientoId: string;
  nombre: string;
  tipo: TipoAmbiente;
  piso: string;
  custodio: string;
  estado: EstadoRegistro;
}

export type TipoAlmacen = 'viveres' | 'general';

export interface Almacen extends Entity {
  establecimientoId: string;
  nombre: string;
  tipo: TipoAlmacen;
  responsable: string;
  estado: EstadoRegistro;
}

export type EstablecimientoInput = Omit<Establecimiento, 'id'>;
export type AmbienteInput = Omit<Ambiente, 'id'>;
export type AlmacenInput = Omit<Almacen, 'id'>;

export const ESTADO_LEVANTAMIENTO_LABEL: Record<EstadoLevantamiento, string> = {
  pendiente: 'Pendiente',
  en_curso: 'En curso',
  completado: 'Completado',
};

export const DEPARTAMENTOS = [
  'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca', 'Callao', 'Cusco',
  'Huancavelica', 'Huánuco', 'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima', 'Loreto',
  'Madre de Dios', 'Moquegua', 'Pasco', 'Piura', 'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali',
] as const;

export const TIPO_AMBIENTE_LABEL: Record<TipoAmbiente, string> = {
  dormitorio: 'Dormitorio',
  cocina: 'Cocina',
  comedor: 'Comedor',
  oficina: 'Oficina',
  estudio: 'Sala de estudio',
  salud: 'Tópico',
  servicios: 'Servicios',
  recreacion: 'Recreación',
};

export const TIPO_ALMACEN_LABEL: Record<TipoAlmacen, string> = {
  viveres: 'Víveres',
  general: 'General (limpieza, aseo, útiles y medicinas)',
};
