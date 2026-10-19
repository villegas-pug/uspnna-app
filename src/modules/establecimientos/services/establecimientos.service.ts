// Servicio del módulo Establecimientos.
// Selectores: lecturas síncronas y reactivas (usarlas dentro de computed).
// Comandos: operaciones asíncronas con latencia simulada que validan las reglas RN-E*.
import { db, runTransaction } from 'src/core/data/db';
import { ensure } from 'src/core/errors';
import { nextId } from 'src/core/utils/id';
import { normalizeText } from 'src/core/utils/format';
import { simulateRequest } from 'src/core/utils/latency';
import type { EstadoRegistro, SelectOption } from 'src/core/types/common';
import type {
  Almacen,
  AlmacenInput,
  Ambiente,
  AmbienteInput,
  Establecimiento,
  EstablecimientoInput,
} from 'src/modules/establecimientos/types';

const SIN_REGISTRO = 'No registrado';

// ---------------------------------------------------------------------------
// Selectores
// ---------------------------------------------------------------------------
export function listarEstablecimientos(): readonly Establecimiento[] {
  return db.establecimientos.items.value;
}

export function establecimientosActivos(): Establecimiento[] {
  return listarEstablecimientos().filter((car) => car.estado === 'activo');
}

export function obtenerEstablecimiento(id: string | null | undefined): Establecimiento | undefined {
  return id ? db.establecimientos.items.value.find((car) => car.id === id) : undefined;
}

export function nombreEstablecimiento(id: string | null | undefined): string {
  return obtenerEstablecimiento(id)?.nombre ?? SIN_REGISTRO;
}

export function listarAmbientes(establecimientoId?: string | null): readonly Ambiente[] {
  const ambientes = db.ambientes.items.value;
  return establecimientoId ? ambientes.filter((a) => a.establecimientoId === establecimientoId) : ambientes;
}

export function obtenerAmbiente(id: string | null | undefined): Ambiente | undefined {
  return id ? db.ambientes.items.value.find((a) => a.id === id) : undefined;
}

export function nombreAmbiente(id: string | null | undefined): string {
  return obtenerAmbiente(id)?.nombre ?? SIN_REGISTRO;
}

/** "Cocina – CAR Esperanza" para listas que mezclan CAR. */
export function ubicacionAmbiente(id: string | null | undefined): string {
  const ambiente = obtenerAmbiente(id);
  return ambiente ? `${ambiente.nombre} – ${nombreEstablecimiento(ambiente.establecimientoId)}` : SIN_REGISTRO;
}

export function listarAlmacenes(establecimientoId?: string | null): readonly Almacen[] {
  const almacenes = db.almacenes.items.value;
  return establecimientoId ? almacenes.filter((a) => a.establecimientoId === establecimientoId) : almacenes;
}

export function obtenerAlmacen(id: string | null | undefined): Almacen | undefined {
  return id ? db.almacenes.items.value.find((a) => a.id === id) : undefined;
}

/** "Almacén de víveres – CAR Esperanza" */
export function nombreAlmacen(id: string | null | undefined): string {
  const almacen = obtenerAlmacen(id);
  return almacen ? `${almacen.nombre} – ${nombreEstablecimiento(almacen.establecimientoId)}` : SIN_REGISTRO;
}

// Opciones para QSelect
export function opcionesEstablecimientos(soloActivos = true): SelectOption[] {
  return listarEstablecimientos()
    .filter((car) => !soloActivos || car.estado === 'activo')
    .map((car) => ({ label: car.nombre, value: car.id }));
}

export function opcionesAmbientes(establecimientoId: string | null | undefined): SelectOption[] {
  if (!establecimientoId) return [];
  return listarAmbientes(establecimientoId)
    .filter((a) => a.estado === 'activo')
    .map((a) => ({ label: a.nombre, value: a.id }));
}

export function opcionesAlmacenes(establecimientoId?: string | null): SelectOption[] {
  return listarAlmacenes(establecimientoId)
    .filter((a) => a.estado === 'activo')
    .map((a) => ({ label: establecimientoId ? a.nombre : nombreAlmacen(a.id), value: a.id }));
}

export function contarBienesActivos(filtro: { establecimientoId?: string; ambienteId?: string }): number {
  return db.bienes.items.value.filter(
    (bien) =>
      bien.situacion === 'activo' &&
      (!filtro.establecimientoId || bien.establecimientoId === filtro.establecimientoId) &&
      (!filtro.ambienteId || bien.ambienteId === filtro.ambienteId),
  ).length;
}

export function stockTotalAlmacen(almacenId: string): number {
  return db.lotes.items.value
    .filter((lote) => lote.almacenId === almacenId)
    .reduce((total, lote) => total + lote.cantidad, 0);
}

// ---------------------------------------------------------------------------
// Validaciones
// ---------------------------------------------------------------------------
function validarEstablecimiento(input: EstablecimientoInput, exceptId?: string): void {
  ensure(input.nombre.trim().length >= 3, 'Ingrese el nombre del establecimiento (mínimo 3 caracteres).');
  ensure(input.capacidad > 0, 'La capacidad debe ser mayor que cero.');
  const duplicado = db.establecimientos
    .all()
    .some((car) => car.id !== exceptId && normalizeText(car.nombre) === normalizeText(input.nombre));
  ensure(!duplicado, `Ya existe un establecimiento llamado "${input.nombre}". Use otro nombre.`);
}

function validarAmbiente(input: AmbienteInput, exceptId?: string): void {
  ensure(obtenerEstablecimiento(input.establecimientoId), 'Seleccione el establecimiento del ambiente.');
  ensure(input.nombre.trim().length >= 3, 'Ingrese el nombre del ambiente (mínimo 3 caracteres).');
  const duplicado = db.ambientes
    .all()
    .some(
      (a) =>
        a.id !== exceptId &&
        a.establecimientoId === input.establecimientoId &&
        normalizeText(a.nombre) === normalizeText(input.nombre),
    );
  ensure(!duplicado, `El CAR ya tiene un ambiente llamado "${input.nombre}". Use otro nombre.`);
}

function validarAlmacen(input: AlmacenInput, exceptId?: string): void {
  ensure(obtenerEstablecimiento(input.establecimientoId), 'Seleccione el establecimiento del almacén.');
  ensure(input.nombre.trim().length >= 3, 'Ingrese el nombre del almacén (mínimo 3 caracteres).');
  const duplicado = db.almacenes
    .all()
    .some(
      (a) =>
        a.id !== exceptId &&
        a.establecimientoId === input.establecimientoId &&
        normalizeText(a.nombre) === normalizeText(input.nombre),
    );
  ensure(!duplicado, `El CAR ya tiene un almacén llamado "${input.nombre}". Use otro nombre.`);
}

function limpiar<T extends { nombre: string }>(input: T): T {
  return { ...input, nombre: input.nombre.trim() };
}

// ---------------------------------------------------------------------------
// Comandos: establecimientos
// ---------------------------------------------------------------------------
export function crearEstablecimiento(input: EstablecimientoInput): Promise<Establecimiento> {
  return simulateRequest(() => {
    validarEstablecimiento(input);
    const id = nextId('CAR', db.establecimientos.all().map((car) => car.id), 2);
    return db.establecimientos.insert({ ...limpiar(input), id });
  });
}

export function actualizarEstablecimiento(id: string, input: EstablecimientoInput): Promise<Establecimiento> {
  return simulateRequest(() => {
    validarEstablecimiento(input, id);
    return db.establecimientos.update(id, limpiar(input));
  });
}

/** RN-E2: los CAR no se eliminan, se desactivan. */
export function cambiarEstadoEstablecimiento(id: string, estado: EstadoRegistro): Promise<Establecimiento> {
  return simulateRequest(() => db.establecimientos.update(id, { estado }));
}

// ---------------------------------------------------------------------------
// Comandos: ambientes
// ---------------------------------------------------------------------------
export function crearAmbiente(input: AmbienteInput): Promise<Ambiente> {
  return simulateRequest(() => {
    validarAmbiente(input);
    const id = nextId('AMB', db.ambientes.all().map((a) => a.id), 4);
    return db.ambientes.insert({ ...limpiar(input), id });
  });
}

export function actualizarAmbiente(id: string, input: AmbienteInput): Promise<Ambiente> {
  return simulateRequest(() => {
    validarAmbiente(input, id);
    const actual = obtenerAmbiente(id);
    ensure(actual, 'El ambiente ya no existe. Actualice la vista.');
    ensure(
      actual.establecimientoId === input.establecimientoId || contarBienesActivos({ ambienteId: id }) === 0,
      'No puede cambiar el CAR de un ambiente con bienes. Transfiera primero sus bienes.',
    );
    return db.ambientes.update(id, limpiar(input));
  });
}

/** RN-E1: solo se elimina un ambiente sin bienes ni verificaciones asociadas. */
export function eliminarAmbiente(id: string): Promise<void> {
  return simulateRequest(() => {
    const conBienes = db.bienes.all().some((bien) => bien.ambienteId === id);
    ensure(
      !conBienes,
      'El ambiente tiene bienes registrados (activos o de baja). Transfiera sus bienes o desactive el ambiente.',
    );
    const verificado = db.verificaciones.all().some((v) => v.ambienteId === id);
    ensure(!verificado, 'El ambiente tiene verificaciones de campaña. Desactívelo en lugar de eliminarlo.');
    db.ambientes.remove(id);
  });
}

// ---------------------------------------------------------------------------
// Comandos: almacenes
// ---------------------------------------------------------------------------
export function crearAlmacen(input: AlmacenInput): Promise<Almacen> {
  return simulateRequest(() => {
    validarAlmacen(input);
    const id = nextId('ALM', db.almacenes.all().map((a) => a.id), 3);
    return db.almacenes.insert({ ...limpiar(input), id });
  });
}

export function actualizarAlmacen(id: string, input: AlmacenInput): Promise<Almacen> {
  return simulateRequest(() => {
    validarAlmacen(input, id);
    const actual = obtenerAlmacen(id);
    ensure(actual, 'El almacén ya no existe. Actualice la vista.');
    ensure(
      actual.establecimientoId === input.establecimientoId || stockTotalAlmacen(id) === 0,
      'No puede cambiar el CAR de un almacén con stock. Transfiera primero su stock.',
    );
    return db.almacenes.update(id, limpiar(input));
  });
}

/** RN-E1: solo se elimina un almacén sin stock ni movimientos (trazabilidad). */
export function eliminarAlmacen(id: string): Promise<void> {
  return simulateRequest(() => {
    ensure(stockTotalAlmacen(id) === 0, 'El almacén tiene stock. Registre la salida o transferencia antes de eliminarlo.');
    const conMovimientos = db.movimientos
      .all()
      .some((m) => m.almacenOrigenId === id || m.almacenDestinoId === id);
    ensure(!conMovimientos, 'El almacén tiene movimientos registrados. Desactívelo para conservar la trazabilidad.');
    runTransaction(() => {
      for (const lote of db.lotes.all().filter((l) => l.almacenId === id)) db.lotes.remove(lote.id);
      db.almacenes.remove(id);
    });
  });
}
