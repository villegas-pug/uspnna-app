// Textos de presentación de un resultado de conciliación (tabla, diálogo de regularización y CSV)
import { formatNumber } from 'src/core/utils/format';
import {
  nombreAlmacen,
  ubicacionAmbiente,
} from 'src/modules/establecimientos/services/establecimientos.service';
import { obtenerSuministro } from 'src/modules/suministros/services/suministros.service';
import type { ItemConciliacion } from 'src/modules/conciliacion/types';

/** Código visible del registro: ID interno del bien, código del suministro o "Sin registro". */
export function codigoRegistro(item: ItemConciliacion): string {
  if (item.tipoRegistro === 'suministro') return item.suministroId ?? '';
  return item.bienId ?? 'Sin registro';
}

/** Detalle del resultado: dónde se registró y dónde se encontró, o las cantidades. */
export function detalleResultado(item: ItemConciliacion): string {
  const unidad = obtenerSuministro(item.suministroId)?.unidad ?? '';
  switch (item.resultado) {
    case 'coincidente':
      return item.tipoRegistro === 'bien'
        ? `Ubicado en ${ubicacionAmbiente(item.ambienteRegistradoId)}`
        : `${formatNumber(item.cantidadSistema ?? 0)} ${unidad} en ${nombreAlmacen(item.almacenId)}`;
    case 'faltante':
      return `No se ubicó en ${ubicacionAmbiente(item.ambienteRegistradoId)}`;
    case 'sobrante':
      return `Encontrado en ${ubicacionAmbiente(item.ambienteEncontradoId)}${item.codigoPatrimonial ? ` · código leído ${item.codigoPatrimonial}` : ''}`;
    case 'diferencia_ubicacion':
      return `Registrado en ${ubicacionAmbiente(item.ambienteRegistradoId)} · encontrado en ${ubicacionAmbiente(item.ambienteEncontradoId)}`;
    case 'diferencia_cantidad': {
      const diferencia = (item.cantidadFisica ?? 0) - (item.cantidadSistema ?? 0);
      return `Sistema ${formatNumber(item.cantidadSistema ?? 0)} · físico ${formatNumber(item.cantidadFisica ?? 0)} ${unidad} (${diferencia > 0 ? '+' : ''}${formatNumber(diferencia)})`;
    }
    case 'pendiente':
      return item.tipoRegistro === 'bien'
        ? `Sin verificar en ${ubicacionAmbiente(item.ambienteRegistradoId)}`
        : `Sin contar en ${nombreAlmacen(item.almacenId)}`;
    default:
      return '';
  }
}
