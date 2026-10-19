#!/usr/bin/env node
// Genera los datos mock iniciales del prototipo (src/mocks/*.json) de forma determinista.
// Todos los nombres, direcciones, custodios y códigos son ficticios; no hay datos personales reales.
// Uso: node scripts/generar-mocks.mjs   (fecha de referencia: 17/10/2026)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../src/mocks');
const RESPONSABLE = 'Equipo de inventario USPNNA';

// ---------------------------------------------------------------------------
// Utilidades deterministas
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261017);
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (list) => list[Math.floor(rand() * list.length)];
const chance = (p) => rand() < p;
const pad = (value, digits) => String(value).padStart(digits, '0');

function weighted(entries) {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rand() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

function addDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function diffDays(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

function randomDate(from, to) {
  return addDays(from, int(0, Math.max(0, diffDays(from, to))));
}

/** Fecha y hora ISO a partir de una hora local de Lima (UTC-5). */
function dateTime(isoDate, hour = int(8, 17), minute = pick([0, 10, 15, 20, 30, 40, 45, 50])) {
  return `${isoDate}T${pad(hour + 5, 2)}:${pad(minute, 2)}:00.000Z`;
}

function assignIds(items, prefix, digits, dateKey) {
  items.sort((a, b) => (a[dateKey] < b[dateKey] ? -1 : a[dateKey] > b[dateKey] ? 1 : 0));
  items.forEach((item, index) => {
    item.id = `${prefix}-${pad(index + 1, digits)}`;
  });
  return items;
}

// ---------------------------------------------------------------------------
// Establecimientos (CAR ficticios)
// ---------------------------------------------------------------------------
const CARS = [
  ['CAR Esperanza', 'Niñas y adolescentes mujeres de 6 a 17 años', 40, 'Lima', 'Lima', 'San Miguel'],
  ['CAR Nuevo Amanecer', 'Niños y adolescentes varones de 6 a 17 años', 36, 'Lima', 'Lima', 'San Juan de Lurigancho'],
  ['CAR Rayitos de Sol', 'Niñas y niños de 0 a 5 años', 30, 'Callao', 'Callao', 'Bellavista'],
  ['CAR Los Girasoles', 'Adolescentes mujeres de 12 a 17 años', 32, 'Arequipa', 'Arequipa', 'Cayma'],
  ['CAR Inti Wasi', 'Niñas, niños y adolescentes de 6 a 17 años', 28, 'Cusco', 'Cusco', 'Santiago'],
  ['CAR Horizonte', 'Adolescentes varones de 12 a 17 años', 34, 'Piura', 'Piura', 'Castilla'],
  ['CAR Semillitas', 'Niñas y niños de 0 a 5 años', 26, 'La Libertad', 'Trujillo', 'Víctor Larco Herrera'],
  ['CAR Arco Iris', 'Niñas y adolescentes mujeres de 6 a 17 años', 30, 'Junín', 'Huancayo', 'El Tambo'],
];

const LEVANTAMIENTO = [
  ['completado', '2026-04-24'],
  ['completado', '2026-04-24'],
  ['completado', '2026-04-24'],
  ['en_curso', null],
  ['en_curso', null],
  ['en_curso', null],
  ['en_curso', null],
  ['pendiente', null],
];

const establecimientos = CARS.map(([nombre, tipoPoblacion, capacidad, departamento, provincia, distrito], index) => ({
  id: `CAR-${pad(index + 1, 2)}`,
  nombre,
  tipoPoblacion,
  capacidad,
  departamento,
  provincia,
  distrito,
  direccion: `Av. Referencial ${101 + index * 12}, ${distrito} (dirección ficticia)`,
  responsable: `Responsable ${pad(index + 1, 2)} – Dirección del CAR`,
  estado: 'activo',
  estadoLevantamiento: LEVANTAMIENTO[index][0],
  fechaLevantamiento: LEVANTAMIENTO[index][1],
}));

// ---------------------------------------------------------------------------
// Ambientes
// ---------------------------------------------------------------------------
const AMBIENTES_BASE = [
  ['Dormitorio 1', 'dormitorio', 'Piso 2', 'Área de dormitorios'],
  ['Dormitorio 2', 'dormitorio', 'Piso 2', 'Área de dormitorios'],
  ['Cocina', 'cocina', 'Piso 1', 'Área de cocina'],
  ['Comedor', 'comedor', 'Piso 1', 'Área de comedor'],
  ['Oficina de dirección', 'oficina', 'Piso 1', 'Dirección'],
  ['Tópico', 'salud', 'Piso 1', 'Área de salud'],
];
const ESTUDIO = ['Sala de estudio', 'estudio', 'Piso 1', 'Área educativa'];
const LAVANDERIA = ['Lavandería', 'servicios', 'Piso 1', 'Servicios generales'];
const RECREACION = ['Sala de recreación', 'recreacion', 'Piso 1', 'Área de recreación'];

const ambientes = [];
for (const [index, car] of establecimientos.entries()) {
  const lista = [...AMBIENTES_BASE, ESTUDIO];
  if (index % 2 === 0) lista.push(LAVANDERIA);
  if (index === 0 || index === 4) lista.push(RECREACION);
  lista.forEach(([nombre, tipo, piso, area], position) => {
    ambientes.push({
      id: `AMB-${pad(ambientes.length + 1, 4)}`,
      establecimientoId: car.id,
      nombre,
      tipo,
      piso,
      custodio: `Custodio ${pad(position + 1, 2)} – ${area}`,
      estado: 'activo',
    });
  });
}
const ambienteById = new Map(ambientes.map((a) => [a.id, a]));
const ambientesDe = (carId) => ambientes.filter((a) => a.establecimientoId === carId);
const ambienteDe = (carId, nombre) => ambientes.find((a) => a.establecimientoId === carId && a.nombre === nombre);

// ---------------------------------------------------------------------------
// Almacenes
// ---------------------------------------------------------------------------
const almacenes = [];
for (const car of establecimientos) {
  almacenes.push({
    id: `ALM-${pad(almacenes.length + 1, 3)}`,
    establecimientoId: car.id,
    nombre: 'Almacén de víveres',
    tipo: 'viveres',
    responsable: 'Responsable 01 – Almacén de víveres',
    estado: 'activo',
  });
  almacenes.push({
    id: `ALM-${pad(almacenes.length + 1, 3)}`,
    establecimientoId: car.id,
    nombre: 'Almacén general',
    tipo: 'general',
    responsable: 'Responsable 02 – Almacén general',
    estado: 'activo',
  });
}
const almacenDe = (carId, tipo) => almacenes.find((a) => a.establecimientoId === carId && a.tipo === tipo);

// ---------------------------------------------------------------------------
// Bienes patrimoniales
// ---------------------------------------------------------------------------
const P = (descripcion, categoria, min, max, colores, valor, extra = {}) => ({
  descripcion,
  categoria,
  min,
  max,
  colores,
  valor,
  marcas: extra.marcas ?? ['Fabricación nacional'],
  modelos: extra.modelos ?? {},
  serie: extra.serie ?? false,
});

const PLANTILLAS = {
  dormitorio: [
    P('Litera de metal de 2 niveles', 'mobiliario', 2, 3, ['Gris', 'Negro', 'Blanco'], [450, 750]),
    P('Ropero de melamina de 2 puertas', 'mobiliario', 1, 1, ['Haya', 'Cedro', 'Blanco'], [380, 620]),
    P('Cómoda de melamina de 4 cajones', 'mobiliario', 0, 1, ['Haya', 'Wengue'], [300, 480]),
    P('Velador de madera', 'mobiliario', 1, 1, ['Cedro', 'Caoba'], [120, 220]),
  ],
  cocina: [
    P('Cocina industrial de 3 hornillas', 'equipo_cocina', 1, 1, ['Acero inoxidable'], [1200, 1900], { serie: true }),
    P('Refrigeradora de 14 pies cúbicos', 'electrodomestico', 1, 1, ['Plateado', 'Blanco'], [1800, 2600], {
      marcas: ['LG', 'Samsung', 'Mabe'],
      modelos: { LG: 'GT40', Samsung: 'RT38', Mabe: 'RMA400' },
      serie: true,
    }),
    P('Licuadora industrial de 10 litros', 'equipo_cocina', 1, 1, ['Acero inoxidable'], [650, 980], { serie: true }),
    P('Mesa de trabajo de acero inoxidable', 'mobiliario', 1, 1, ['Acero inoxidable'], [700, 1100]),
    P('Congeladora horizontal de 300 litros', 'electrodomestico', 0, 1, ['Blanco'], [1500, 2100], {
      marcas: ['Bosch', 'Mabe'],
      modelos: { Bosch: 'GTM30', Mabe: 'CHM30' },
      serie: true,
    }),
  ],
  comedor: [
    P('Mesa de comedor de madera para 8 personas', 'mobiliario', 2, 3, ['Cedro', 'Caoba'], [900, 1400]),
    P('Banca de madera de 2 metros', 'mobiliario', 2, 3, ['Cedro'], [250, 400]),
    P('Televisor LED de 50 pulgadas', 'electrodomestico', 1, 1, ['Negro'], [1600, 2300], {
      marcas: ['LG', 'Samsung'],
      modelos: { LG: '50UR8750', Samsung: 'UN50CU7000' },
      serie: true,
    }),
    P('Dispensador de agua fría y caliente', 'electrodomestico', 1, 1, ['Blanco'], [350, 520], {
      marcas: ['Oster', 'Imaco'],
      modelos: { Oster: 'OS-WD100', Imaco: 'IWD20' },
      serie: true,
    }),
  ],
  oficina: [
    P('Computadora de escritorio', 'equipo_computo', 1, 2, ['Negro'], [2800, 3900], {
      marcas: ['HP', 'Lenovo', 'Dell'],
      modelos: { HP: 'ProDesk 400 G9', Lenovo: 'ThinkCentre M70s', Dell: 'OptiPlex 7010' },
      serie: true,
    }),
    P('Monitor LED de 24 pulgadas', 'equipo_computo', 1, 2, ['Negro'], [650, 950], {
      marcas: ['HP', 'Lenovo', 'Dell'],
      modelos: { HP: 'P24 G5', Lenovo: 'ThinkVision T24i', Dell: 'P2422H' },
      serie: true,
    }),
    P('Impresora multifuncional de tinta continua', 'equipo_computo', 1, 1, ['Negro'], [900, 1300], {
      marcas: ['Epson', 'HP'],
      modelos: { Epson: 'EcoTank L5290', HP: 'Smart Tank 580' },
      serie: true,
    }),
    P('Escritorio de melamina con cajonera', 'mobiliario', 1, 2, ['Haya', 'Wengue'], [450, 800]),
    P('Silla giratoria con brazos', 'mobiliario', 1, 2, ['Negro'], [280, 450]),
    P('Archivador metálico de 4 gavetas', 'mobiliario', 1, 1, ['Gris'], [600, 900]),
    P('Laptop de 14 pulgadas', 'equipo_computo', 0, 1, ['Negro'], [3200, 4300], {
      marcas: ['Lenovo', 'HP'],
      modelos: { Lenovo: 'ThinkPad E14', HP: 'ProBook 440 G10' },
      serie: true,
    }),
  ],
  salud: [
    P('Camilla de examen clínico', 'equipo_salud', 1, 1, ['Blanco'], [700, 1100]),
    P('Tensiómetro digital de brazo', 'equipo_salud', 1, 1, ['Blanco'], [180, 260], {
      marcas: ['Omron'],
      modelos: { Omron: 'HEM-7120' },
      serie: true,
    }),
    P('Balanza de pie con tallímetro', 'equipo_salud', 1, 1, ['Blanco'], [900, 1400], {
      marcas: ['Seca'],
      modelos: { Seca: '700' },
      serie: true,
    }),
    P('Vitrina de vidrio para medicamentos', 'mobiliario', 1, 1, ['Blanco'], [500, 750]),
  ],
  estudio: [
    P('Mesa de estudio para 4 personas', 'mobiliario', 2, 3, ['Haya'], [350, 550]),
    P('Pizarra acrílica de 1.20 x 2.40 m', 'mobiliario', 1, 1, ['Blanco'], [280, 420]),
    P('Proyector multimedia', 'equipo_computo', 1, 1, ['Blanco'], [1900, 2600], {
      marcas: ['Epson'],
      modelos: { Epson: 'PowerLite E20' },
      serie: true,
    }),
    P('Estante de madera para libros', 'mobiliario', 1, 2, ['Cedro'], [300, 480]),
  ],
  servicios: [
    P('Lavadora industrial de 20 kg', 'electrodomestico', 1, 1, ['Blanco'], [2600, 3400], {
      marcas: ['LG', 'Samsung'],
      modelos: { LG: 'WM20', Samsung: 'WA20' },
      serie: true,
    }),
    P('Secadora de ropa de 18 kg', 'electrodomestico', 1, 1, ['Blanco'], [2200, 3000], {
      marcas: ['LG', 'Samsung'],
      modelos: { LG: 'DT18', Samsung: 'DV18' },
      serie: true,
    }),
    P('Terma eléctrica de 80 litros', 'electrodomestico', 1, 1, ['Blanco'], [650, 900], {
      marcas: ['Sole', 'Rheem'],
      modelos: { Sole: 'SOL-80', Rheem: 'RE80' },
      serie: true,
    }),
  ],
  recreacion: [
    P('Mesa de ping pong plegable', 'equipo_recreativo', 1, 1, ['Azul'], [900, 1300]),
    P('Futbolín de madera', 'equipo_recreativo', 1, 1, ['Natural'], [800, 1200]),
    P('Equipo de sonido con parlantes', 'electrodomestico', 1, 1, ['Negro'], [1100, 1600], {
      marcas: ['LG', 'Sony'],
      modelos: { LG: 'XBOOM CL65', Sony: 'MHC-V13' },
      serie: true,
    }),
  ],
};

// Catálogo ficticio de 8 dígitos por plantilla + correlativo de 4 dígitos = 12 dígitos
const catalogo = new Map();
let catalogoBase = 46220011;
for (const lista of Object.values(PLANTILLAS)) {
  for (const plantilla of lista) {
    catalogo.set(plantilla.descripcion, { prefijo: String(catalogoBase), correlativo: 0 });
    catalogoBase += 1373;
  }
}

function codigoPatrimonial(descripcion) {
  const entrada = catalogo.get(descripcion);
  entrada.correlativo += int(1, 3);
  return `${entrada.prefijo}${pad(entrada.correlativo, 4)}`;
}

const OBSERVACIONES = {
  bueno: ['', '', '', 'Rotulado con etiqueta de inventario anterior.'],
  regular: ['Presenta rayaduras y desgaste por uso.', 'Requiere mantenimiento preventivo.', ''],
  malo: ['No funciona correctamente; requiere evaluación técnica.', 'Estructura dañada.'],
  sin_evaluar: ['Pendiente de evaluación del estado de conservación.'],
};

const bienes = [];
const eventos = [];

function evento(bien, fecha, tipo, descripcion, ambienteOrigenId = null, ambienteDestinoId = null) {
  eventos.push({ id: '', bienId: bien.id, fecha, tipo, descripcion, ambienteOrigenId, ambienteDestinoId, responsable: RESPONSABLE });
}

function crearBien(car, ambiente, plantilla, carIndex) {
  const marca = pick(plantilla.marcas);
  const pesos =
    carIndex === 7
      ? [['bueno', 40], ['regular', 20], ['malo', 6], ['sin_evaluar', 34]]
      : carIndex >= 5
        ? [['bueno', 52], ['regular', 26], ['malo', 8], ['sin_evaluar', 14]]
        : [['bueno', 58], ['regular', 30], ['malo', 9], ['sin_evaluar', 3]];
  const estadoConservacion = weighted(pesos);
  const conCodigo = chance(carIndex === 7 ? 0.6 : 0.78);
  const fechaAdquisicion = chance(conCodigo ? 0.85 : 0.45) ? randomDate('2014-01-06', '2025-11-28') : null;
  const fechaRegistro = dateTime(randomDate('2026-01-12', '2026-02-10'));
  const bien = {
    id: `BP-${pad(bienes.length + 1, 6)}`,
    codigoPatrimonial: conCodigo ? codigoPatrimonial(plantilla.descripcion) : null,
    descripcion: plantilla.descripcion,
    categoria: plantilla.categoria,
    marca,
    modelo: plantilla.modelos[marca] ?? '',
    serie: plantilla.serie ? `${marca.slice(0, 2).toUpperCase().replace(/[^A-Z]/g, 'X')}${int(10000000, 99999999)}` : '',
    color: pick(plantilla.colores),
    establecimientoId: car.id,
    ambienteId: ambiente.id,
    custodio: ambiente.custodio,
    estadoConservacion,
    situacion: 'activo',
    fechaAdquisicion,
    valorReferencial: fechaAdquisicion ? int(plantilla.valor[0], plantilla.valor[1]) : null,
    observaciones: pick(OBSERVACIONES[estadoConservacion]),
    fotos: [],
    motivoBaja: null,
    fechaRegistro,
    fechaActualizacion: fechaRegistro,
  };
  bienes.push(bien);
  return bien;
}

for (const [carIndex, car] of establecimientos.entries()) {
  for (const ambiente of ambientesDe(car.id)) {
    for (const plantilla of PLANTILLAS[ambiente.tipo]) {
      const cantidad = int(plantilla.min, plantilla.max);
      for (let n = 0; n < cantidad; n++) crearBien(car, ambiente, plantilla, carIndex);
    }
  }
}

const bienesDe = (carId) => bienes.filter((b) => b.establecimientoId === carId);
const bienesEn = (ambienteId) => bienes.filter((b) => b.ambienteId === ambienteId && b.situacion === 'activo');
const reservados = new Set();
function reservar(bien) {
  reservados.add(bien.id);
  return bien;
}
function elegirBien(lista, filtro = () => true) {
  const candidatos = lista.filter((b) => !reservados.has(b.id) && b.situacion === 'activo' && filtro(b));
  return candidatos.length > 0 ? reservar(pick(candidatos)) : undefined;
}

// Ubicación inicial registrada (antes de transferencias) para el evento de registro
const ambienteRegistro = new Map(bienes.map((b) => [b.id, b.ambienteId]));

// Casos especiales del CAM-2026-001 (cerrada): dos diferencias de ubicación regularizadas
const cam1Ubicacion = [
  elegirBien(bienesDe('CAR-01'), (b) => b.categoria === 'mobiliario' && b.descripcion.startsWith('Silla')) ??
    elegirBien(bienesDe('CAR-01'), (b) => b.categoria === 'mobiliario'),
  elegirBien(bienesDe('CAR-03'), (b) => b.categoria === 'mobiliario'),
].map((bien) => {
  const destino = pick(ambientesDe(bien.establecimientoId).filter((a) => a.id !== bien.ambienteId));
  return { bien, origenId: bien.ambienteId, destinoId: destino.id };
});

// Casos del CAM-2026-002 (en conciliación)
const cam2Ubicacion = [
  elegirBien(bienesDe('CAR-04'), (b) => b.categoria === 'mobiliario'),
  elegirBien(bienesDe('CAR-04'), (b) => b.categoria === 'equipo_computo'),
].map((bien) => {
  const destino = pick(ambientesDe(bien.establecimientoId).filter((a) => a.id !== bien.ambienteId));
  return { bien, origenId: bien.ambienteId, destinoId: destino.id, destinoCarId: bien.establecimientoId };
});
const cam2Televisor = elegirBien(bienesDe('CAR-04'), (b) => b.descripcion.startsWith('Televisor'));
cam2Ubicacion.push({
  bien: cam2Televisor,
  origenId: cam2Televisor.ambienteId,
  destinoId: ambienteDe('CAR-05', 'Comedor').id,
  destinoCarId: 'CAR-05',
});
const cam2Faltantes = [
  elegirBien(bienesDe('CAR-04'), (b) => b.descripcion.startsWith('Tensiómetro')),
  elegirBien(bienesDe('CAR-04'), (b) => b.categoria === 'mobiliario'),
  elegirBien(bienesDe('CAR-05'), (b) => b.descripcion.startsWith('Laptop') || b.descripcion.startsWith('Monitor')),
  elegirBien(bienesDe('CAR-05'), (b) => b.categoria === 'mobiliario'),
];
const cam2AmbientePendiente = ambienteDe('CAR-05', 'Sala de recreación');

// Casos del CAM-2026-003 (en curso)
const cam3NoEncontrado = elegirBien(bienesDe('CAR-06'), (b) => b.ambienteId === ambienteDe('CAR-06', 'Comedor').id);

// Transferencias históricas (antes de las verificaciones de cada CAR)
function transferir(bien, fecha) {
  const origen = pick(ambientesDe(bien.establecimientoId).filter((a) => a.id !== bien.ambienteId && a.tipo !== 'cocina'));
  ambienteRegistro.set(bien.id, origen.id);
  const destino = ambienteById.get(bien.ambienteId);
  const fechaHora = dateTime(fecha);
  evento(
    bien,
    fechaHora,
    'transferencia',
    `Transferencia de ${origen.nombre} a ${destino.nombre}. Motivo: redistribución de mobiliario y equipos.`,
    origen.id,
    destino.id,
  );
  bien.fechaActualizacion = fechaHora;
}

for (const carId of ['CAR-01', 'CAR-02', 'CAR-03']) {
  for (let n = 0; n < 2; n++) transferir(elegirBien(bienesDe(carId)), randomDate('2026-02-12', '2026-02-27'));
}
for (const carId of ['CAR-06', 'CAR-07', 'CAR-08']) {
  for (let n = 0; n < 2; n++) transferir(elegirBien(bienesDe(carId)), randomDate('2026-05-04', '2026-09-25'));
}

// Actualizaciones del estado de conservación
const ETIQUETA_ESTADO = { bueno: 'Bueno', regular: 'Regular', malo: 'Malo', sin_evaluar: 'Sin evaluar' };
for (let n = 0; n < 10; n++) {
  const bien = elegirBien(bienes, (b) => b.estadoConservacion === 'regular' || b.estadoConservacion === 'malo');
  const fecha = dateTime(randomDate('2026-05-04', '2026-07-31'));
  evento(bien, fecha, 'actualizacion', `Actualización del estado de conservación a ${ETIQUETA_ESTADO[bien.estadoConservacion]}.`);
  bien.fechaActualizacion = fecha;
}

// Bajas por deterioro u obsolescencia (fuera del alcance de las campañas abiertas)
for (const carId of ['CAR-01', 'CAR-02', 'CAR-03', 'CAR-08', 'CAR-08']) {
  const bien = elegirBien(bienesDe(carId), (b) => b.estadoConservacion === 'malo') ?? elegirBien(bienesDe(carId));
  const motivo = bien.categoria === 'equipo_computo' ? 'Obsolescencia técnica' : 'Deterioro irreparable';
  const fecha = dateTime(randomDate('2026-06-01', '2026-09-30'));
  bien.situacion = 'baja';
  bien.estadoConservacion = 'malo';
  bien.motivoBaja = motivo;
  bien.fechaActualizacion = fecha;
  evento(bien, fecha, 'baja', `Baja del bien. Motivo: ${motivo}. Sustento: Informe técnico N.° ${pad(int(10, 99), 3)}-2026-USPNNA.`);
}

// Evento de registro de todos los bienes iniciales
for (const bien of bienes) {
  const ambiente = ambienteById.get(ambienteRegistro.get(bien.id));
  evento(bien, bien.fechaRegistro, 'registro', `Registro inicial del bien en ${ambiente.nombre}.`, null, ambiente.id);
}

// ---------------------------------------------------------------------------
// Suministros, lotes y movimientos
// ---------------------------------------------------------------------------
const SUMINISTROS = [
  ['Arroz extra', 'viveres', 'kg', 60, true],
  ['Azúcar rubia', 'viveres', 'kg', 40, true],
  ['Aceite vegetal', 'viveres', 'litro', 20, true],
  ['Leche evaporada', 'viveres', 'lata', 96, true],
  ['Fideos tallarín', 'viveres', 'paquete', 40, true],
  ['Avena en hojuelas', 'viveres', 'kg', 15, true],
  ['Lentejas', 'viveres', 'kg', 15, true],
  ['Atún en conserva', 'viveres', 'lata', 48, true],
  ['Harina de trigo', 'viveres', 'kg', 10, true],
  ['Frijol canario', 'viveres', 'kg', 15, true],
  ['Detergente en polvo', 'limpieza', 'kg', 15, false],
  ['Lejía', 'limpieza', 'litro', 12, false],
  ['Jabón de lavar ropa', 'limpieza', 'unidad', 24, false],
  ['Desinfectante de pisos', 'limpieza', 'litro', 10, false],
  ['Bolsas para basura de 140 litros', 'limpieza', 'paquete', 10, false],
  ['Papel higiénico', 'aseo_personal', 'paquete', 20, false],
  ['Jabón de tocador', 'aseo_personal', 'unidad', 40, true],
  ['Pasta dental', 'aseo_personal', 'unidad', 30, true],
  ['Champú', 'aseo_personal', 'frasco', 20, true],
  ['Toallas higiénicas', 'aseo_personal', 'paquete', 24, false],
  ['Cepillo dental', 'aseo_personal', 'unidad', 30, false],
  ['Cuaderno cuadriculado A4', 'utiles', 'unidad', 40, false],
  ['Lápiz negro N.° 2', 'utiles', 'caja', 5, false],
  ['Papel bond A4 de 75 g', 'utiles', 'paquete', 6, false],
  ['Colores de 12 unidades', 'utiles', 'caja', 10, false],
  ['Paracetamol 500 mg', 'medicinas', 'caja', 4, true],
  ['Alcohol de 70°', 'medicinas', 'frasco', 6, true],
  ['Gasa estéril', 'medicinas', 'paquete', 10, true],
  ['Sales de rehidratación oral', 'medicinas', 'unidad', 20, true],
  ['Ibuprofeno 400 mg', 'medicinas', 'caja', 3, true],
];

const suministros = SUMINISTROS.map(([nombre, categoria, unidad, stockMinimo, controlaVencimiento], index) => ({
  id: `SUM-${pad(index + 1, 4)}`,
  nombre,
  categoria,
  unidad,
  stockMinimo,
  controlaVencimiento,
  descripcion: '',
  estado: 'activo',
}));
const suministroById = new Map(suministros.map((s) => [s.id, s]));

const CATEGORIAS_ALMACEN = { viveres: ['viveres'], general: ['limpieza', 'aseo_personal', 'utiles', 'medicinas'] };

function fechaVencimiento() {
  return weighted([
    [() => randomDate('2026-08-20', '2026-10-14'), 9],
    [() => randomDate('2026-10-19', '2026-11-14'), 16],
    [() => randomDate('2026-12-01', '2027-12-31'), 75],
  ])();
}

const lotes = [];
const consumos = [];
const movimientos = [];

for (const almacen of almacenes) {
  const fechasIngreso = [
    randomDate('2026-06-08', '2026-06-19'),
    randomDate('2026-07-13', '2026-07-24'),
    randomDate('2026-08-17', '2026-08-28'),
  ];
  const ingresosPorFecha = new Map();

  for (const suministro of suministros.filter((s) => CATEGORIAS_ALMACEN[almacen.tipo].includes(s.categoria))) {
    if (!chance(0.85)) continue;
    const roll = rand();
    const minimo = suministro.stockMinimo;
    const objetivo = roll < 0.05 ? 0 : roll < 0.2 ? int(1, minimo) : int(minimo + 1, minimo * 3);
    const partes = suministro.controlaVencimiento && objetivo > minimo && chance(0.5)
      ? (() => {
          const primera = Math.max(1, Math.floor(objetivo * (0.3 + rand() * 0.3)));
          return [primera, objetivo - primera];
        })()
      : [objetivo];
    const numeros = new Set();

    for (const parte of partes) {
      let consumido = objetivo === 0 ? int(Math.ceil(minimo * 0.5), minimo * 2) : int(0, Math.floor(parte * 0.8));
      if (parte + consumido === 0) consumido = int(1, minimo);
      let numeroLote = null;
      let vencimiento = null;
      if (suministro.controlaVencimiento) {
        do numeroLote = `L${pad(int(100, 9999), 4)}`;
        while (numeros.has(numeroLote));
        numeros.add(numeroLote);
        vencimiento = fechaVencimiento();
      }
      const candidatas = vencimiento ? fechasIngreso.filter((f) => diffDays(f, vencimiento) > 45) : fechasIngreso;
      const fechaIngreso = candidatas.length > 0 ? pick(candidatas) : fechasIngreso[0];
      const lote = {
        id: '',
        suministroId: suministro.id,
        almacenId: almacen.id,
        numeroLote,
        fechaVencimiento: vencimiento,
        cantidad: parte,
        fechaIngreso,
      };
      lotes.push(lote);
      if (consumido > 0) consumos.push({ lote, cantidad: consumido });
      const items = ingresosPorFecha.get(fechaIngreso) ?? [];
      items.push({ suministroId: suministro.id, cantidad: parte + consumido, numeroLote, fechaVencimiento: vencimiento });
      ingresosPorFecha.set(fechaIngreso, items);
    }
  }

  for (const [fecha, items] of ingresosPorFecha) {
    const motivo = almacen.tipo === 'viveres'
      ? weighted([['Distribución de sede central', 60], ['Compra', 30], ['Donación', 10]])
      : weighted([['Distribución de sede central', 50], ['Compra', 40], ['Donación', 10]]);
    const documento =
      motivo === 'Compra'
        ? `Guía de remisión N.° 001-${pad(int(1000, 99999), 6)}`
        : motivo === 'Donación'
          ? `Acta de donación N.° ${pad(int(1, 120), 3)}-2026`
          : `PECOSA N.° 2026-${pad(int(1, 2400), 4)}`;
    movimientos.push({
      id: '',
      tipo: 'ingreso',
      fecha,
      almacenOrigenId: null,
      almacenDestinoId: almacen.id,
      documento,
      motivo,
      items,
      observaciones: '',
      fechaRegistro: dateTime(fecha),
    });
  }
}

// Salidas por consumo agrupadas por almacén y fecha
const salidasPorClave = new Map();
for (const { lote, cantidad } of consumos) {
  const desde = addDays(lote.fechaIngreso, 5);
  const fecha = pick(
    ['2026-07-30', '2026-08-31', '2026-09-28', '2026-10-14'].filter((f) => f > desde),
  ) ?? '2026-10-14';
  const clave = `${lote.almacenId}|${fecha}`;
  const items = salidasPorClave.get(clave) ?? [];
  items.push({ suministroId: lote.suministroId, cantidad, numeroLote: lote.numeroLote, fechaVencimiento: lote.fechaVencimiento });
  salidasPorClave.set(clave, items);
}
let notaSalida = 0;
for (const [clave, items] of salidasPorClave) {
  const [almacenId, fecha] = clave.split('|');
  movimientos.push({
    id: '',
    tipo: 'salida',
    fecha,
    almacenOrigenId: almacenId,
    almacenDestinoId: null,
    documento: `Nota de salida N.° ${pad(++notaSalida, 4)}-2026`,
    motivo: 'Consumo',
    items,
    observaciones: '',
    fechaRegistro: dateTime(fecha),
  });
}

// Transferencias entre CAR (fuera de los CAR del CAM-2026-002)
const stockLote = (lote) => lote.cantidad;
for (const [origenCar, destinoCar, tipo] of [
  ['CAR-01', 'CAR-02', 'viveres'],
  ['CAR-03', 'CAR-01', 'general'],
  ['CAR-06', 'CAR-07', 'viveres'],
]) {
  const origen = almacenDe(origenCar, tipo);
  const destino = almacenDe(destinoCar, tipo);
  const lote = pick(lotes.filter((l) => l.almacenId === origen.id && stockLote(l) >= 10 && (!l.fechaVencimiento || l.fechaVencimiento > '2026-12-01')));
  if (!lote) continue;
  const cantidad = Math.floor(lote.cantidad * 0.3);
  const fecha = randomDate('2026-10-06', '2026-10-12');
  lote.cantidad -= cantidad;
  const existente = lotes.find(
    (l) => l.almacenId === destino.id && l.suministroId === lote.suministroId && l.numeroLote === lote.numeroLote,
  );
  if (existente) existente.cantidad += cantidad;
  else lotes.push({ ...lote, id: '', almacenId: destino.id, cantidad, fechaIngreso: fecha });
  movimientos.push({
    id: '',
    tipo: 'transferencia',
    fecha,
    almacenOrigenId: origen.id,
    almacenDestinoId: destino.id,
    documento: `Guía de remisión N.° 002-${pad(int(1000, 9999), 6)}`,
    motivo: 'Reposición a otro CAR',
    items: [{ suministroId: lote.suministroId, cantidad, numeroLote: lote.numeroLote, fechaVencimiento: lote.fechaVencimiento }],
    observaciones: '',
    fechaRegistro: dateTime(fecha),
  });
}

function stockPorAlmacen(almacenId) {
  const mapa = new Map();
  for (const lote of lotes.filter((l) => l.almacenId === almacenId)) {
    mapa.set(lote.suministroId, (mapa.get(lote.suministroId) ?? 0) + lote.cantidad);
  }
  return mapa;
}

// ---------------------------------------------------------------------------
// Campañas
// ---------------------------------------------------------------------------
const campanias = [
  {
    id: 'CAM-2026-001',
    nombre: 'Levantamiento inicial 2026 – Lima y Callao',
    tipo: 'inicial',
    descripcion: 'Primer levantamiento de bienes patrimoniales y suministros de los CAR de Lima Metropolitana y Callao.',
    establecimientoIds: ['CAR-01', 'CAR-02', 'CAR-03'],
    fechaInicio: '2026-03-02',
    fechaFin: '2026-04-10',
    responsable: 'Equipo de inventario 01 – USPNNA',
    estado: 'cerrada',
    fechaConciliacion: '2026-04-13T20:00:00.000Z',
    fechaCierre: '2026-04-24T21:00:00.000Z',
  },
  {
    id: 'CAM-2026-002',
    nombre: 'Levantamiento inicial 2026 – Arequipa y Cusco',
    tipo: 'inicial',
    descripcion: 'Levantamiento en los CAR de la macrorregión sur, a cargo del equipo itinerante de la USPNNA.',
    establecimientoIds: ['CAR-04', 'CAR-05'],
    fechaInicio: '2026-08-03',
    fechaFin: '2026-09-11',
    responsable: 'Equipo de inventario 02 – USPNNA',
    estado: 'en_conciliacion',
    fechaConciliacion: '2026-09-15T19:00:00.000Z',
    fechaCierre: null,
  },
  {
    id: 'CAM-2026-003',
    nombre: 'Levantamiento inicial 2026 – Piura y La Libertad',
    tipo: 'inicial',
    descripcion: 'Levantamiento en los CAR de la macrorregión norte.',
    establecimientoIds: ['CAR-06', 'CAR-07'],
    fechaInicio: '2026-10-01',
    fechaFin: '2026-11-06',
    responsable: 'Equipo de inventario 01 – USPNNA',
    estado: 'en_curso',
    fechaConciliacion: null,
    fechaCierre: null,
  },
  {
    id: 'CAM-2026-004',
    nombre: 'Levantamiento inicial 2026 – Junín',
    tipo: 'inicial',
    descripcion: 'Levantamiento programado para el CAR de la región Junín.',
    establecimientoIds: ['CAR-08'],
    fechaInicio: '2026-11-16',
    fechaFin: '2026-12-11',
    responsable: 'Equipo de inventario 02 – USPNNA',
    estado: 'planificada',
    fechaConciliacion: null,
    fechaCierre: null,
  },
];

const verificaciones = [];
const conteos = [];
const unidades = [];

function verificar(campaniaId, ambiente, bien, hallazgo, fecha, extra = {}) {
  const registro = {
    id: '',
    campaniaId,
    establecimientoId: ambiente.establecimientoId,
    ambienteId: ambiente.id,
    bienId: bien ? bien.id : null,
    hallazgo,
    estadoConservacion: extra.estadoConservacion ?? (bien ? bien.estadoConservacion : 'bueno'),
    descripcion: extra.descripcion ?? (bien ? bien.descripcion : ''),
    codigoPatrimonialLeido: extra.codigoPatrimonialLeido ?? null,
    observaciones: extra.observaciones ?? '',
    fecha: dateTime(fecha),
  };
  verificaciones.push(registro);
  return registro;
}

function unidadVerificada(campaniaId, establecimientoId, tipo, unidadId, fecha) {
  unidades.push({ id: '', campaniaId, establecimientoId, tipo, unidadId, fecha: dateTime(fecha, 17, 30) });
}

function contar(campaniaId, almacen, suministroId, cantidadSistema, cantidadFisica, fecha, observaciones = '') {
  conteos.push({
    id: '',
    campaniaId,
    establecimientoId: almacen.establecimientoId,
    almacenId: almacen.id,
    suministroId,
    cantidadSistema,
    cantidadFisica,
    observaciones,
    fecha: dateTime(fecha),
  });
}

function fechasPorUnidad(desde, hasta, cantidad) {
  const total = diffDays(desde, hasta);
  return Array.from({ length: cantidad }, (_, index) => addDays(desde, Math.floor((index * total) / Math.max(1, cantidad))));
}

// --- CAM-2026-001: todo verificado; dos diferencias de ubicación y un sobrante (regularizados)
{
  const camp = 'CAM-2026-001';
  const lista = ['CAR-01', 'CAR-02', 'CAR-03'].flatMap((carId) => ambientesDe(carId));
  const fechas = fechasPorUnidad('2026-03-02', '2026-04-08', lista.length);
  const especiales = new Map(cam1Ubicacion.map((caso) => [caso.bien.id, caso]));
  lista.forEach((ambiente, index) => {
    for (const bien of bienesEn(ambiente.id)) {
      const caso = especiales.get(bien.id);
      if (caso) {
        verificar(camp, ambienteById.get(caso.destinoId), bien, 'encontrado', fechas[index]);
      } else {
        verificar(camp, ambiente, bien, 'encontrado', fechas[index]);
      }
    }
    unidadVerificada(camp, ambiente.establecimientoId, 'ambiente', ambiente.id, fechas[index]);
  });
  const ambienteSobrante = ambienteDe('CAR-02', 'Sala de estudio');
  verificar(camp, ambienteSobrante, null, 'encontrado', '2026-03-24', {
    descripcion: 'Silla de plástico apilable color azul',
    estadoConservacion: 'bueno',
    observaciones: 'No figura en el registro; sin etiqueta patrimonial.',
  });
  for (const carId of ['CAR-01', 'CAR-02', 'CAR-03']) {
    for (const tipo of ['viveres', 'general']) {
      const almacen = almacenDe(carId, tipo);
      const fecha = randomDate('2026-03-30', '2026-04-08');
      for (const [suministroId] of stockPorAlmacen(almacen.id)) {
        const minimo = suministroById.get(suministroId).stockMinimo;
        const cantidad = int(minimo, minimo * 3);
        contar(camp, almacen, suministroId, cantidad, cantidad, fecha);
      }
      unidadVerificada(camp, carId, 'almacen', almacen.id, fecha);
    }
  }
}

// --- CAM-2026-002: verificación completa salvo una sala; faltantes, sobrantes y diferencias
{
  const camp = 'CAM-2026-002';
  const lista = ['CAR-04', 'CAR-05'].flatMap((carId) => ambientesDe(carId));
  const fechas = fechasPorUnidad('2026-08-03', '2026-09-09', lista.length);
  const porOrigen = new Map(cam2Ubicacion.map((caso) => [caso.bien.id, caso]));
  const faltantes = new Set(cam2Faltantes.map((b) => b.id));
  const fechaDe = new Map(lista.map((a, index) => [a.id, fechas[index]]));

  lista.forEach((ambiente) => {
    const fecha = fechaDe.get(ambiente.id);
    const esperados = bienesEn(ambiente.id);
    if (ambiente.id === cam2AmbientePendiente.id) {
      // Solo se alcanzó a verificar el primer bien: el resto queda pendiente
      const primero = esperados[0];
      if (primero) verificar(camp, ambiente, primero, 'encontrado', fecha);
      return;
    }
    for (const bien of esperados) {
      if (porOrigen.has(bien.id) || faltantes.has(bien.id)) {
        verificar(camp, ambiente, bien, 'no_encontrado', fecha, { observaciones: 'No se ubicó durante el recorrido.' });
      } else {
        const estado = chance(0.06) && bien.estadoConservacion === 'bueno' ? 'regular' : bien.estadoConservacion;
        verificar(camp, ambiente, bien, 'encontrado', fecha, { estadoConservacion: estado });
      }
    }
    unidadVerificada(camp, ambiente.establecimientoId, 'ambiente', ambiente.id, fecha);
  });

  for (const caso of cam2Ubicacion) {
    const destino = ambienteById.get(caso.destinoId);
    verificar(camp, destino, caso.bien, 'encontrado', fechaDe.get(destino.id) ?? '2026-09-01', {
      observaciones: 'Encontrado fuera de su ambiente registrado.',
    });
  }
  verificar(camp, ambienteDe('CAR-04', 'Dormitorio 2'), null, 'encontrado', fechaDe.get(ambienteDe('CAR-04', 'Dormitorio 2').id), {
    descripcion: 'Silla de plástico apilable color rojo',
    estadoConservacion: 'regular',
    observaciones: 'Sin etiqueta patrimonial.',
  });
  verificar(camp, ambienteDe('CAR-05', 'Oficina de dirección'), null, 'encontrado', fechaDe.get(ambienteDe('CAR-05', 'Oficina de dirección').id), {
    descripcion: 'Televisor LED de 32 pulgadas marca Samsung',
    estadoConservacion: 'bueno',
    codigoPatrimonialLeido: '462299990014',
    observaciones: 'Tiene etiqueta patrimonial que no figura en el registro.',
  });

  const diferencias = [];
  for (const [carId, tipo, parcial] of [
    ['CAR-04', 'viveres', false],
    ['CAR-04', 'general', false],
    ['CAR-05', 'viveres', false],
    ['CAR-05', 'general', true],
  ]) {
    const almacen = almacenDe(carId, tipo);
    const fecha = randomDate('2026-09-01', '2026-09-09');
    const pares = [...stockPorAlmacen(almacen.id)].filter(([, cantidad]) => cantidad > 0);
    const contados = parcial ? pares.slice(0, Math.ceil(pares.length / 2)) : pares;
    for (const [suministroId, cantidad] of contados) {
      contar(camp, almacen, suministroId, cantidad, cantidad, fecha);
      diferencias.push(conteos[conteos.length - 1]);
    }
    if (!parcial) unidadVerificada(camp, carId, 'almacen', almacen.id, fecha);
  }
  // Cuatro diferencias de cantidad (dos faltan, dos sobran); la de limpieza se regulariza
  const limpieza = diferencias.find((c) => suministroById.get(c.suministroId).categoria === 'limpieza' && c.establecimientoId === 'CAR-04');
  limpieza.cantidadFisica = limpieza.cantidadSistema + 6;
  limpieza.observaciones = 'Se encontraron unidades sin registrar en el anaquel inferior.';
  const otros = diferencias.filter((c) => c !== limpieza && c.cantidadSistema >= 8);
  const deltas = [-3, -5, 4];
  for (const delta of deltas) {
    const conteo = otros.splice(int(0, otros.length - 1), 1)[0];
    conteo.cantidadFisica = conteo.cantidadSistema + delta;
    conteo.observaciones = delta < 0 ? 'Diferencia por consumo no registrado.' : 'Ingreso no registrado en el sistema.';
  }
}

// --- CAM-2026-003: CAR-06 con avance parcial; CAR-07 sin iniciar
{
  const camp = 'CAM-2026-003';
  const completos = ['Dormitorio 1', 'Dormitorio 2', 'Cocina', 'Comedor'];
  const fechas = fechasPorUnidad('2026-10-01', '2026-10-14', completos.length + 1);
  completos.forEach((nombre, index) => {
    const ambiente = ambienteDe('CAR-06', nombre);
    for (const bien of bienesEn(ambiente.id)) {
      if (bien.id === cam3NoEncontrado.id) {
        verificar(camp, ambiente, bien, 'no_encontrado', fechas[index], { observaciones: 'Se consultará al custodio.' });
      } else {
        verificar(camp, ambiente, bien, 'encontrado', fechas[index]);
      }
    }
    unidadVerificada(camp, 'CAR-06', 'ambiente', ambiente.id, fechas[index]);
  });
  verificar(camp, ambienteDe('CAR-06', 'Cocina'), null, 'encontrado', fechas[2], {
    descripcion: 'Hervidor eléctrico de 1.7 litros',
    estadoConservacion: 'bueno',
    observaciones: 'Sin etiqueta patrimonial.',
  });
  const oficina = ambienteDe('CAR-06', 'Oficina de dirección');
  const esperadosOficina = bienesEn(oficina.id);
  for (const bien of esperadosOficina.slice(0, Math.ceil(esperadosOficina.length / 2))) {
    verificar(camp, oficina, bien, 'encontrado', fechas[4]);
  }
  const almacen = almacenDe('CAR-06', 'viveres');
  let diferencia = false;
  for (const [suministroId, cantidad] of stockPorAlmacen(almacen.id)) {
    if (cantidad === 0) continue;
    const fisica = !diferencia && cantidad >= 5 ? cantidad - 2 : cantidad;
    if (fisica !== cantidad) diferencia = true;
    contar(camp, almacen, suministroId, cantidad, fisica, '2026-10-15', fisica !== cantidad ? 'Diferencia por consumo no registrado.' : '');
  }
  unidadVerificada(camp, 'CAR-06', 'almacen', almacen.id, '2026-10-15');
}

assignIds(verificaciones, 'VER', 6, 'fecha');
assignIds(conteos, 'CNT', 6, 'fecha');
assignIds(unidades, 'UNV', 5, 'fecha');

// ---------------------------------------------------------------------------
// Conciliación (misma regla RN-K1 que conciliacion.service.ts)
// ---------------------------------------------------------------------------
const conciliaciones = [];

function itemBase(campaniaId, establecimientoId, tipoRegistro, resultado) {
  return {
    id: `CON-${pad(conciliaciones.length + 1, 6)}`,
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

function generarConciliacion(campania) {
  const alcance = new Set(campania.establecimientoIds);
  const verifs = verificaciones.filter((v) => v.campaniaId === campania.id);
  const conBien = new Set(verifs.filter((v) => v.bienId).map((v) => v.bienId));
  const lista = bienes.filter((b) => (b.situacion === 'activo' && alcance.has(b.establecimientoId)) || conBien.has(b.id));
  for (const bien of lista) {
    const marcas = verifs.filter((v) => v.bienId === bien.id);
    const encontrado = marcas.find((m) => m.hallazgo === 'encontrado');
    let resultado = 'pendiente';
    if (encontrado) resultado = encontrado.ambienteId === bien.ambienteId ? 'coincidente' : 'diferencia_ubicacion';
    else if (marcas.length > 0) resultado = 'faltante';
    const item = itemBase(campania.id, bien.establecimientoId, 'bien', resultado);
    item.bienId = bien.id;
    item.verificacionId = (encontrado ?? marcas[0])?.id ?? null;
    item.descripcion = bien.descripcion;
    item.codigoPatrimonial = bien.codigoPatrimonial;
    item.ambienteRegistradoId = bien.ambienteId;
    if (resultado === 'diferencia_ubicacion') {
      item.ambienteEncontradoId = encontrado.ambienteId;
      item.establecimientoEncontradoId = encontrado.establecimientoId;
    }
    conciliaciones.push(item);
  }
  for (const verificacion of verifs.filter((v) => v.bienId === null && v.hallazgo === 'encontrado')) {
    const item = itemBase(campania.id, verificacion.establecimientoId, 'bien', 'sobrante');
    item.verificacionId = verificacion.id;
    item.descripcion = verificacion.descripcion;
    item.codigoPatrimonial = verificacion.codigoPatrimonialLeido;
    item.ambienteEncontradoId = verificacion.ambienteId;
    item.establecimientoEncontradoId = verificacion.establecimientoId;
    conciliaciones.push(item);
  }
  const cuentas = conteos.filter((c) => c.campaniaId === campania.id);
  for (const almacen of almacenes.filter((a) => alcance.has(a.establecimientoId))) {
    const stock = stockPorAlmacen(almacen.id);
    const ids = new Set([
      ...[...stock].filter(([, cantidad]) => cantidad > 0).map(([id]) => id),
      ...cuentas.filter((c) => c.almacenId === almacen.id).map((c) => c.suministroId),
    ]);
    for (const suministroId of ids) {
      const conteo = cuentas.find((c) => c.almacenId === almacen.id && c.suministroId === suministroId);
      const resultado = !conteo ? 'pendiente' : conteo.cantidadFisica === conteo.cantidadSistema ? 'coincidente' : 'diferencia_cantidad';
      const item = itemBase(campania.id, almacen.establecimientoId, 'suministro', resultado);
      item.suministroId = suministroId;
      item.almacenId = almacen.id;
      item.descripcion = suministroById.get(suministroId).nombre;
      item.cantidadSistema = conteo ? conteo.cantidadSistema : stock.get(suministroId) ?? 0;
      item.cantidadFisica = conteo ? conteo.cantidadFisica : null;
      conciliaciones.push(item);
    }
  }
}

function regularizar(item, accion, sustento, fecha) {
  item.estadoRegularizacion = 'regularizado';
  item.accionRegularizacion = accion;
  item.sustento = sustento;
  item.fechaRegularizacion = fecha;
}

// CAM-2026-001: conciliación y regularizaciones (antes del cierre)
generarConciliacion(campanias[0]);
for (const caso of cam1Ubicacion) {
  const item = conciliaciones.find((c) => c.campaniaId === 'CAM-2026-001' && c.bienId === caso.bien.id);
  const origen = ambienteById.get(caso.origenId);
  const destino = ambienteById.get(caso.destinoId);
  const fecha = dateTime('2026-04-20');
  const sustento = 'Acta de verificación firmada por el custodio del ambiente.';
  regularizar(item, 'Actualizar ubicación del bien', sustento, fecha);
  caso.bien.ambienteId = destino.id;
  caso.bien.custodio = destino.custodio;
  caso.bien.fechaActualizacion = fecha;
  evento(caso.bien, fecha, 'regularizacion', `Regularización CAM-2026-001: ubicación actualizada de ${origen.nombre} a ${destino.nombre}. Sustento: ${sustento}`, origen.id, destino.id);
}
{
  const item = conciliaciones.find((c) => c.campaniaId === 'CAM-2026-001' && c.resultado === 'sobrante');
  const ambiente = ambienteById.get(item.ambienteEncontradoId);
  const fecha = dateTime('2026-04-21');
  const nuevo = {
    id: `BP-${pad(bienes.length + 1, 6)}`,
    codigoPatrimonial: null,
    descripcion: item.descripcion,
    categoria: 'mobiliario',
    marca: 'Sin marca',
    modelo: '',
    serie: '',
    color: 'Azul',
    establecimientoId: ambiente.establecimientoId,
    ambienteId: ambiente.id,
    custodio: ambiente.custodio,
    estadoConservacion: 'bueno',
    situacion: 'activo',
    fechaAdquisicion: null,
    valorReferencial: null,
    observaciones: 'Incorporado por regularización de sobrante (CAM-2026-001).',
    fotos: [],
    motivoBaja: null,
    fechaRegistro: fecha,
    fechaActualizacion: fecha,
  };
  bienes.push(nuevo);
  const sustento = 'Bien en uso sin registro previo; se incorpora para su codificación.';
  regularizar(item, 'Incorporar bien al registro', sustento, fecha);
  item.bienId = nuevo.id;
  evento(nuevo, fecha, 'registro', `Incorporado al registro por regularización de sobrante (CAM-2026-001) en ${ambiente.nombre}.`, null, ambiente.id);
}

// CAM-2026-002: conciliación con una diferencia de ubicación, un faltante y un ajuste regularizados
generarConciliacion(campanias[1]);
{
  const caso = cam2Ubicacion[0];
  const item = conciliaciones.find((c) => c.campaniaId === 'CAM-2026-002' && c.bienId === caso.bien.id);
  const origen = ambienteById.get(caso.origenId);
  const destino = ambienteById.get(caso.destinoId);
  const fecha = dateTime('2026-09-18');
  const sustento = 'El custodio confirma la reubicación del bien por necesidad del servicio.';
  regularizar(item, 'Actualizar ubicación del bien', sustento, fecha);
  caso.bien.ambienteId = destino.id;
  caso.bien.custodio = destino.custodio;
  caso.bien.fechaActualizacion = fecha;
  evento(caso.bien, fecha, 'regularizacion', `Regularización CAM-2026-002: ubicación actualizada de ${origen.nombre} a ${destino.nombre}. Sustento: ${sustento}`, origen.id, destino.id);
}
{
  const bien = cam2Faltantes[0];
  const item = conciliaciones.find((c) => c.campaniaId === 'CAM-2026-002' && c.bienId === bien.id);
  const fecha = dateTime('2026-09-21');
  const sustento = 'Informe del CAR N.° 045-2026 sobre la pérdida del equipo.';
  regularizar(item, 'Registrar baja por faltante', sustento, fecha);
  bien.situacion = 'baja';
  bien.motivoBaja = 'Faltante en inventario';
  bien.fechaActualizacion = fecha;
  evento(bien, fecha, 'regularizacion', `Regularización CAM-2026-002: baja por faltante en inventario. Sustento: ${sustento}`);
}
{
  const item = conciliaciones.find(
    (c) => c.campaniaId === 'CAM-2026-002' && c.resultado === 'diferencia_cantidad' && c.cantidadFisica > c.cantidadSistema && suministroById.get(c.suministroId).categoria === 'limpieza',
  );
  const delta = item.cantidadFisica - item.cantidadSistema;
  const fecha = '2026-09-22';
  const sustento = 'Acta de conteo firmada por el responsable del almacén.';
  regularizar(item, 'Ajustar stock del almacén', sustento, dateTime(fecha));
  const lote = lotes.find((l) => l.almacenId === item.almacenId && l.suministroId === item.suministroId && l.numeroLote === null);
  if (lote) lote.cantidad += delta;
  else lotes.push({ id: '', suministroId: item.suministroId, almacenId: item.almacenId, numeroLote: null, fechaVencimiento: null, cantidad: delta, fechaIngreso: fecha });
  movimientos.push({
    id: '',
    tipo: 'ajuste',
    fecha,
    almacenOrigenId: null,
    almacenDestinoId: item.almacenId,
    documento: 'Regularización CAM-2026-002',
    motivo: 'Diferencia de cantidad en inventario',
    items: [{ suministroId: item.suministroId, cantidad: delta, numeroLote: null, fechaVencimiento: null }],
    observaciones: sustento,
    fechaRegistro: dateTime(fecha),
  });
}

// Eventos de verificación de las unidades finalizadas
const ETIQUETA_HALLAZGO = { encontrado: 'encontrado', no_encontrado: 'no encontrado' };
const finalizadas = new Set(unidades.filter((u) => u.tipo === 'ambiente').map((u) => `${u.campaniaId}|${u.unidadId}`));
for (const verificacion of verificaciones) {
  if (!verificacion.bienId) continue;
  if (!finalizadas.has(`${verificacion.campaniaId}|${verificacion.ambienteId}`)) continue;
  const bien = bienes.find((b) => b.id === verificacion.bienId);
  const ambiente = ambienteById.get(verificacion.ambienteId);
  const diferencia = conciliaciones.find(
    (c) =>
      c.campaniaId === verificacion.campaniaId &&
      c.bienId === bien.id &&
      c.resultado === 'diferencia_ubicacion' &&
      c.ambienteEncontradoId === verificacion.ambienteId,
  );
  const registradoEn = diferencia ? ambienteById.get(diferencia.ambienteRegistradoId) : null;
  const otroCar =
    registradoEn && registradoEn.establecimientoId !== ambiente.establecimientoId
      ? ` – ${establecimientos.find((e) => e.id === registradoEn.establecimientoId).nombre}`
      : '';
  const detalle =
    verificacion.hallazgo === 'encontrado' && registradoEn ? ` (registrado en ${registradoEn.nombre}${otroCar})` : '';
  evento(
    bien,
    verificacion.fecha,
    'verificacion',
    `Verificado en ${verificacion.campaniaId} – ${ambiente.nombre}: ${ETIQUETA_HALLAZGO[verificacion.hallazgo]}${detalle}, estado ${ETIQUETA_ESTADO[verificacion.estadoConservacion]}.`,
  );
}

// ---------------------------------------------------------------------------
// Identificadores finales y escritura
// ---------------------------------------------------------------------------
assignIds(lotes, 'LOT', 5, 'fechaIngreso');
assignIds(movimientos, 'MOV', 6, 'fechaRegistro');
assignIds(eventos, 'HIS', 6, 'fecha');

const salida = {
  'establecimientos.json': establecimientos,
  'ambientes.json': ambientes,
  'almacenes.json': almacenes,
  'bienes.json': bienes,
  'historial-bienes.json': eventos,
  'suministros.json': suministros,
  'lotes.json': lotes,
  'movimientos.json': movimientos,
  'campanias.json': campanias,
  'verificaciones-bienes.json': verificaciones,
  'conteos-suministros.json': conteos,
  'unidades-verificadas.json': unidades,
  'conciliaciones.json': conciliaciones,
};

mkdirSync(OUT_DIR, { recursive: true });
for (const [archivo, datos] of Object.entries(salida)) {
  writeFileSync(resolve(OUT_DIR, archivo), `${JSON.stringify(datos, null, 2)}\n`, 'utf8');
  console.log(`${archivo.padEnd(28)} ${datos.length} registros`);
}
