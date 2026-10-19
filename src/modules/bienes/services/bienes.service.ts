// Servicio del módulo Bienes patrimoniales (reglas RN-B*).
// Toda operación que modifica un bien deja un evento en el historial (RN-B6).
import { db, runTransaction } from 'src/core/data/db';
import { ensure } from 'src/core/errors';
import { nextId } from 'src/core/utils/id';
import { nowIso } from 'src/core/utils/format';
import { simulateRequest } from 'src/core/utils/latency';
import { RESPONSABLE_PROTOTIPO } from 'src/core/types/common';
import {
  nombreAmbiente,
  obtenerAmbiente,
  obtenerEstablecimiento,
  ubicacionAmbiente,
} from 'src/modules/establecimientos/services/establecimientos.service';
import {
  CATEGORIA_BIEN_LABEL,
  CODIGO_PATRIMONIAL_REGEX,
  ESTADO_CONSERVACION_LABEL,
  MAX_FOTOS_BIEN,
  type BajaBienInput,
  type BienInput,
  type BienPatrimonial,
  type EventoBien,
  type TipoEventoBien,
  type TransferenciaBienInput,
} from 'src/modules/bienes/types';

// ---------------------------------------------------------------------------
// Selectores
// ---------------------------------------------------------------------------
export function listarBienes(): readonly BienPatrimonial[] {
  return db.bienes.items.value;
}

export function obtenerBien(id: string | null | undefined): BienPatrimonial | undefined {
  return id ? db.bienes.items.value.find((bien) => bien.id === id) : undefined;
}

export function bienesActivosEn(ambienteId: string): BienPatrimonial[] {
  return db.bienes.items.value.filter((bien) => bien.ambienteId === ambienteId && bien.situacion === 'activo');
}

export function listarHistorial(): readonly EventoBien[] {
  return db.historialBienes.items.value;
}

/** Eventos de un bien, del más reciente al más antiguo. */
export function historialDeBien(bienId: string): EventoBien[] {
  return db.historialBienes.items.value
    .filter((evento) => evento.bienId === bienId)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}

export function codigoPatrimonialEnUso(codigo: string, exceptId?: string): BienPatrimonial | undefined {
  return db.bienes.items.value.find((bien) => bien.codigoPatrimonial === codigo && bien.id !== exceptId);
}

// ---------------------------------------------------------------------------
// Operaciones internas (usadas también por la conciliación dentro de una transacción)
// ---------------------------------------------------------------------------
export function registrarEventoBien(
  bienId: string,
  tipo: TipoEventoBien,
  descripcion: string,
  ambienteOrigenId: string | null = null,
  ambienteDestinoId: string | null = null,
): EventoBien {
  return db.historialBienes.insert({
    id: nextId('HIS', db.historialBienes.all().map((e) => e.id), 6),
    bienId,
    fecha: nowIso(),
    tipo,
    descripcion,
    ambienteOrigenId,
    ambienteDestinoId,
    responsable: RESPONSABLE_PROTOTIPO,
  });
}

export function siguienteIdBien(): string {
  return nextId('BP', db.bienes.all().map((bien) => bien.id), 6);
}

/** Mueve un bien a otro ambiente (y su CAR) sin validar estado; registra el evento indicado. */
export function moverBien(
  bienId: string,
  ambienteDestinoId: string,
  custodio: string,
  tipo: Extract<TipoEventoBien, 'transferencia' | 'regularizacion'>,
  descripcion: string,
): BienPatrimonial {
  const bien = obtenerBien(bienId);
  const destino = obtenerAmbiente(ambienteDestinoId);
  ensure(bien, 'El bien ya no existe. Actualice la vista.');
  ensure(destino, 'Seleccione un ambiente de destino válido.');
  const actualizado = db.bienes.update(bien.id, {
    establecimientoId: destino.establecimientoId,
    ambienteId: destino.id,
    custodio,
    fechaActualizacion: nowIso(),
  });
  registrarEventoBien(bien.id, tipo, descripcion, bien.ambienteId, destino.id);
  return actualizado;
}

export function aplicarBaja(bienId: string, motivo: string, tipo: Extract<TipoEventoBien, 'baja' | 'regularizacion'>, descripcion: string): BienPatrimonial {
  const bien = obtenerBien(bienId);
  ensure(bien, 'El bien ya no existe. Actualice la vista.');
  ensure(bien.situacion === 'activo', `El bien ${bien.id} ya está dado de baja.`);
  const actualizado = db.bienes.update(bien.id, {
    situacion: 'baja',
    motivoBaja: motivo,
    fechaActualizacion: nowIso(),
  });
  registrarEventoBien(bien.id, tipo, descripcion);
  return actualizado;
}

// ---------------------------------------------------------------------------
// Validaciones
// ---------------------------------------------------------------------------
function normalizarInput(input: BienInput): BienInput {
  const codigo = input.codigoPatrimonial?.trim() ?? '';
  return {
    ...input,
    codigoPatrimonial: codigo === '' ? null : codigo,
    descripcion: input.descripcion.trim(),
    marca: input.marca.trim(),
    modelo: input.modelo.trim(),
    serie: input.serie.trim(),
    color: input.color.trim(),
    custodio: input.custodio.trim(),
    observaciones: input.observaciones.trim(),
  };
}

function validarBien(input: BienInput, exceptId?: string): void {
  ensure(input.descripcion.length >= 3, 'Ingrese la descripción del bien (mínimo 3 caracteres).');
  ensure(CATEGORIA_BIEN_LABEL[input.categoria], 'Seleccione la categoría del bien.');
  if (input.codigoPatrimonial !== null) {
    ensure(
      CODIGO_PATRIMONIAL_REGEX.test(input.codigoPatrimonial),
      'El código patrimonial tiene 12 dígitos. Corríjalo o déjelo vacío si el bien aún no tiene código oficial.',
    );
    const enUso = codigoPatrimonialEnUso(input.codigoPatrimonial, exceptId);
    ensure(!enUso, `El código patrimonial ya está asignado al bien ${enUso?.id ?? ''}. Verifique la etiqueta.`);
  }
  const ambiente = obtenerAmbiente(input.ambienteId);
  ensure(obtenerEstablecimiento(input.establecimientoId), 'Seleccione el establecimiento (CAR) del bien.');
  ensure(ambiente && ambiente.establecimientoId === input.establecimientoId, 'Seleccione un ambiente del CAR elegido.');
  ensure(input.fotos.length <= MAX_FOTOS_BIEN, `Puede adjuntar hasta ${MAX_FOTOS_BIEN} fotografías por bien.`);
  ensure(input.valorReferencial === null || input.valorReferencial >= 0, 'El valor referencial no puede ser negativo.');
}

function describirCambios(anterior: BienPatrimonial, nuevo: BienInput): string {
  const cambios: string[] = [];
  if (anterior.estadoConservacion !== nuevo.estadoConservacion) {
    cambios.push(
      `estado de conservación de ${ESTADO_CONSERVACION_LABEL[anterior.estadoConservacion]} a ${ESTADO_CONSERVACION_LABEL[nuevo.estadoConservacion]}`,
    );
  }
  if (anterior.codigoPatrimonial !== nuevo.codigoPatrimonial) {
    cambios.push(nuevo.codigoPatrimonial ? `código patrimonial ${nuevo.codigoPatrimonial}` : 'código patrimonial retirado');
  }
  const campos: [keyof BienInput, string][] = [
    ['descripcion', 'descripción'],
    ['categoria', 'categoría'],
    ['marca', 'marca'],
    ['modelo', 'modelo'],
    ['serie', 'serie'],
    ['color', 'color'],
    ['custodio', 'custodio'],
    ['fechaAdquisicion', 'fecha de adquisición'],
    ['valorReferencial', 'valor referencial'],
    ['observaciones', 'observaciones'],
  ];
  for (const [campo, etiqueta] of campos) {
    if (anterior[campo] !== nuevo[campo]) cambios.push(etiqueta);
  }
  if (anterior.fotos.length !== nuevo.fotos.length) cambios.push('fotografías');
  return cambios.length > 0 ? `Actualización de datos: ${cambios.join(', ')}.` : 'Actualización sin cambios de datos.';
}

// ---------------------------------------------------------------------------
// Comandos
// ---------------------------------------------------------------------------
export function registrarBien(input: BienInput): Promise<BienPatrimonial> {
  return simulateRequest(() => {
    const datos = normalizarInput(input);
    validarBien(datos);
    return runTransaction(() => {
      const fecha = nowIso();
      const bien = db.bienes.insert({
        ...datos,
        id: siguienteIdBien(),
        situacion: 'activo',
        motivoBaja: null,
        fechaRegistro: fecha,
        fechaActualizacion: fecha,
      });
      registrarEventoBien(bien.id, 'registro', `Registro del bien en ${nombreAmbiente(bien.ambienteId)}.`, null, bien.ambienteId);
      return bien;
    });
  });
}

/** RN-B3: la ubicación no cambia en la edición; se mantiene la registrada. */
export function actualizarBien(id: string, input: BienInput): Promise<BienPatrimonial> {
  return simulateRequest(() => {
    const anterior = obtenerBien(id);
    ensure(anterior, 'El bien ya no existe. Actualice la vista.');
    ensure(anterior.situacion === 'activo', 'El bien está dado de baja y no se puede editar.');
    const datos = normalizarInput({
      ...input,
      establecimientoId: anterior.establecimientoId,
      ambienteId: anterior.ambienteId,
    });
    validarBien(datos, id);
    return runTransaction(() => {
      const actualizado = db.bienes.update(id, { ...datos, fechaActualizacion: nowIso() });
      registrarEventoBien(id, 'actualizacion', describirCambios(anterior, datos));
      return actualizado;
    });
  });
}

export function transferirBien(id: string, input: TransferenciaBienInput): Promise<BienPatrimonial> {
  return simulateRequest(() => {
    const bien = obtenerBien(id);
    ensure(bien, 'El bien ya no existe. Actualice la vista.');
    ensure(bien.situacion === 'activo', 'El bien está dado de baja y no se puede transferir.');
    ensure(input.ambienteId !== bien.ambienteId, 'Seleccione un ambiente distinto al actual.');
    const destino = obtenerAmbiente(input.ambienteId);
    ensure(destino && destino.establecimientoId === input.establecimientoId, 'Seleccione un ambiente del CAR de destino.');
    ensure(input.motivo.trim().length >= 5, 'Indique el motivo de la transferencia (mínimo 5 caracteres).');
    const descripcion = `Transferencia de ${ubicacionAmbiente(bien.ambienteId)} a ${ubicacionAmbiente(destino.id)}. Motivo: ${input.motivo.trim()}.`;
    return runTransaction(() => moverBien(id, destino.id, input.custodio.trim() || destino.custodio, 'transferencia', descripcion));
  });
}

/** RN-B4: la baja no elimina el bien; exige motivo y sustento. */
export function darDeBajaBien(id: string, input: BajaBienInput): Promise<BienPatrimonial> {
  return simulateRequest(() => {
    ensure(input.motivo.trim(), 'Seleccione el motivo de la baja.');
    ensure(input.sustento.trim().length >= 10, 'Describa el sustento de la baja (mínimo 10 caracteres).');
    const descripcion = `Baja del bien. Motivo: ${input.motivo}. Sustento: ${input.sustento.trim()}`;
    return runTransaction(() => aplicarBaja(id, input.motivo, 'baja', descripcion));
  });
}
