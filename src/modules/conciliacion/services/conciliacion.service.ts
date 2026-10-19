// Servicio de conciliación: genera resultados (RN-K1), regulariza con confirmación (RN-K2) y cierra (RN-K3)
import { db, runTransaction } from 'src/core/data/db';
import { ensure } from 'src/core/errors';
import { nextIds } from 'src/core/utils/id';
import { nowIso, todayIso } from 'src/core/utils/format';
import { simulateRequest } from 'src/core/utils/latency';
import {
  listarAlmacenes,
  obtenerAmbiente,
  ubicacionAmbiente,
} from 'src/modules/establecimientos/services/establecimientos.service';
import {
  aplicarBaja,
  codigoPatrimonialEnUso,
  moverBien,
  registrarEventoBien,
  siguienteIdBien,
} from 'src/modules/bienes/services/bienes.service';
import { aplicarAjusteStock, stockPorAlmacen } from 'src/modules/suministros/services/stock.service';
import { obtenerSuministro } from 'src/modules/suministros/services/suministros.service';
import {
  avanceUnidades,
  conteosDe,
  obtenerCampania,
  verificacionesDe,
} from 'src/modules/campanias/services/campanias.service';
import { CODIGO_PATRIMONIAL_REGEX } from 'src/modules/bienes/types';
import type { AvanceUnidad, Campania } from 'src/modules/campanias/types';
import type { BarDatum } from 'src/components/types';
import {
  ACCION_REGULARIZACION,
  RESULTADO_LABEL,
  type ItemConciliacion,
  type RegularizacionInput,
  type ResultadoConciliacion,
  type TipoRegistro,
  type TotalesConciliacion,
} from 'src/modules/conciliacion/types';

// ---------------------------------------------------------------------------
// Selectores
// ---------------------------------------------------------------------------
export function itemsDeCampania(campaniaId: string): ItemConciliacion[] {
  return db.conciliaciones.items.value.filter((item) => item.campaniaId === campaniaId);
}

export function campaniasConConciliacion(): Campania[] {
  return db.campanias.items.value
    .filter((c) => c.estado === 'en_conciliacion' || c.estado === 'cerrada')
    .slice()
    .sort((a, b) => ((a.fechaConciliacion ?? '') < (b.fechaConciliacion ?? '') ? 1 : -1));
}

export function calcularTotales(items: readonly ItemConciliacion[]): TotalesConciliacion {
  const contar = (resultado: ResultadoConciliacion) => items.filter((i) => i.resultado === resultado).length;
  return {
    coincidentes: contar('coincidente'),
    faltantes: contar('faltante'),
    sobrantes: contar('sobrante'),
    diferenciasUbicacion: contar('diferencia_ubicacion'),
    diferenciasCantidad: contar('diferencia_cantidad'),
    pendientes: contar('pendiente'),
    porRegularizar: items.filter((i) => i.estadoRegularizacion === 'pendiente').length,
    regularizados: items.filter((i) => i.estadoRegularizacion === 'regularizado').length,
  };
}

const ORDEN_RESULTADOS: ResultadoConciliacion[] = [
  'coincidente',
  'faltante',
  'sobrante',
  'diferencia_ubicacion',
  'diferencia_cantidad',
  'pendiente',
];

/** Cantidad de resultados por tipo, para gráficos (la identidad la da el StatusChip). */
export function resultadosPorTipo(campaniaId: string): BarDatum[] {
  const items = itemsDeCampania(campaniaId);
  return ORDEN_RESULTADOS.map((resultado) => ({
    key: resultado,
    label: RESULTADO_LABEL[resultado],
    value: items.filter((item) => item.resultado === resultado).length,
    status: { domain: 'conciliacion' as const, value: resultado },
  }));
}

export function unidadesSinVerificar(campania: Campania): AvanceUnidad[] {
  return avanceUnidades(campania).filter((unidad) => unidad.estado !== 'verificada');
}

// ---------------------------------------------------------------------------
// Generación de resultados (RN-K1)
// ---------------------------------------------------------------------------
type ItemDraft = Omit<ItemConciliacion, 'id'>;

function draft(campaniaId: string, establecimientoId: string, tipoRegistro: TipoRegistro, resultado: ResultadoConciliacion): ItemDraft {
  return {
    campaniaId,
    establecimientoId,
    tipoRegistro,
    resultado,
    bienId: null,
    verificacionId: null,
    suministroId: null,
    almacenId: null,
    descripcion: '',
    codigoPatrimonial: null,
    ambienteRegistradoId: null,
    ambienteEncontradoId: null,
    establecimientoEncontradoId: null,
    cantidadSistema: null,
    cantidadFisica: null,
    estadoRegularizacion: resultado === 'coincidente' || resultado === 'pendiente' ? 'no_aplica' : 'pendiente',
    accionRegularizacion: null,
    sustento: null,
    fechaRegularizacion: null,
  };
}

export function generarResultados(campania: Campania): ItemDraft[] {
  const alcance = new Set(campania.establecimientoIds);
  const verificaciones = verificacionesDe(campania.id);
  const conMarca = new Set(verificaciones.flatMap((v) => (v.bienId ? [v.bienId] : [])));
  const drafts: ItemDraft[] = [];

  const bienes = db.bienes
    .all()
    .filter((b) => (b.situacion === 'activo' && alcance.has(b.establecimientoId)) || conMarca.has(b.id));
  for (const bien of bienes) {
    const marcas = verificaciones.filter((v) => v.bienId === bien.id);
    const encontrado = marcas.find((m) => m.hallazgo === 'encontrado');
    let resultado: ResultadoConciliacion = 'pendiente';
    if (encontrado) resultado = encontrado.ambienteId === bien.ambienteId ? 'coincidente' : 'diferencia_ubicacion';
    else if (marcas.length > 0) resultado = 'faltante';
    const item = draft(campania.id, bien.establecimientoId, 'bien', resultado);
    item.bienId = bien.id;
    item.verificacionId = (encontrado ?? marcas[0])?.id ?? null;
    item.descripcion = bien.descripcion;
    item.codigoPatrimonial = bien.codigoPatrimonial;
    item.ambienteRegistradoId = bien.ambienteId;
    if (encontrado && resultado === 'diferencia_ubicacion') {
      item.ambienteEncontradoId = encontrado.ambienteId;
      item.establecimientoEncontradoId = encontrado.establecimientoId;
    }
    drafts.push(item);
  }

  for (const verificacion of verificaciones.filter((v) => v.bienId === null && v.hallazgo === 'encontrado')) {
    const item = draft(campania.id, verificacion.establecimientoId, 'bien', 'sobrante');
    item.verificacionId = verificacion.id;
    item.descripcion = verificacion.descripcion;
    item.codigoPatrimonial = verificacion.codigoPatrimonialLeido;
    item.ambienteEncontradoId = verificacion.ambienteId;
    item.establecimientoEncontradoId = verificacion.establecimientoId;
    drafts.push(item);
  }

  for (const carId of campania.establecimientoIds) {
    for (const almacen of listarAlmacenes(carId)) {
      const stock = stockPorAlmacen(almacen.id);
      const conteos = conteosDe(campania.id, almacen.id);
      const ids = new Set([
        ...[...stock].filter(([, cantidad]) => cantidad > 0).map(([id]) => id),
        ...conteos.map((c) => c.suministroId),
      ]);
      for (const suministroId of ids) {
        const conteo = conteos.find((c) => c.suministroId === suministroId);
        const resultado: ResultadoConciliacion = !conteo
          ? 'pendiente'
          : conteo.cantidadFisica === conteo.cantidadSistema
            ? 'coincidente'
            : 'diferencia_cantidad';
        const item = draft(campania.id, carId, 'suministro', resultado);
        item.suministroId = suministroId;
        item.almacenId = almacen.id;
        item.descripcion = obtenerSuministro(suministroId)?.nombre ?? suministroId;
        item.cantidadSistema = conteo ? conteo.cantidadSistema : (stock.get(suministroId) ?? 0);
        item.cantidadFisica = conteo ? conteo.cantidadFisica : null;
        drafts.push(item);
      }
    }
  }
  return drafts;
}

// ---------------------------------------------------------------------------
// Comandos
// ---------------------------------------------------------------------------
/** RN-C6 y RN-K1: congela los resultados y pasa la campaña a conciliación. */
export function pasarAConciliacion(campaniaId: string): Promise<Campania> {
  return simulateRequest(() => {
    const campania = obtenerCampania(campaniaId);
    ensure(campania, 'La campaña ya no existe. Actualice la vista.');
    ensure(campania.estado === 'en_curso', 'Solo una campaña en curso puede pasar a conciliación.');
    return runTransaction(() => {
      const drafts = generarResultados(campania);
      const ids = nextIds('CON', db.conciliaciones.all().map((i) => i.id), 6, drafts.length);
      db.conciliaciones.insertMany(drafts.map((item, index) => ({ ...item, id: ids[index] ?? '' })));
      return db.campanias.update(campania.id, { estado: 'en_conciliacion', fechaConciliacion: nowIso() });
    });
  });
}

/** RN-K2: aplica la regularización que corresponde al resultado y la deja trazada. */
export function regularizarItem(itemId: string, input: RegularizacionInput): Promise<ItemConciliacion> {
  return simulateRequest(() => {
    const item = db.conciliaciones.find(itemId);
    ensure(item, 'El resultado ya no existe. Actualice la vista.');
    const campania = obtenerCampania(item.campaniaId);
    ensure(campania?.estado === 'en_conciliacion', 'Solo se regulariza con la campaña en conciliación.');
    ensure(item.estadoRegularizacion === 'pendiente', 'Este resultado ya fue regularizado o no requiere regularización.');
    const accion = ACCION_REGULARIZACION[item.resultado];
    ensure(accion, 'Este resultado no admite regularización.');
    const sustento = input.sustento.trim();
    ensure(sustento.length >= 10, 'Describa el sustento de la regularización (mínimo 10 caracteres).');
    const referencia = `Regularización ${campania.id}`;

    return runTransaction(() => {
      let bienId = item.bienId;
      switch (item.resultado) {
        case 'diferencia_ubicacion': {
          const destino = obtenerAmbiente(item.ambienteEncontradoId);
          ensure(item.bienId && destino, 'No se encontró el ambiente donde se ubicó el bien.');
          moverBien(
            item.bienId,
            destino.id,
            destino.custodio,
            'regularizacion',
            `${referencia}: ubicación actualizada de ${ubicacionAmbiente(item.ambienteRegistradoId)} a ${ubicacionAmbiente(destino.id)}. Sustento: ${sustento}`,
          );
          break;
        }
        case 'faltante': {
          ensure(item.bienId, 'El resultado no tiene un bien asociado.');
          aplicarBaja(item.bienId, 'Faltante en inventario', 'regularizacion', `${referencia}: baja por faltante en inventario. Sustento: ${sustento}`);
          break;
        }
        case 'sobrante': {
          ensure(input.categoria, 'Seleccione la categoría del bien que se incorpora.');
          const ambiente = obtenerAmbiente(item.ambienteEncontradoId);
          ensure(ambiente, 'No se encontró el ambiente donde se ubicó el bien.');
          const codigo = item.codigoPatrimonial && CODIGO_PATRIMONIAL_REGEX.test(item.codigoPatrimonial) ? item.codigoPatrimonial : null;
          ensure(!codigo || !codigoPatrimonialEnUso(codigo), `El código ${codigo ?? ''} ya fue asignado a otro bien. Revise el resultado.`);
          const verificacion = item.verificacionId ? db.verificaciones.find(item.verificacionId) : undefined;
          const fecha = nowIso();
          const nuevo = db.bienes.insert({
            id: siguienteIdBien(),
            codigoPatrimonial: codigo,
            descripcion: item.descripcion,
            categoria: input.categoria,
            marca: '',
            modelo: '',
            serie: '',
            color: '',
            establecimientoId: ambiente.establecimientoId,
            ambienteId: ambiente.id,
            custodio: ambiente.custodio,
            estadoConservacion: verificacion?.estadoConservacion ?? 'sin_evaluar',
            situacion: 'activo',
            fechaAdquisicion: null,
            valorReferencial: null,
            observaciones: `Incorporado por regularización de sobrante (${campania.id}).`,
            fotos: [],
            motivoBaja: null,
            fechaRegistro: fecha,
            fechaActualizacion: fecha,
          });
          registrarEventoBien(
            nuevo.id,
            'registro',
            `Incorporado al registro por regularización de sobrante (${campania.id}) en ${ambiente.nombre}. Sustento: ${sustento}`,
            null,
            ambiente.id,
          );
          bienId = nuevo.id;
          break;
        }
        case 'diferencia_cantidad': {
          ensure(item.almacenId && item.suministroId, 'El resultado no tiene un suministro asociado.');
          const diferencia = (item.cantidadFisica ?? 0) - (item.cantidadSistema ?? 0);
          aplicarAjusteStock(item.almacenId, item.suministroId, diferencia, referencia, sustento);
          break;
        }
        default:
          break;
      }
      return db.conciliaciones.update(item.id, {
        estadoRegularizacion: 'regularizado',
        accionRegularizacion: accion,
        sustento,
        fechaRegularizacion: nowIso(),
        bienId,
      });
    });
  });
}

/** RN-K3 y RN-C2: cierra la campaña; un levantamiento inicial completa el levantamiento de sus CAR. */
export function cerrarCampania(campaniaId: string): Promise<Campania> {
  return simulateRequest(() => {
    const campania = obtenerCampania(campaniaId);
    ensure(campania, 'La campaña ya no existe. Actualice la vista.');
    ensure(campania.estado === 'en_conciliacion', 'Solo una campaña en conciliación puede cerrarse.');
    return runTransaction(() => {
      if (campania.tipo === 'inicial') {
        for (const carId of campania.establecimientoIds) {
          db.establecimientos.update(carId, { estadoLevantamiento: 'completado', fechaLevantamiento: todayIso() });
        }
      }
      return db.campanias.update(campania.id, { estado: 'cerrada', fechaCierre: nowIso() });
    });
  });
}
