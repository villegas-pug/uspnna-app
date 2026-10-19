// Definiciones de reportes: filtros que admiten, columnas (las mismas para la vista previa y el CSV) y filas
import type { SelectOption } from 'src/core/types/common';
import { formatDate, formatNumber } from 'src/core/utils/format';
import {
  nombreAlmacen,
  nombreAmbiente,
  nombreEstablecimiento,
  obtenerAlmacen,
} from 'src/modules/establecimientos/services/establecimientos.service';
import { listarBienes } from 'src/modules/bienes/services/bienes.service';
import { estadoVencimiento, listarLotes, listarMovimientos, listarStock } from 'src/modules/suministros/services/stock.service';
import { nombreSuministro, obtenerSuministro } from 'src/modules/suministros/services/suministros.service';
import { campaniasConConciliacion, itemsDeCampania } from 'src/modules/conciliacion/services/conciliacion.service';
import { codigoRegistro, detalleResultado } from 'src/modules/conciliacion/utils/descripcion-item';
import { CATEGORIA_BIEN_LABEL, ESTADO_CONSERVACION_LABEL, SITUACION_BIEN_LABEL } from 'src/modules/bienes/types';
import {
  CATEGORIA_SUMINISTRO_LABEL,
  ESTADO_STOCK_LABEL,
  ESTADO_VENCIMIENTO_LABEL,
  TIPO_MOVIMIENTO_LABEL,
} from 'src/modules/suministros/types';
import { ESTADO_REGULARIZACION_LABEL, RESULTADO_LABEL } from 'src/modules/conciliacion/types';
import { optionsFrom } from 'src/core/utils/options';

export type ReporteId = 'bienes' | 'stock' | 'movimientos' | 'vencimientos' | 'conciliacion';
export type FiltroReporte = 'car' | 'estado' | 'desde' | 'hasta' | 'campania';

export interface FiltrosReporte {
  car: string | null;
  estado: string | null;
  desde: string | null;
  hasta: string | null;
  campania: string | null;
}

/** Fila genérica de reporte: textos ya formateados, listos para tabla y CSV. */
export interface FilaReporte {
  key: string;
  [campo: string]: string;
}

export interface ColumnaReporte {
  campo: string;
  label: string;
  align?: 'left' | 'right' | 'center';
}

export interface DefinicionReporte {
  id: ReporteId;
  label: string;
  descripcion: string;
  filtros: FiltroReporte[];
  /** Opciones del filtro "estado" propias del reporte. */
  estados: SelectOption[];
  estadoLabel: string;
  columnas: ColumnaReporte[];
  generar(filtros: FiltrosReporte): FilaReporte[];
}

function enRango(fecha: string, filtros: FiltrosReporte): boolean {
  return (!filtros.desde || fecha >= filtros.desde) && (!filtros.hasta || fecha <= filtros.hasta);
}

export const REPORTES: DefinicionReporte[] = [
  {
    id: 'bienes',
    label: 'Inventario de bienes patrimoniales',
    descripcion: 'Bienes activos por CAR y ambiente, con código patrimonial y estado de conservación.',
    filtros: ['car', 'estado'],
    estados: optionsFrom(ESTADO_CONSERVACION_LABEL),
    estadoLabel: 'Estado de conservación',
    columnas: [
      { campo: 'id', label: 'ID interno' },
      { campo: 'codigo', label: 'Código patrimonial' },
      { campo: 'descripcion', label: 'Descripción' },
      { campo: 'categoria', label: 'Categoría' },
      { campo: 'car', label: 'CAR' },
      { campo: 'ambiente', label: 'Ambiente' },
      { campo: 'custodio', label: 'Custodio' },
      { campo: 'estado', label: 'Estado de conservación' },
      { campo: 'situacion', label: 'Situación' },
    ],
    generar: (f) =>
      listarBienes()
        .filter(
          (b) =>
            b.situacion === 'activo' &&
            (!f.car || b.establecimientoId === f.car) &&
            (!f.estado || b.estadoConservacion === f.estado),
        )
        .map((b) => ({
          key: b.id,
          id: b.id,
          codigo: b.codigoPatrimonial ?? 'Sin código patrimonial',
          descripcion: b.descripcion,
          categoria: CATEGORIA_BIEN_LABEL[b.categoria],
          car: nombreEstablecimiento(b.establecimientoId),
          ambiente: nombreAmbiente(b.ambienteId),
          custodio: b.custodio,
          estado: ESTADO_CONSERVACION_LABEL[b.estadoConservacion],
          situacion: SITUACION_BIEN_LABEL[b.situacion],
        })),
  },
  {
    id: 'stock',
    label: 'Stock de suministros por almacén',
    descripcion: 'Stock actual frente al mínimo, con el próximo vencimiento de cada suministro.',
    filtros: ['car', 'estado'],
    estados: optionsFrom(ESTADO_STOCK_LABEL),
    estadoLabel: 'Estado de stock',
    columnas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'suministro', label: 'Suministro' },
      { campo: 'categoria', label: 'Categoría' },
      { campo: 'almacen', label: 'Almacén' },
      { campo: 'stock', label: 'Stock', align: 'right' },
      { campo: 'minimo', label: 'Stock mínimo', align: 'right' },
      { campo: 'unidad', label: 'Unidad' },
      { campo: 'estado', label: 'Estado' },
      { campo: 'vencimiento', label: 'Próximo vencimiento' },
    ],
    generar: (f) =>
      listarStock()
        .filter((s) => (!f.car || s.establecimientoId === f.car) && (!f.estado || s.estado === f.estado))
        .map((s) => ({
          key: s.key,
          codigo: s.suministro.id,
          suministro: s.suministro.nombre,
          categoria: CATEGORIA_SUMINISTRO_LABEL[s.suministro.categoria],
          almacen: nombreAlmacen(s.almacenId),
          stock: formatNumber(s.cantidad),
          minimo: formatNumber(s.suministro.stockMinimo),
          unidad: s.suministro.unidad,
          estado: ESTADO_STOCK_LABEL[s.estado],
          vencimiento: s.proximoVencimiento ? formatDate(s.proximoVencimiento) : 'Sin vencimiento',
        })),
  },
  {
    id: 'movimientos',
    label: 'Movimientos de almacén',
    descripcion: 'Ingresos, salidas, transferencias y ajustes por rango de fechas, detallados por lote.',
    filtros: ['car', 'estado', 'desde', 'hasta'],
    estados: optionsFrom(TIPO_MOVIMIENTO_LABEL),
    estadoLabel: 'Tipo de movimiento',
    columnas: [
      { campo: 'codigo', label: 'Código' },
      { campo: 'fecha', label: 'Fecha' },
      { campo: 'tipo', label: 'Tipo' },
      { campo: 'origen', label: 'Origen' },
      { campo: 'destino', label: 'Destino' },
      { campo: 'suministro', label: 'Suministro' },
      { campo: 'cantidad', label: 'Cantidad', align: 'right' },
      { campo: 'lote', label: 'Lote' },
      { campo: 'documento', label: 'Documento' },
      { campo: 'motivo', label: 'Motivo' },
    ],
    generar: (f) =>
      listarMovimientos()
        .filter((m) => {
          const cars = [m.almacenOrigenId, m.almacenDestinoId].map((id) => obtenerAlmacen(id)?.establecimientoId);
          return (!f.car || cars.includes(f.car)) && (!f.estado || m.tipo === f.estado) && enRango(m.fecha, f);
        })
        .flatMap((m) =>
          m.items.map((item, index) => ({
            key: `${m.id}-${index}`,
            codigo: m.id,
            fecha: formatDate(m.fecha),
            tipo: TIPO_MOVIMIENTO_LABEL[m.tipo],
            origen: m.almacenOrigenId ? nombreAlmacen(m.almacenOrigenId) : '',
            destino: m.almacenDestinoId ? nombreAlmacen(m.almacenDestinoId) : '',
            suministro: nombreSuministro(item.suministroId),
            cantidad: `${formatNumber(item.cantidad)} ${obtenerSuministro(item.suministroId)?.unidad ?? ''}`.trim(),
            lote: item.numeroLote ?? 'Sin lote',
            documento: m.documento,
            motivo: m.motivo,
          })),
        ),
  },
  {
    id: 'vencimientos',
    label: 'Lotes y vencimientos',
    descripcion: 'Lotes con stock y fecha de vencimiento, ordenados del más próximo al más lejano.',
    filtros: ['car', 'estado', 'desde', 'hasta'],
    estados: optionsFrom(ESTADO_VENCIMIENTO_LABEL).filter((o) => o.value !== 'sin_vencimiento'),
    estadoLabel: 'Estado de vencimiento',
    columnas: [
      { campo: 'lote', label: 'Lote' },
      { campo: 'suministro', label: 'Suministro' },
      { campo: 'almacen', label: 'Almacén' },
      { campo: 'cantidad', label: 'Cantidad', align: 'right' },
      { campo: 'vencimiento', label: 'Vencimiento' },
      { campo: 'estado', label: 'Estado' },
    ],
    generar: (f) =>
      listarLotes()
        .filter(
          (l) =>
            l.cantidad > 0 &&
            l.fechaVencimiento !== null &&
            (!f.car || obtenerAlmacen(l.almacenId)?.establecimientoId === f.car) &&
            (!f.estado || estadoVencimiento(l.fechaVencimiento) === f.estado) &&
            enRango(l.fechaVencimiento, f),
        )
        .slice()
        .sort((a, b) => ((a.fechaVencimiento ?? '') < (b.fechaVencimiento ?? '') ? -1 : 1))
        .map((l) => ({
          key: l.id,
          lote: l.numeroLote ?? 'Sin lote',
          suministro: nombreSuministro(l.suministroId),
          almacen: nombreAlmacen(l.almacenId),
          cantidad: `${formatNumber(l.cantidad)} ${obtenerSuministro(l.suministroId)?.unidad ?? ''}`.trim(),
          vencimiento: formatDate(l.fechaVencimiento),
          estado: ESTADO_VENCIMIENTO_LABEL[estadoVencimiento(l.fechaVencimiento)],
        })),
  },
  {
    id: 'conciliacion',
    label: 'Resultados de conciliación',
    descripcion: 'Resultados de una campaña con su estado de regularización y sustento.',
    filtros: ['campania', 'car', 'estado'],
    estados: optionsFrom(RESULTADO_LABEL),
    estadoLabel: 'Resultado',
    columnas: [
      { campo: 'campania', label: 'Campaña' },
      { campo: 'resultado', label: 'Resultado' },
      { campo: 'registro', label: 'Registro' },
      { campo: 'descripcion', label: 'Descripción' },
      { campo: 'detalle', label: 'Detalle' },
      { campo: 'car', label: 'CAR' },
      { campo: 'regularizacion', label: 'Regularización' },
      { campo: 'sustento', label: 'Sustento' },
    ],
    generar: (f) =>
      campaniasConConciliacion()
        .filter((c) => !f.campania || c.id === f.campania)
        .flatMap((c) => itemsDeCampania(c.id))
        .filter((i) => (!f.car || i.establecimientoId === f.car) && (!f.estado || i.resultado === f.estado))
        .map((i) => ({
          key: i.id,
          campania: i.campaniaId,
          resultado: RESULTADO_LABEL[i.resultado],
          registro: codigoRegistro(i),
          descripcion: i.descripcion,
          detalle: detalleResultado(i),
          car: nombreEstablecimiento(i.establecimientoId),
          regularizacion: ESTADO_REGULARIZACION_LABEL[i.estadoRegularizacion],
          sustento: i.sustento ?? '',
        })),
  },
];

export function obtenerReporte(id: ReporteId): DefinicionReporte {
  return REPORTES.find((r) => r.id === id) ?? (REPORTES[0] as DefinicionReporte);
}

export function opcionesCampaniasConciliadas(): SelectOption[] {
  return campaniasConConciliacion().map((c) => ({ label: `${c.id} · ${c.nombre}`, value: c.id }));
}
