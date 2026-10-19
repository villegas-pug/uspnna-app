// Registro único de colecciones del prototipo con sus datos iniciales (src/mocks/*.json).
// Los servicios de cada módulo acceden a los datos solo a través de este registro.
import { createCollection, type Collection } from 'src/core/data/collection';
import type { Entity } from 'src/core/types/common';
import type { Almacen, Ambiente, Establecimiento } from 'src/modules/establecimientos/types';
import type { BienPatrimonial, EventoBien } from 'src/modules/bienes/types';
import type { Lote, Movimiento, Suministro } from 'src/modules/suministros/types';
import type {
  Campania,
  ConteoSuministro,
  UnidadVerificada,
  VerificacionBien,
} from 'src/modules/campanias/types';
import type { ItemConciliacion } from 'src/modules/conciliacion/types';

import establecimientosSeed from 'src/mocks/establecimientos.json';
import ambientesSeed from 'src/mocks/ambientes.json';
import almacenesSeed from 'src/mocks/almacenes.json';
import bienesSeed from 'src/mocks/bienes.json';
import historialSeed from 'src/mocks/historial-bienes.json';
import suministrosSeed from 'src/mocks/suministros.json';
import lotesSeed from 'src/mocks/lotes.json';
import movimientosSeed from 'src/mocks/movimientos.json';
import campaniasSeed from 'src/mocks/campanias.json';
import verificacionesSeed from 'src/mocks/verificaciones-bienes.json';
import conteosSeed from 'src/mocks/conteos-suministros.json';
import unidadesSeed from 'src/mocks/unidades-verificadas.json';
import conciliacionesSeed from 'src/mocks/conciliaciones.json';

// Los JSON se generan con scripts/generar-mocks.mjs respetando estos tipos
function seed<T>(data: unknown): readonly T[] {
  return data as T[];
}

export const db = {
  establecimientos: createCollection<Establecimiento>('establecimientos', seed(establecimientosSeed)),
  ambientes: createCollection<Ambiente>('ambientes', seed(ambientesSeed)),
  almacenes: createCollection<Almacen>('almacenes', seed(almacenesSeed)),
  bienes: createCollection<BienPatrimonial>('bienes', seed(bienesSeed)),
  historialBienes: createCollection<EventoBien>('historial-bienes', seed(historialSeed)),
  suministros: createCollection<Suministro>('suministros', seed(suministrosSeed)),
  lotes: createCollection<Lote>('lotes', seed(lotesSeed)),
  movimientos: createCollection<Movimiento>('movimientos', seed(movimientosSeed)),
  campanias: createCollection<Campania>('campanias', seed(campaniasSeed)),
  verificaciones: createCollection<VerificacionBien>('verificaciones-bienes', seed(verificacionesSeed)),
  conteos: createCollection<ConteoSuministro>('conteos-suministros', seed(conteosSeed)),
  unidadesVerificadas: createCollection<UnidadVerificada>('unidades-verificadas', seed(unidadesSeed)),
  conciliaciones: createCollection<ItemConciliacion>('conciliaciones', seed(conciliacionesSeed)),
} as const;

export type CollectionName = keyof typeof db;

export const COLLECTION_LABEL: Record<CollectionName, string> = {
  establecimientos: 'Establecimientos (CAR)',
  ambientes: 'Ambientes',
  almacenes: 'Almacenes',
  bienes: 'Bienes patrimoniales',
  historialBienes: 'Historial de bienes',
  suministros: 'Catálogo de suministros',
  lotes: 'Lotes',
  movimientos: 'Movimientos de almacén',
  campanias: 'Campañas de inventario',
  verificaciones: 'Verificaciones de bienes',
  conteos: 'Conteos de suministros',
  unidadesVerificadas: 'Unidades verificadas',
  conciliaciones: 'Resultados de conciliación',
};

function allCollections(): Collection<Entity>[] {
  return Object.values(db);
}

/**
 * Ejecuta una operación que modifica varias colecciones. Si alguna escritura falla
 * (p. ej. cuota de almacenamiento), restaura todas las colecciones a su estado previo.
 */
export function runTransaction<T>(operation: () => T): T {
  const collections = allCollections();
  const snapshot = collections.map((collection) => collection.all());
  try {
    return operation();
  } catch (error) {
    collections.forEach((collection, index) => {
      const previous = snapshot[index];
      if (previous && previous !== collection.all()) collection.restore(previous);
    });
    throw error;
  }
}

/** Devuelve todas las colecciones a los datos iniciales. */
export function resetAllCollections(): void {
  allCollections().forEach((collection) => collection.reset());
}
