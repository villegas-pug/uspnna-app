// Indicadores y series del inicio (selectores reactivos sobre las colecciones)
import { db } from 'src/core/data/db';
import { listarEstablecimientos } from 'src/modules/establecimientos/services/establecimientos.service';
import { listarBienes } from 'src/modules/bienes/services/bienes.service';
import { listarStock, resumenAlertas, type ResumenAlertas } from 'src/modules/suministros/services/stock.service';
import { avanceUnidades, listarCampanias } from 'src/modules/campanias/services/campanias.service';
import { calcularTotales } from 'src/modules/conciliacion/services/conciliacion.service';
import { ESTADO_CONSERVACION_LABEL, type EstadoConservacion } from 'src/modules/bienes/types';
import type { EstadoLevantamiento } from 'src/modules/establecimientos/types';
import type { Campania } from 'src/modules/campanias/types';
import type { StockItem } from 'src/modules/suministros/types';
import type { BarDatum } from 'src/components/types';

export interface Indicadores {
  establecimientos: number;
  carCompletados: number;
  bienes: number;
  sinCodigo: number;
  suministros: number;
  alertas: ResumenAlertas;
  campaniasActivas: number;
  campaniasEnCurso: number;
  diferencias: number;
  porRegularizar: number;
}

export function indicadores(): Indicadores {
  const cars = listarEstablecimientos().filter((car) => car.estado === 'activo');
  const bienes = listarBienes().filter((bien) => bien.situacion === 'activo');
  const campanias = db.campanias.items.value;
  const abiertas = new Set(campanias.filter((c) => c.estado !== 'cerrada' && c.estado !== 'planificada').map((c) => c.id));
  const items = db.conciliaciones.items.value.filter((item) => abiertas.has(item.campaniaId));
  const totales = calcularTotales(items);
  return {
    establecimientos: cars.length,
    carCompletados: cars.filter((car) => car.estadoLevantamiento === 'completado').length,
    bienes: bienes.length,
    sinCodigo: bienes.filter((bien) => !bien.codigoPatrimonial).length,
    suministros: db.suministros.items.value.filter((s) => s.estado === 'activo').length,
    alertas: resumenAlertas(),
    campaniasActivas: abiertas.size,
    campaniasEnCurso: campanias.filter((c) => c.estado === 'en_curso').length,
    diferencias:
      totales.faltantes + totales.sobrantes + totales.diferenciasUbicacion + totales.diferenciasCantidad,
    porRegularizar: totales.porRegularizar,
  };
}

const ORDEN_CONSERVACION: EstadoConservacion[] = ['bueno', 'regular', 'malo', 'sin_evaluar'];

export function bienesPorEstado(): BarDatum[] {
  const activos = listarBienes().filter((bien) => bien.situacion === 'activo');
  return ORDEN_CONSERVACION.map((estado) => ({
    key: estado,
    label: ESTADO_CONSERVACION_LABEL[estado],
    value: activos.filter((bien) => bien.estadoConservacion === estado).length,
    status: { domain: 'conservacion' as const, value: estado },
  }));
}

export function bienesPorCar(): BarDatum[] {
  const activos = listarBienes().filter((bien) => bien.situacion === 'activo');
  return listarEstablecimientos()
    .filter((car) => car.estado === 'activo')
    .map((car) => ({
      key: car.id,
      label: car.nombre,
      value: activos.filter((bien) => bien.establecimientoId === car.id).length,
      to: { path: '/bienes', query: { establecimiento: car.id } },
    }))
    .sort((a, b) => b.value - a.value);
}

export interface AvanceCar {
  id: string;
  nombre: string;
  estado: EstadoLevantamiento;
  porcentaje: number;
  detalle: string;
}

function campaniaVigenteDe(carId: string): Campania | undefined {
  return listarCampanias().find((c) => c.estado !== 'planificada' && c.establecimientoIds.includes(carId));
}

export function avanceLevantamiento(): AvanceCar[] {
  return listarEstablecimientos()
    .filter((car) => car.estado === 'activo')
    .map((car) => {
      if (car.estadoLevantamiento === 'completado') {
        return { id: car.id, nombre: car.nombre, estado: car.estadoLevantamiento, porcentaje: 100, detalle: 'Levantamiento cerrado' };
      }
      const campania = campaniaVigenteDe(car.id);
      if (!campania) {
        return { id: car.id, nombre: car.nombre, estado: car.estadoLevantamiento, porcentaje: 0, detalle: 'Sin campaña iniciada' };
      }
      const unidades = avanceUnidades(campania, car.id);
      const verificadas = unidades.filter((u) => u.estado === 'verificada').length;
      return {
        id: car.id,
        nombre: car.nombre,
        estado: car.estadoLevantamiento,
        porcentaje: unidades.length === 0 ? 0 : Math.round((verificadas / unidades.length) * 100),
        detalle: `${verificadas} de ${unidades.length} unidades verificadas · ${campania.id}`,
      };
    });
}

/** Campaña más reciente con resultados de conciliación. */
export function ultimaConciliacion(): Campania | undefined {
  return db.campanias.items.value
    .filter((c) => c.estado === 'en_conciliacion' || c.estado === 'cerrada')
    .slice()
    .sort((a, b) => ((a.fechaConciliacion ?? '') < (b.fechaConciliacion ?? '') ? 1 : -1))[0];
}

/** Filas de stock que requieren atención: agotados primero, luego bajo mínimo y vencimientos. */
export function alertasStock(limite = 6): StockItem[] {
  const prioridad = (fila: StockItem): number => {
    if (fila.estado === 'agotado') return 0;
    if (fila.estadoVencimiento === 'vencido') return 1;
    if (fila.estado === 'bajo_minimo') return 2;
    if (fila.estadoVencimiento === 'por_vencer') return 3;
    return 9;
  };
  return listarStock()
    .filter((fila) => prioridad(fila) < 9)
    .sort((a, b) => prioridad(a) - prioridad(b))
    .slice(0, limite);
}
