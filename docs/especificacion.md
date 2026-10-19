# Especificación funcional y técnica — Prototipo SIGI USPNNA

Sistema Integral de Gestión de Inventarios de la Unidad de Servicios de Protección de Niñas, Niños y Adolescentes (USPNNA) del INABIF.

> Documento SDD: describe qué se construye y bajo qué reglas antes de implementarlo. Toda decisión de código debe poder trazarse a una sección de este documento.

## 1. Objetivo

Validar con las áreas usuarias el flujo completo de inventario de los Centros de Acogida Residencial (CAR) mediante un prototipo navegable: registro de establecimientos, bienes patrimoniales y suministros, campañas de verificación física y conciliación de resultados.

**Modelo operativo:** centralizado. Un equipo de la USPNNA recorre los CAR para hacer el levantamiento inicial; no hay usuarios por CAR.

## 2. Alcance

### Incluido

| Módulo | Funcionalidad |
|---|---|
| Inicio (dashboard) | KPI y gráficos responsivos: bienes por estado y por CAR, avance del levantamiento, alertas de stock y resultados de conciliación |
| Establecimientos | CRUD de CAR, ambientes y almacenes; ficha del CAR con sus ambientes y almacenes |
| Bienes patrimoniales | CRUD con ID interno generado y código patrimonial opcional, fotos, transferencia entre ambientes/CAR, baja con confirmación, historial |
| Almacenes y suministros | Catálogo, stock por almacén, mínimos, ingresos, salidas, transferencias, lotes y vencimientos |
| Campañas de inventario | Planificación, inicio, verificación física por CAR y ambiente (bienes) y por almacén (conteo de suministros) |
| Conciliación | Coincidentes, faltantes, sobrantes, diferencias de ubicación y de cantidad; regularización solo con confirmación explícita; cierre de campaña |
| Reportes | Cinco reportes con filtros, vista previa y exportación CSV |
| Datos del prototipo | Uso de almacenamiento y restauración de los datos iniciales |

### Fuera de alcance

Backend, autenticación, roles y permisos, integración con SIGA MEF, modo offline/PWA, impresión PDF, auditoría por usuario (todas las acciones se registran como "Equipo de inventario USPNNA").

## 3. Stack y restricciones técnicas

- Vue 3 + TypeScript estricto (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, impuestos por Quasar CLI) + Quasar 2 (CLI con Vite) + Vue Router 4 en modo hash.
- Composition API con `<script setup lang="ts">` en todos los componentes.
- Sin Pinia: el estado vive en colecciones reactivas (`shallowRef`) sincronizadas con `localStorage` (KISS).
- Sin librerías de gráficos: barras horizontales de un solo tono en HTML/CSS con valores rotulados y la identidad en texto o StatusChip. Los colores de estado del sistema no superan la validación de daltonismo como paleta categórica (rojo↔ámbar ΔE 1.3 en deuteranopía), por eso no se usan donuts ni barras apiladas por color.
- Datos mock en `src/mocks/*.json`, generados de forma determinista por `scripts/generar-mocks.mjs`. Sin datos personales reales: custodios y responsables con forma "Custodio 03 – Área de cocina"; nombres de CAR y direcciones ficticios.
- Servicios CRUD asíncronos con latencia simulada (150–350 ms) para ejercitar estados de carga.

## 4. Arquitectura

```
src/
  core/            # infraestructura sin dominio
    storage/       # acceso seguro a localStorage (try/catch, cuota)
    data/          # colecciones reactivas, registro de colecciones, transacciones
    utils/         # fechas, números, IDs, CSV, imágenes, latencia
    types/         # tipos comunes
  components/      # componentes compartidos del sistema de diseño
    layout/        # AppHeader, AppDrawer, AppFooter, AppLogo
    charts/        # BarChart, DonutChart, ChartCard
  composables/     # useStatusTone, useConfirm, useNotify, useAsyncTask
  layouts/         # MainLayout + árbol de menú
  modules/<módulo>/
    types.ts       # modelo del módulo
    services/      # reglas de negocio + acceso a colecciones
    components/    # diálogos y piezas propias
    pages/         # vistas enrutadas
    routes.ts      # rutas del módulo
  mocks/           # JSON iniciales
  router/          # composición de rutas
  css/             # quasar.variables.scss (brand) y app.scss (tokens + overrides)
```

Dependencias permitidas: `pages → components/services/composables`, `services → core/data`, `modules/x → modules/y/types|services` solo en sentido de dominio (conciliación consume campañas, bienes y suministros). `core` no depende de módulos salvo el registro de colecciones (`core/data/db.ts`).

## 5. Modelo de datos

Prefijos de ID interno (correlativo con ceros): `CAR-01`, `AMB-0001`, `ALM-001`, `BP-000001`, `HIS-000001`, `SUM-0001`, `LOT-00001`, `MOV-000001`, `CAM-2026-001`, `VER-000001`, `CNT-000001`, `UNV-00001`, `CON-000001`.

| Entidad | Campos clave |
|---|---|
| Establecimiento (CAR) | id, nombre, tipoPoblacion, capacidad, departamento, provincia, distrito, direccion, responsable, estado, estadoLevantamiento (pendiente · en_curso · completado), fechaLevantamiento |
| Ambiente | id, establecimientoId, nombre, tipo, piso, custodio, estado |
| Almacén | id, establecimientoId, nombre, tipo, responsable, estado |
| BienPatrimonial | id (ID interno), codigoPatrimonial (12 dígitos o `null`), descripcion, categoria, marca, modelo, serie, color, establecimientoId, ambienteId, custodio, estadoConservacion (bueno · regular · malo · sin_evaluar), situacion (activo · baja), fechaAdquisicion, valorReferencial, observaciones, fotos[], motivoBaja, fechaRegistro, fechaActualizacion |
| EventoBien (historial) | id, bienId, fecha, tipo (registro · actualizacion · transferencia · baja · verificacion · regularizacion), descripcion, ambienteOrigenId, ambienteDestinoId, responsable |
| Suministro (catálogo) | id, nombre, categoria, unidad, stockMinimo, controlaVencimiento, descripcion, estado |
| Lote | id, suministroId, almacenId, numeroLote, fechaVencimiento, cantidad, fechaIngreso |
| Movimiento | id, tipo (ingreso · salida · transferencia · ajuste), fecha, almacenOrigenId, almacenDestinoId, documento, motivo, items[{suministroId, cantidad, numeroLote, fechaVencimiento}], observaciones, fechaRegistro |
| Campaña | id, nombre, tipo (inicial · anual · extraordinaria), descripcion, establecimientoIds[], fechaInicio, fechaFin, responsable, estado (planificada · en_curso · en_conciliacion · cerrada), fechaConciliacion, fechaCierre |
| VerificacionBien | id, campaniaId, establecimientoId, ambienteId (donde se verificó), bienId (`null` = sobrante), hallazgo (encontrado · no_encontrado), estadoConservacion, descripcion, codigoPatrimonialLeido, observaciones, fecha |
| ConteoSuministro | id, campaniaId, establecimientoId, almacenId, suministroId, cantidadSistema (al contar), cantidadFisica, observaciones, fecha |
| UnidadVerificada | id, campaniaId, establecimientoId, tipo (ambiente · almacen), unidadId, fecha |
| ItemConciliacion | id, campaniaId, establecimientoId, tipoRegistro (bien · suministro), resultado, bienId, verificacionId, suministroId, almacenId, descripcion, ambienteRegistradoId, ambienteEncontradoId, establecimientoEncontradoId, cantidadSistema, cantidadFisica, estadoRegularizacion (pendiente · regularizado · no_aplica), accionRegularizacion, sustento, fechaRegularizacion |

Persistencia: una clave de `localStorage` por colección con prefijo versionado `uspnna-inventarios:v1:`. Si la clave no existe o está corrupta se usa el JSON inicial. Si `localStorage` no está disponible, la app funciona en memoria y lo advierte en "Datos del prototipo".

## 6. Reglas de negocio

### Establecimientos
- RN-E1. Un ambiente solo se elimina si no tiene bienes activos; un almacén, si no tiene stock. Si no se puede, se explica el motivo.
- RN-E2. Un CAR solo se desactiva (no se elimina) para conservar la trazabilidad.

### Bienes patrimoniales
- RN-B1. El ID interno (`BP-000001`) se genera al guardar y es de solo lectura.
- RN-B2. El código patrimonial es opcional; si se ingresa, debe tener 12 dígitos y ser único. Sin código se muestra el chip neutro "Sin código patrimonial".
- RN-B3. La ubicación (CAR y ambiente) no se edita en el formulario: se cambia con "Transferir bien", que exige motivo y registra el evento en el historial.
- RN-B4. La baja exige motivo, sustento y confirmación explícita; el bien queda en situación "Baja", no se elimina.
- RN-B5. Fotos: hasta 4 por bien, solo imágenes, comprimidas en el navegador a 1024 px y JPEG 0.7. Si se supera la cuota de almacenamiento se informa sin perder el resto del registro.
- RN-B6. Todo alta, edición, transferencia, baja o regularización crea un evento en el historial.

### Almacenes y suministros
- RN-S1. Stock de un suministro en un almacén = suma de sus lotes. Estado: Agotado (0), Bajo mínimo (≤ stock mínimo), Normal.
- RN-S2. Vencimiento por lote: Vencido (fecha < hoy), Por vencer (≤ 30 días), Vigente, Sin vencimiento.
- RN-S3. Ingreso: crea o incrementa lotes en el almacén destino. Si el suministro controla vencimiento, lote y fecha de vencimiento son obligatorios.
- RN-S4. Salida y transferencia: descuentan por FEFO (primero el lote que vence antes) y solo de lotes vigentes; una salida con motivo "Vencimiento" descuenta solo lotes vencidos. Si el stock es insuficiente se rechaza con el mensaje "El stock disponible (4) es menor que la cantidad de salida (6). Reduzca la cantidad o registre un ingreso."
- RN-S5. La transferencia conserva número de lote y vencimiento en el destino; origen y destino deben ser distintos.
- RN-S6. Los movimientos no se editan ni eliminan; las correcciones se hacen con un nuevo movimiento (trazabilidad).

### Campañas
- RN-C1. Flujo: Planificada → En curso → En conciliación → Cerrada. Solo se edita o elimina en "Planificada".
- RN-C2. Iniciar una campaña de tipo inicial pasa a "En curso" el levantamiento de sus CAR pendientes; cerrarla los marca "Completado".
- RN-C3. Solo se verifica con la campaña "En curso". En cualquier otro estado las vistas son de solo lectura y lo indican.
- RN-C4. Verificación de ambiente: cada bien esperado (activo y registrado en el ambiente) se marca Encontrado (con estado de conservación) o No encontrado. Se pueden agregar bienes encontrados no esperados: registrados en otro ambiente (diferencia de ubicación) o sin registro (sobrante).
- RN-C5. "Guardar avance" guarda las marcas; "Finalizar verificación" exige todos los bienes marcados y registra la unidad como verificada. Lo mismo para el conteo de almacén.
- RN-C6. Pasar a conciliación exige confirmación y advierte cuántas unidades siguen sin verificar.

### Conciliación
- RN-K1. Al pasar a conciliación se genera una foto fija de resultados:
  - Bien encontrado en su ambiente registrado → **Coincidente**.
  - Bien encontrado en otro ambiente o CAR → **Diferencia de ubicación**.
  - Bien marcado No encontrado y no hallado en otra unidad → **Faltante**.
  - Bien sin registro encontrado → **Sobrante**.
  - Suministro con cantidad física ≠ cantidad del sistema → **Diferencia de cantidad**; igual → Coincidente.
  - Bien o suministro del alcance sin marca/conteo → **Pendiente de verificar**.
- RN-K2. Regularización (solo en "En conciliación"), siempre con diálogo que muestra el cambio, sustento obligatorio y casilla "Entiendo que esta acción actualizará el registro maestro":
  - Diferencia de ubicación → actualiza CAR y ambiente del bien.
  - Faltante → baja del bien por faltante.
  - Sobrante → incorpora un bien nuevo con ID interno.
  - Diferencia de cantidad → movimiento de ajuste por la diferencia (FEFO si es negativo).
  - Coincidente y pendiente no se regularizan.
- RN-K3. Cerrar la campaña exige confirmación explícita; si quedan regularizaciones pendientes se listan y quedan registradas como observaciones.

## 7. Rutas

| Ruta | Vista |
|---|---|
| `/inicio` | Dashboard |
| `/establecimientos`, `/establecimientos/:id` | Listado y ficha de CAR |
| `/establecimientos/ambientes`, `/establecimientos/almacenes` | Ambientes y almacenes |
| `/bienes`, `/bienes/nuevo`, `/bienes/:id`, `/bienes/:id/editar`, `/bienes/historial` | Bienes patrimoniales |
| `/suministros/stock`, `/suministros/catalogo`, `/suministros/ingresos`, `/suministros/salidas`, `/suministros/transferencias`, `/suministros/lotes` | Almacenes y suministros |
| `/campanias`, `/campanias/verificacion`, `/campanias/:id`, `/campanias/:id/ambientes/:ambienteId`, `/campanias/:id/almacenes/:almacenId` | Campañas y verificación |
| `/conciliacion`, `/conciliacion/:campaniaId` | Conciliación |
| `/reportes` | Reportes |
| `/prototipo` | Datos del prototipo |

Cada ruta declara en `meta` el título, las migas de pan y la clave del ítem de menú activo.

## 8. Interfaz (sistema de diseño "Inventarios USPNNA")

- Brand de Quasar en `quasar.variables.scss`; tokens como variables CSS en `app.scss`; overrides sobre clases Quasar (`.q-header`, `.q-drawer__content`, `.q-table th`, `.q-field--focused`), sin selectores globales de elementos.
- QLayout `lHh Lpr lFf`; header de 60 px con borde coral de 5 px; QDrawer `show-if-above bordered` de 300 px (overlay < 1024 px, se cierra al navegar); footer institucional con `safe-area`.
- Página: QPage `q-pa-md` → migas de pan → título en mayúsculas → acciones a la derecha → tarjeta con filtros y tabla. Máximo 1600 px.
- Tablas: escritorio completo; tablet oculta columnas secundarias (`gt-sm`); < 600 px modo `grid` de QTable con tarjetas que conservan el botón de acciones.
- Diálogos `sm/md/lg/xl` con cuerpo con scroll interno y acciones siempre visibles; ficha a pantalla completa < 600 px.
- Formularios largos y verificaciones: acciones como FloatingActions < 1024 px.
- Estados con icono + texto + color mediante `StatusChip` y el mapa central `useStatusTone`.
- Foco rojo de 2 px con separación de 2 px; botones en mayúsculas a 13 px; área táctil de 44 px en móvil.
- Sin scroll horizontal de página ni `overflow-x: hidden` global.
- Logo: `public/img/LOGO_INABIF_2020.png` (archivo oficial provisto por el INABIF, no incluido). Si falta, se muestra un marcador punteado.

## 9. Criterios de aceptación

1. Las 9 áreas de la sección 2 son navegables desde el menú y muestran migas de pan (excepto Inicio).
2. Crear, editar, transferir y dar de baja un bien persiste tras recargar y deja eventos en el historial.
3. Un bien sin código patrimonial muestra el chip "Sin código patrimonial" en listado, ficha y reportes.
4. Una salida mayor al stock se rechaza con el mensaje de RN-S4; una salida válida descuenta por FEFO.
5. Una campaña recorre Planificada → En curso → En conciliación → Cerrada; la conciliación muestra los seis resultados posibles con los datos iniciales.
6. Ninguna regularización se aplica sin marcar la casilla de confirmación y escribir el sustento.
7. Cada reporte exporta un CSV UTF-8 (con BOM) que abre con tildes correctas en Excel.
8. "Restaurar datos iniciales" pide confirmación y devuelve todas las colecciones al JSON inicial.
9. A 320 px de ancho no hay scroll horizontal de página; las tablas pasan a tarjetas con acciones visibles y los diálogos hacen scroll interno.

## 10. Riesgos y deuda técnica

| Riesgo | Mitigación |
|---|---|
| Cuota de `localStorage` (~5 MB) con fotos | Compresión, máximo 4 fotos, error de cuota controlado, uso visible en "Datos del prototipo" |
| Operaciones que tocan varias colecciones | `runTransaction` restaura las colecciones si una escritura falla |
| Fechas de vencimiento fijas en los mocks | Referidas a octubre de 2026; con el tiempo cambian de estado. Se regeneran con el script |
| Lógica de dominio en el cliente | Servicios aislados por módulo para migrarlos a una API sin tocar las vistas |
| Sin pruebas automatizadas | Fuera del alcance del prototipo; los servicios son funciones puras sobre colecciones, aptas para Vitest |
