// Servicio de campañas de inventario y verificación física (reglas RN-C*)
import { db, runTransaction } from 'src/core/data/db';
import { ensure } from 'src/core/errors';
import { nextId, nextIds } from 'src/core/utils/id';
import { normalizeText, nowIso } from 'src/core/utils/format';
import { simulateRequest } from 'src/core/utils/latency';
import {
  listarAlmacenes,
  listarAmbientes,
  nombreAmbiente,
  nombreEstablecimiento,
  obtenerAlmacen,
  obtenerAmbiente,
} from 'src/modules/establecimientos/services/establecimientos.service';
import {
  bienesActivosEn,
  codigoPatrimonialEnUso,
  obtenerBien,
  registrarEventoBien,
} from 'src/modules/bienes/services/bienes.service';
import { stockDe, stockPorAlmacen } from 'src/modules/suministros/services/stock.service';
import { CODIGO_PATRIMONIAL_REGEX, ESTADO_CONSERVACION_LABEL } from 'src/modules/bienes/types';
import {
  HALLAZGO_LABEL,
  type AvanceCampania,
  type AvanceUnidad,
  type Campania,
  type CampaniaInput,
  type ConteoInput,
  type ConteoSuministro,
  type EstadoUnidad,
  type HallazgoAdicionalInput,
  type MarcaBienInput,
  type TipoUnidad,
  type VerificacionBien,
} from 'src/modules/campanias/types';

const CAMPANIAS_ABIERTAS = new Set(['planificada', 'en_curso', 'en_conciliacion']);

// ---------------------------------------------------------------------------
// Selectores
// ---------------------------------------------------------------------------
export function listarCampanias(): Campania[] {
  return db.campanias.items.value.slice().sort((a, b) => (a.fechaInicio < b.fechaInicio ? 1 : -1));
}

export function obtenerCampania(id: string | null | undefined): Campania | undefined {
  return id ? db.campanias.items.value.find((c) => c.id === id) : undefined;
}

export function puedeVerificar(campania: Campania | undefined): boolean {
  return campania?.estado === 'en_curso';
}

export function verificacionesDe(campaniaId: string, ambienteId?: string): VerificacionBien[] {
  return db.verificaciones.items.value.filter(
    (v) => v.campaniaId === campaniaId && (!ambienteId || v.ambienteId === ambienteId),
  );
}

export function conteosDe(campaniaId: string, almacenId?: string): ConteoSuministro[] {
  return db.conteos.items.value.filter(
    (c) => c.campaniaId === campaniaId && (!almacenId || c.almacenId === almacenId),
  );
}

export function unidadEstaVerificada(campaniaId: string, tipo: TipoUnidad, unidadId: string): boolean {
  return db.unidadesVerificadas.items.value.some(
    (u) => u.campaniaId === campaniaId && u.tipo === tipo && u.unidadId === unidadId,
  );
}

/** Suministros a contar en un almacén: los que tienen stock y los ya contados. */
export function suministrosEsperados(campaniaId: string, almacenId: string): string[] {
  const conStock = [...stockPorAlmacen(almacenId)].filter(([, cantidad]) => cantidad > 0).map(([id]) => id);
  const contados = conteosDe(campaniaId, almacenId).map((c) => c.suministroId);
  return [...new Set([...conStock, ...contados])];
}

function estadoUnidad(verificada: boolean, conRegistros: boolean): EstadoUnidad {
  if (verificada) return 'verificada';
  return conRegistros ? 'en_proceso' : 'pendiente';
}

/** Avance por ambiente y almacén de los CAR de la campaña. */
export function avanceUnidades(campania: Campania, establecimientoId?: string): AvanceUnidad[] {
  const filas: AvanceUnidad[] = [];
  const cars = establecimientoId ? [establecimientoId] : campania.establecimientoIds;
  for (const carId of cars) {
    for (const ambiente of listarAmbientes(carId).filter((a) => a.estado === 'activo')) {
      const esperados = new Set(bienesActivosEn(ambiente.id).map((b) => b.id));
      const marcas = verificacionesDe(campania.id, ambiente.id);
      filas.push({
        tipo: 'ambiente',
        unidadId: ambiente.id,
        establecimientoId: carId,
        nombre: ambiente.nombre,
        responsable: ambiente.custodio,
        esperados: esperados.size,
        verificados: marcas.filter((m) => m.bienId !== null && esperados.has(m.bienId)).length,
        estado: estadoUnidad(unidadEstaVerificada(campania.id, 'ambiente', ambiente.id), marcas.length > 0),
      });
    }
    for (const almacen of listarAlmacenes(carId).filter((a) => a.estado === 'activo')) {
      const esperados = suministrosEsperados(campania.id, almacen.id);
      const contados = conteosDe(campania.id, almacen.id);
      filas.push({
        tipo: 'almacen',
        unidadId: almacen.id,
        establecimientoId: carId,
        nombre: almacen.nombre,
        responsable: almacen.responsable,
        esperados: esperados.length,
        verificados: contados.length,
        estado: estadoUnidad(unidadEstaVerificada(campania.id, 'almacen', almacen.id), contados.length > 0),
      });
    }
  }
  return filas;
}

export function avanceCampania(campania: Campania): AvanceCampania {
  const unidades = avanceUnidades(campania);
  const verificadas = unidades.filter((u) => u.estado === 'verificada').length;
  return {
    unidades: unidades.length,
    unidadesVerificadas: verificadas,
    porcentaje: unidades.length === 0 ? 0 : (verificadas / unidades.length) * 100,
  };
}

// ---------------------------------------------------------------------------
// Comandos: ciclo de vida de la campaña
// ---------------------------------------------------------------------------
function validarCampania(input: CampaniaInput, exceptId?: string): void {
  ensure(input.nombre.trim().length >= 5, 'Ingrese el nombre de la campaña (mínimo 5 caracteres).');
  ensure(input.establecimientoIds.length > 0, 'Seleccione al menos un establecimiento (CAR).');
  ensure(input.fechaInicio && input.fechaFin, 'Ingrese las fechas de inicio y fin de la campaña.');
  ensure(input.fechaFin >= input.fechaInicio, 'La fecha de fin debe ser igual o posterior a la fecha de inicio.');
  ensure(input.responsable.trim(), 'Indique el equipo responsable de la campaña.');
  const duplicada = db.campanias
    .all()
    .some((c) => c.id !== exceptId && normalizeText(c.nombre) === normalizeText(input.nombre));
  ensure(!duplicada, `Ya existe una campaña llamada "${input.nombre}". Use otro nombre.`);
  for (const carId of input.establecimientoIds) {
    const ocupado = db.campanias
      .all()
      .find((c) => c.id !== exceptId && CAMPANIAS_ABIERTAS.has(c.estado) && c.establecimientoIds.includes(carId));
    ensure(
      !ocupado,
      `${nombreEstablecimiento(carId)} ya participa en la campaña abierta ${ocupado?.id ?? ''}. Ciérrela o quite el CAR de esa campaña.`,
    );
  }
}

function obtenerCampaniaEditable(id: string): Campania {
  const campania = obtenerCampania(id);
  ensure(campania, 'La campaña ya no existe. Actualice la vista.');
  ensure(campania.estado === 'planificada', 'Solo se puede modificar una campaña planificada.');
  return campania;
}

export function crearCampania(input: CampaniaInput): Promise<Campania> {
  return simulateRequest(() => {
    validarCampania(input);
    const anio = input.fechaInicio.slice(0, 4);
    const id = nextId(`CAM-${anio}`, db.campanias.all().map((c) => c.id), 3);
    return db.campanias.insert({
      ...input,
      nombre: input.nombre.trim(),
      descripcion: input.descripcion.trim(),
      responsable: input.responsable.trim(),
      id,
      estado: 'planificada',
      fechaConciliacion: null,
      fechaCierre: null,
    });
  });
}

export function actualizarCampania(id: string, input: CampaniaInput): Promise<Campania> {
  return simulateRequest(() => {
    obtenerCampaniaEditable(id);
    validarCampania(input, id);
    return db.campanias.update(id, {
      ...input,
      nombre: input.nombre.trim(),
      descripcion: input.descripcion.trim(),
      responsable: input.responsable.trim(),
    });
  });
}

export function eliminarCampania(id: string): Promise<void> {
  return simulateRequest(() => {
    obtenerCampaniaEditable(id);
    db.campanias.remove(id);
  });
}

/** RN-C2: iniciar un levantamiento inicial pasa a "En curso" los CAR pendientes. */
export function iniciarCampania(id: string): Promise<Campania> {
  return simulateRequest(() => {
    const campania = obtenerCampaniaEditable(id);
    return runTransaction(() => {
      if (campania.tipo === 'inicial') {
        for (const carId of campania.establecimientoIds) {
          const car = db.establecimientos.find(carId);
          if (car?.estadoLevantamiento === 'pendiente') {
            db.establecimientos.update(carId, { estadoLevantamiento: 'en_curso' });
          }
        }
      }
      return db.campanias.update(id, { estado: 'en_curso' });
    });
  });
}

// ---------------------------------------------------------------------------
// Comandos: verificación física
// ---------------------------------------------------------------------------
function campaniaEnCurso(campaniaId: string): Campania {
  const campania = obtenerCampania(campaniaId);
  ensure(campania, 'La campaña ya no existe. Actualice la vista.');
  ensure(puedeVerificar(campania), 'La campaña no está en curso; la verificación es de solo lectura.');
  return campania;
}

function validarHallazgosAdicionales(ambienteId: string, adicionales: HallazgoAdicionalInput[]): void {
  const esperados = new Set(bienesActivosEn(ambienteId).map((b) => b.id));
  const vistos = new Set<string>();
  for (const hallazgo of adicionales) {
    if (hallazgo.bienId) {
      const bien = obtenerBien(hallazgo.bienId);
      ensure(bien && bien.situacion === 'activo', `El bien ${hallazgo.bienId} no existe o está dado de baja.`);
      ensure(!esperados.has(bien.id), `El bien ${bien.id} pertenece a este ambiente; márquelo en la lista de bienes esperados.`);
      ensure(!vistos.has(bien.id), `El bien ${bien.id} está agregado dos veces.`);
      vistos.add(bien.id);
    } else {
      ensure(hallazgo.descripcion.trim().length >= 3, 'Describa el bien sin registro (mínimo 3 caracteres).');
      const codigo = hallazgo.codigoPatrimonialLeido?.trim();
      if (codigo) {
        ensure(CODIGO_PATRIMONIAL_REGEX.test(codigo), 'El código patrimonial leído tiene 12 dígitos. Corríjalo o déjelo vacío.');
        const registrado = codigoPatrimonialEnUso(codigo);
        ensure(
          !registrado,
          `El código ${codigo} corresponde al bien ${registrado?.id ?? ''}. Agréguelo como bien registrado.`,
        );
      }
    }
  }
}

/** Un bien no puede figurar como encontrado en dos ambientes de la misma campaña. */
function validarDuplicadosEnCampania(campaniaId: string, ambienteId: string, bienIds: string[]): void {
  const otras = verificacionesDe(campaniaId).filter(
    (v) => v.ambienteId !== ambienteId && v.hallazgo === 'encontrado' && v.bienId !== null,
  );
  for (const bienId of bienIds) {
    const previa = otras.find((v) => v.bienId === bienId);
    ensure(
      !previa,
      `El bien ${bienId} ya figura como encontrado en ${nombreAmbiente(previa?.ambienteId)}. Quítelo de esa verificación primero.`,
    );
  }
}

export interface GuardarVerificacionInput {
  campaniaId: string;
  ambienteId: string;
  marcas: MarcaBienInput[];
  adicionales: HallazgoAdicionalInput[];
  finalizar: boolean;
}

/**
 * RN-C4 y RN-C5: reemplaza las marcas del ambiente. "Finalizar" exige todos los bienes
 * esperados marcados y registra la unidad como verificada; "Guardar avance" la deja en proceso.
 */
export function guardarVerificacionAmbiente(input: GuardarVerificacionInput): Promise<void> {
  return simulateRequest(() => {
    const campania = campaniaEnCurso(input.campaniaId);
    const ambiente = obtenerAmbiente(input.ambienteId);
    ensure(ambiente && campania.establecimientoIds.includes(ambiente.establecimientoId), 'El ambiente no pertenece a los CAR de la campaña.');
    const esperados = new Set(bienesActivosEn(ambiente.id).map((b) => b.id));
    const marcas = input.marcas.filter((m) => esperados.has(m.bienId));
    if (input.finalizar) {
      const pendientes = [...esperados].filter((id) => !marcas.some((m) => m.bienId === id && m.hallazgo !== null));
      ensure(
        pendientes.length === 0,
        `Faltan ${pendientes.length} bienes por marcar. Indique si cada bien fue encontrado o no antes de finalizar.`,
      );
    }
    validarHallazgosAdicionales(ambiente.id, input.adicionales);
    const encontrados = [
      ...marcas.filter((m) => m.hallazgo === 'encontrado').map((m) => m.bienId),
      ...input.adicionales.flatMap((a) => (a.bienId ? [a.bienId] : [])),
    ];
    validarDuplicadosEnCampania(campania.id, ambiente.id, encontrados);

    runTransaction(() => {
      const fecha = nowIso();
      for (const previa of verificacionesDe(campania.id, ambiente.id)) db.verificaciones.remove(previa.id);

      const registros: Omit<VerificacionBien, 'id'>[] = [
        ...marcas.flatMap((marca) => {
          if (!marca.hallazgo) return [];
          const bien = obtenerBien(marca.bienId);
          return [
            {
              campaniaId: campania.id,
              establecimientoId: ambiente.establecimientoId,
              ambienteId: ambiente.id,
              bienId: marca.bienId,
              hallazgo: marca.hallazgo,
              estadoConservacion: marca.estadoConservacion,
              descripcion: bien?.descripcion ?? '',
              codigoPatrimonialLeido: null,
              observaciones: marca.observaciones.trim(),
              fecha,
            },
          ];
        }),
        ...input.adicionales.map((hallazgo) => ({
          campaniaId: campania.id,
          establecimientoId: ambiente.establecimientoId,
          ambienteId: ambiente.id,
          bienId: hallazgo.bienId,
          hallazgo: 'encontrado' as const,
          estadoConservacion: hallazgo.estadoConservacion,
          descripcion: hallazgo.bienId ? (obtenerBien(hallazgo.bienId)?.descripcion ?? '') : hallazgo.descripcion.trim(),
          codigoPatrimonialLeido: hallazgo.bienId ? null : hallazgo.codigoPatrimonialLeido?.trim() || null,
          observaciones: hallazgo.observaciones.trim(),
          fecha,
        })),
      ];
      const ids = nextIds('VER', db.verificaciones.all().map((v) => v.id), 6, registros.length);
      db.verificaciones.insertMany(registros.map((registro, index) => ({ ...registro, id: ids[index] ?? '' })));

      const yaVerificada = db.unidadesVerificadas
        .all()
        .find((u) => u.campaniaId === campania.id && u.tipo === 'ambiente' && u.unidadId === ambiente.id);
      if (input.finalizar && !yaVerificada) {
        db.unidadesVerificadas.insert({
          id: nextId('UNV', db.unidadesVerificadas.all().map((u) => u.id), 5),
          campaniaId: campania.id,
          establecimientoId: ambiente.establecimientoId,
          tipo: 'ambiente',
          unidadId: ambiente.id,
          fecha,
        });
        for (const registro of registros) {
          if (!registro.bienId) continue;
          const bien = obtenerBien(registro.bienId);
          const fueraDeLugar = bien && bien.ambienteId !== ambiente.id ? ` (registrado en ${nombreAmbiente(bien.ambienteId)})` : '';
          registrarEventoBien(
            registro.bienId,
            'verificacion',
            `Verificado en ${campania.id} – ${ambiente.nombre}: ${HALLAZGO_LABEL[registro.hallazgo].toLowerCase()}${fueraDeLugar}, estado ${ESTADO_CONSERVACION_LABEL[registro.estadoConservacion]}.`,
          );
        }
      }
      if (!input.finalizar && yaVerificada) db.unidadesVerificadas.remove(yaVerificada.id);
    });
  });
}

export interface GuardarConteoInput {
  campaniaId: string;
  almacenId: string;
  conteos: ConteoInput[];
  finalizar: boolean;
}

export function guardarConteoAlmacen(input: GuardarConteoInput): Promise<void> {
  return simulateRequest(() => {
    const campania = campaniaEnCurso(input.campaniaId);
    const almacen = obtenerAlmacen(input.almacenId);
    ensure(almacen && campania.establecimientoIds.includes(almacen.establecimientoId), 'El almacén no pertenece a los CAR de la campaña.');
    for (const conteo of input.conteos) {
      ensure(
        conteo.cantidadFisica === null || (Number.isFinite(conteo.cantidadFisica) && conteo.cantidadFisica >= 0),
        'Las cantidades físicas deben ser números mayores o iguales a cero.',
      );
    }
    if (input.finalizar) {
      const pendientes = input.conteos.filter((c) => c.cantidadFisica === null).length;
      ensure(pendientes === 0, `Faltan ${pendientes} suministros por contar. Registre la cantidad física de cada uno antes de finalizar.`);
    }
    const previos = conteosDe(campania.id, almacen.id);

    runTransaction(() => {
      const fecha = nowIso();
      for (const previo of previos) db.conteos.remove(previo.id);
      const registros = input.conteos.flatMap((conteo) => {
        if (conteo.cantidadFisica === null) return [];
        const previo = previos.find((p) => p.suministroId === conteo.suministroId);
        return [
          {
            campaniaId: campania.id,
            establecimientoId: almacen.establecimientoId,
            almacenId: almacen.id,
            suministroId: conteo.suministroId,
            // Se conserva el stock del sistema del primer conteo (foto al momento de contar)
            cantidadSistema: previo?.cantidadSistema ?? stockDe(almacen.id, conteo.suministroId),
            cantidadFisica: conteo.cantidadFisica,
            observaciones: conteo.observaciones.trim(),
            fecha,
          },
        ];
      });
      const ids = nextIds('CNT', db.conteos.all().map((c) => c.id), 6, registros.length);
      db.conteos.insertMany(registros.map((registro, index) => ({ ...registro, id: ids[index] ?? '' })));

      const yaVerificada = db.unidadesVerificadas
        .all()
        .find((u) => u.campaniaId === campania.id && u.tipo === 'almacen' && u.unidadId === almacen.id);
      if (input.finalizar && !yaVerificada) {
        db.unidadesVerificadas.insert({
          id: nextId('UNV', db.unidadesVerificadas.all().map((u) => u.id), 5),
          campaniaId: campania.id,
          establecimientoId: almacen.establecimientoId,
          tipo: 'almacen',
          unidadId: almacen.id,
          fecha,
        });
      }
      if (!input.finalizar && yaVerificada) db.unidadesVerificadas.remove(yaVerificada.id);
    });
  });
}

