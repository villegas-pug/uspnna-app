// Servicio del catálogo de suministros
import { db } from 'src/core/data/db';
import { ensure } from 'src/core/errors';
import { nextId } from 'src/core/utils/id';
import { normalizeText } from 'src/core/utils/format';
import { simulateRequest } from 'src/core/utils/latency';
import type { EstadoRegistro } from 'src/core/types/common';
import type { Suministro, SuministroInput } from 'src/modules/suministros/types';

// ---------------------------------------------------------------------------
// Selectores
// ---------------------------------------------------------------------------
export function listarSuministros(): readonly Suministro[] {
  return db.suministros.items.value;
}

export function suministrosActivos(): Suministro[] {
  return listarSuministros().filter((s) => s.estado === 'activo');
}

export function obtenerSuministro(id: string | null | undefined): Suministro | undefined {
  return id ? db.suministros.items.value.find((s) => s.id === id) : undefined;
}

export function nombreSuministro(id: string | null | undefined): string {
  return obtenerSuministro(id)?.nombre ?? 'No registrado';
}

export function stockTotalSuministro(suministroId: string): number {
  return db.lotes.items.value
    .filter((lote) => lote.suministroId === suministroId)
    .reduce((total, lote) => total + lote.cantidad, 0);
}

// ---------------------------------------------------------------------------
// Comandos
// ---------------------------------------------------------------------------
function validar(input: SuministroInput, exceptId?: string): void {
  ensure(input.nombre.trim().length >= 3, 'Ingrese el nombre del suministro (mínimo 3 caracteres).');
  ensure(Number.isInteger(input.stockMinimo) && input.stockMinimo >= 0, 'El stock mínimo debe ser un número entero mayor o igual a cero.');
  const duplicado = db.suministros
    .all()
    .some((s) => s.id !== exceptId && normalizeText(s.nombre) === normalizeText(input.nombre));
  ensure(!duplicado, `Ya existe un suministro llamado "${input.nombre}". Use otro nombre.`);
}

export function crearSuministro(input: SuministroInput): Promise<Suministro> {
  return simulateRequest(() => {
    validar(input);
    const id = nextId('SUM', db.suministros.all().map((s) => s.id), 4);
    return db.suministros.insert({ ...input, nombre: input.nombre.trim(), descripcion: input.descripcion.trim(), id });
  });
}

export function actualizarSuministro(id: string, input: SuministroInput): Promise<Suministro> {
  return simulateRequest(() => {
    validar(input, id);
    const actual = obtenerSuministro(id);
    ensure(actual, 'El suministro ya no existe. Actualice la vista.');
    const conLotes = db.lotes.all().some((lote) => lote.suministroId === id && lote.cantidad > 0);
    ensure(
      actual.controlaVencimiento === input.controlaVencimiento || !conLotes,
      'No puede cambiar el control de vencimiento de un suministro con stock. Registre primero su salida.',
    );
    return db.suministros.update(id, { ...input, nombre: input.nombre.trim(), descripcion: input.descripcion.trim() });
  });
}

/** Un suministro con movimientos no se elimina: se desactiva para conservar la trazabilidad. */
export function cambiarEstadoSuministro(id: string, estado: EstadoRegistro): Promise<Suministro> {
  return simulateRequest(() => {
    if (estado === 'inactivo') {
      ensure(stockTotalSuministro(id) === 0, 'El suministro tiene stock. Registre su salida antes de desactivarlo.');
    }
    return db.suministros.update(id, { estado });
  });
}
