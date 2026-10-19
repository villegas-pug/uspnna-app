// Servicio de stock: lotes, vencimientos y movimientos de almacén (reglas RN-S*)
import { db, runTransaction } from 'src/core/data/db';
import { BusinessError, ensure } from 'src/core/errors';
import { nextId } from 'src/core/utils/id';
import { daysFromToday, formatNumber, nowIso, todayIso } from 'src/core/utils/format';
import { simulateRequest } from 'src/core/utils/latency';
import type { IsoDate } from 'src/core/types/common';
import { obtenerAlmacen } from 'src/modules/establecimientos/services/establecimientos.service';
import { obtenerSuministro } from 'src/modules/suministros/services/suministros.service';
import {
  DIAS_ALERTA_VENCIMIENTO,
  type EstadoStock,
  type EstadoVencimiento,
  type ItemMovimiento,
  type Lote,
  type Movimiento,
  type MovimientoInput,
  type StockItem,
  type TipoMovimiento,
} from 'src/modules/suministros/types';

// ---------------------------------------------------------------------------
// Reglas de estado (RN-S1, RN-S2)
// ---------------------------------------------------------------------------
export function estadoStock(cantidad: number, stockMinimo: number): EstadoStock {
  if (cantidad <= 0) return 'agotado';
  if (cantidad <= stockMinimo) return 'bajo_minimo';
  return 'normal';
}

export function estadoVencimiento(fecha: IsoDate | null): EstadoVencimiento {
  if (!fecha) return 'sin_vencimiento';
  const dias = daysFromToday(fecha);
  if (dias === null) return 'sin_vencimiento';
  if (dias < 0) return 'vencido';
  if (dias <= DIAS_ALERTA_VENCIMIENTO) return 'por_vencer';
  return 'vigente';
}

/** Orden FEFO: primero el lote que vence antes; los lotes sin vencimiento al final. */
function compararFefo(a: Lote, b: Lote): number {
  const venceA = a.fechaVencimiento ?? '9999-12-31';
  const venceB = b.fechaVencimiento ?? '9999-12-31';
  if (venceA !== venceB) return venceA < venceB ? -1 : 1;
  return a.fechaIngreso < b.fechaIngreso ? -1 : a.fechaIngreso > b.fechaIngreso ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Selectores
// ---------------------------------------------------------------------------
export function listarLotes(): readonly Lote[] {
  return db.lotes.items.value;
}

export function lotesDe(almacenId: string, suministroId: string): Lote[] {
  return db.lotes.items.value
    .filter((lote) => lote.almacenId === almacenId && lote.suministroId === suministroId)
    .sort(compararFefo);
}

export function stockDe(almacenId: string, suministroId: string): number {
  return lotesDe(almacenId, suministroId).reduce((total, lote) => total + lote.cantidad, 0);
}

/**
 * Stock que puede salir de un almacén. Para el motivo "Vencimiento" solo cuentan los lotes
 * vencidos; para el resto, los lotes vigentes (no se despachan productos vencidos).
 */
export function stockDisponible(almacenId: string, suministroId: string, motivo = ''): number {
  return lotesDisponibles(almacenId, suministroId, motivo).reduce((total, lote) => total + lote.cantidad, 0);
}

function lotesDisponibles(almacenId: string, suministroId: string, motivo: string): Lote[] {
  const soloVencidos = motivo === 'Vencimiento';
  return lotesDe(almacenId, suministroId).filter(
    (lote) => lote.cantidad > 0 && (estadoVencimiento(lote.fechaVencimiento) === 'vencido') === soloVencidos,
  );
}

/** Suministro → cantidad de un almacén. */
export function stockPorAlmacen(almacenId: string): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const lote of db.lotes.items.value) {
    if (lote.almacenId !== almacenId) continue;
    mapa.set(lote.suministroId, (mapa.get(lote.suministroId) ?? 0) + lote.cantidad);
  }
  return mapa;
}

/** Filas de stock: una por suministro con lotes en cada almacén. */
export function listarStock(): StockItem[] {
  const grupos = new Map<string, Lote[]>();
  for (const lote of db.lotes.items.value) {
    const key = `${lote.almacenId}|${lote.suministroId}`;
    const grupo = grupos.get(key);
    if (grupo) grupo.push(lote);
    else grupos.set(key, [lote]);
  }
  const filas: StockItem[] = [];
  for (const [key, lotes] of grupos) {
    const primero = lotes[0];
    if (!primero) continue;
    const suministro = obtenerSuministro(primero.suministroId);
    const almacen = obtenerAlmacen(primero.almacenId);
    if (!suministro || !almacen) continue;
    const cantidad = lotes.reduce((total, lote) => total + lote.cantidad, 0);
    const conStock = lotes.filter((lote) => lote.cantidad > 0 && lote.fechaVencimiento).sort(compararFefo);
    const proximoVencimiento = conStock[0]?.fechaVencimiento ?? null;
    filas.push({
      key,
      suministro,
      almacenId: almacen.id,
      establecimientoId: almacen.establecimientoId,
      cantidad,
      estado: estadoStock(cantidad, suministro.stockMinimo),
      proximoVencimiento,
      estadoVencimiento: estadoVencimiento(proximoVencimiento),
    });
  }
  return filas.sort((a, b) => a.suministro.nombre.localeCompare(b.suministro.nombre, 'es'));
}

export function listarMovimientos(tipo?: TipoMovimiento): Movimiento[] {
  return db.movimientos.items.value
    .filter((movimiento) => !tipo || movimiento.tipo === tipo)
    .slice()
    .sort((a, b) => (a.fechaRegistro < b.fechaRegistro ? 1 : -1));
}

export function obtenerMovimiento(id: string): Movimiento | undefined {
  return db.movimientos.items.value.find((movimiento) => movimiento.id === id);
}

export interface ResumenAlertas {
  bajoMinimo: number;
  agotados: number;
  porVencer: number;
  vencidos: number;
}

export function resumenAlertas(): ResumenAlertas {
  const stock = listarStock();
  const lotesConStock = db.lotes.items.value.filter((lote) => lote.cantidad > 0);
  return {
    bajoMinimo: stock.filter((fila) => fila.estado === 'bajo_minimo').length,
    agotados: stock.filter((fila) => fila.estado === 'agotado').length,
    porVencer: lotesConStock.filter((lote) => estadoVencimiento(lote.fechaVencimiento) === 'por_vencer').length,
    vencidos: lotesConStock.filter((lote) => estadoVencimiento(lote.fechaVencimiento) === 'vencido').length,
  };
}

// ---------------------------------------------------------------------------
// Operaciones internas sobre lotes (siempre dentro de una transacción)
// ---------------------------------------------------------------------------
function siguienteIdLote(): string {
  return nextId('LOT', db.lotes.all().map((lote) => lote.id), 5);
}

function agregarStock(almacenId: string, item: ItemMovimiento, fecha: IsoDate): void {
  const existente = db.lotes
    .all()
    .find(
      (lote) =>
        lote.almacenId === almacenId &&
        lote.suministroId === item.suministroId &&
        lote.numeroLote === item.numeroLote &&
        lote.fechaVencimiento === item.fechaVencimiento,
    );
  if (existente) {
    db.lotes.update(existente.id, { cantidad: existente.cantidad + item.cantidad });
    return;
  }
  db.lotes.insert({
    id: siguienteIdLote(),
    suministroId: item.suministroId,
    almacenId,
    numeroLote: item.numeroLote,
    fechaVencimiento: item.fechaVencimiento,
    cantidad: item.cantidad,
    fechaIngreso: fecha,
  });
}

/** Descuenta por FEFO y devuelve el detalle por lote (trazabilidad del movimiento). */
function descontarStock(lotes: Lote[], suministroId: string, cantidad: number): ItemMovimiento[] {
  const detalle: ItemMovimiento[] = [];
  let pendiente = cantidad;
  for (const lote of lotes) {
    if (pendiente <= 0) break;
    const tomado = Math.min(lote.cantidad, pendiente);
    if (tomado <= 0) continue;
    db.lotes.update(lote.id, { cantidad: lote.cantidad - tomado });
    detalle.push({ suministroId, cantidad: tomado, numeroLote: lote.numeroLote, fechaVencimiento: lote.fechaVencimiento });
    pendiente -= tomado;
  }
  return detalle;
}

function siguienteIdMovimiento(): string {
  return nextId('MOV', db.movimientos.all().map((m) => m.id), 6);
}

/** Ajuste de stock por diferencia de inventario (regularización de conciliación). */
export function aplicarAjusteStock(
  almacenId: string,
  suministroId: string,
  diferencia: number,
  documento: string,
  observaciones: string,
): Movimiento {
  ensure(diferencia !== 0, 'La diferencia de cantidad es cero; no hay nada que ajustar.');
  const fecha = todayIso();
  let items: ItemMovimiento[];
  if (diferencia > 0) {
    const item: ItemMovimiento = { suministroId, cantidad: diferencia, numeroLote: null, fechaVencimiento: null };
    agregarStock(almacenId, item, fecha);
    items = [item];
  } else {
    const faltante = Math.abs(diferencia);
    const actual = stockDe(almacenId, suministroId);
    ensure(
      actual >= faltante,
      `El stock actual (${formatNumber(actual)}) es menor que el ajuste (${formatNumber(faltante)}). Revise los movimientos posteriores al conteo.`,
    );
    items = descontarStock(lotesDe(almacenId, suministroId), suministroId, faltante);
  }
  return db.movimientos.insert({
    id: siguienteIdMovimiento(),
    tipo: 'ajuste',
    fecha,
    almacenOrigenId: diferencia < 0 ? almacenId : null,
    almacenDestinoId: diferencia > 0 ? almacenId : null,
    documento,
    motivo: 'Diferencia de cantidad en inventario',
    items,
    observaciones,
    fechaRegistro: nowIso(),
  });
}

// ---------------------------------------------------------------------------
// Validación y registro de movimientos
// ---------------------------------------------------------------------------
function validarMovimiento(input: MovimientoInput): void {
  ensure(input.fecha, 'Seleccione la fecha del movimiento.');
  ensure(input.fecha <= todayIso(), 'La fecha del movimiento no puede ser posterior a hoy.');
  ensure(input.motivo, 'Seleccione el motivo del movimiento.');
  ensure(input.items.length > 0, 'Agregue al menos un suministro al movimiento.');

  if (input.tipo === 'ingreso') {
    ensure(obtenerAlmacen(input.almacenDestinoId), 'Seleccione el almacén de destino.');
    ensure(input.documento.trim(), 'Ingrese el documento de referencia (guía, PECOSA o acta).');
  } else {
    ensure(obtenerAlmacen(input.almacenOrigenId), 'Seleccione el almacén de origen.');
  }
  if (input.tipo === 'transferencia') {
    ensure(obtenerAlmacen(input.almacenDestinoId), 'Seleccione el almacén de destino.');
    ensure(input.almacenOrigenId !== input.almacenDestinoId, 'El almacén de destino debe ser distinto al de origen.');
  }

  for (const item of input.items) {
    const suministro = obtenerSuministro(item.suministroId);
    ensure(suministro, 'Seleccione un suministro válido en cada ítem.');
    ensure(Number.isFinite(item.cantidad) && item.cantidad > 0, `Ingrese una cantidad mayor que cero para ${suministro.nombre}.`);
    if (input.tipo === 'ingreso' && suministro.controlaVencimiento) {
      ensure(item.numeroLote?.trim(), `Ingrese el número de lote de ${suministro.nombre}.`);
      ensure(item.fechaVencimiento, `Ingrese la fecha de vencimiento de ${suministro.nombre}.`);
    }
  }

  // RN-S4: el stock disponible debe cubrir la suma de cantidades por suministro
  if (input.tipo !== 'ingreso' && input.almacenOrigenId) {
    const porSuministro = new Map<string, number>();
    for (const item of input.items) {
      porSuministro.set(item.suministroId, (porSuministro.get(item.suministroId) ?? 0) + item.cantidad);
    }
    const motivo = input.tipo === 'salida' ? input.motivo : '';
    for (const [suministroId, cantidad] of porSuministro) {
      const disponible = stockDisponible(input.almacenOrigenId, suministroId, motivo);
      if (disponible < cantidad) {
        const accion = input.tipo === 'salida' ? 'salida' : 'transferencia';
        throw new BusinessError(
          `${obtenerSuministro(suministroId)?.nombre ?? 'Suministro'}: el stock disponible (${formatNumber(disponible)}) es menor que la cantidad de ${accion} (${formatNumber(cantidad)}). Reduzca la cantidad o registre un ingreso.`,
        );
      }
    }
  }
}

function normalizarItems(input: MovimientoInput): ItemMovimiento[] {
  return input.items.map((item) => {
    const controla = obtenerSuministro(item.suministroId)?.controlaVencimiento ?? false;
    return {
      suministroId: item.suministroId,
      cantidad: item.cantidad,
      numeroLote: controla ? (item.numeroLote?.trim() ?? null) : null,
      fechaVencimiento: controla ? item.fechaVencimiento : null,
    };
  });
}

export function registrarMovimiento(input: MovimientoInput): Promise<Movimiento> {
  return simulateRequest(() => {
    validarMovimiento(input);
    return runTransaction(() => {
      const items = normalizarItems(input);
      let detalle: ItemMovimiento[] = items;

      if (input.tipo === 'ingreso' && input.almacenDestinoId) {
        for (const item of items) agregarStock(input.almacenDestinoId, item, input.fecha);
      }

      if (input.tipo !== 'ingreso' && input.almacenOrigenId) {
        const origen = input.almacenOrigenId;
        const motivo = input.tipo === 'salida' ? input.motivo : '';
        detalle = items.flatMap((item) =>
          descontarStock(lotesDisponibles(origen, item.suministroId, motivo), item.suministroId, item.cantidad),
        );
        if (input.tipo === 'transferencia' && input.almacenDestinoId) {
          // RN-S5: el destino conserva número de lote y vencimiento
          for (const parte of detalle) agregarStock(input.almacenDestinoId, parte, input.fecha);
        }
      }

      return db.movimientos.insert({
        id: siguienteIdMovimiento(),
        tipo: input.tipo,
        fecha: input.fecha,
        almacenOrigenId: input.tipo === 'ingreso' ? null : input.almacenOrigenId,
        almacenDestinoId: input.tipo === 'salida' ? null : input.almacenDestinoId,
        documento: input.documento.trim(),
        motivo: input.motivo,
        items: detalle,
        observaciones: input.observaciones.trim(),
        fechaRegistro: nowIso(),
      });
    });
  });
}
