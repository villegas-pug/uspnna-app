# Sistema Integral de Gestión de Inventarios – USPNNA (prototipo)

Prototipo navegable sin backend: Vue 3 + TypeScript estricto + Quasar 2 (CLI con Vite) + Vue Router. Los datos son mocks JSON (`src/mocks`) y se guardan en `localStorage`. La especificación SDD está en [docs/especificacion.md](docs/especificacion.md).

## Instalación

Requisitos: Node.js 20 o superior.

```bash
npm install
```

```bash
npm run dev
```

Otros comandos: `npm run build`, `npm run typecheck`, `npm run lint`, `npm run mocks` (regenera los JSON de forma determinista).

## Logo

Copie el archivo oficial `LOGO_INABIF_2020.png` en `public/img/`. Mientras falte, el header muestra un marcador.

## Datos del prototipo

En el menú "Datos del prototipo" se ve el uso de almacenamiento y se pueden restaurar los datos iniciales.

## Módulos

| Módulo | Ruta | Contenido |
|---|---|---|
| Inicio | `/inicio` | Indicadores y gráficos |
| Establecimientos | `/establecimientos` | CAR, ambientes y almacenes |
| Bienes patrimoniales | `/bienes` | Registro con ID interno y código patrimonial opcional, fotos, transferencia, baja e historial |
| Almacenes y suministros | `/suministros/stock` | Stock, catálogo, ingresos, salidas, transferencias, lotes y vencimientos |
| Campañas | `/campanias` | Planificación, verificación por ambiente y conteo por almacén |
| Conciliación | `/conciliacion` | Resultados, regularización con confirmación explícita y cierre |
| Reportes | `/reportes` | 5 reportes con filtros, vista previa y CSV |

## Convenciones

- Entidades, campos y operaciones de negocio en español (lenguaje del dominio); infraestructura y componentes técnicos en inglés.
- Las vistas leen datos con selectores reactivos de cada servicio; las modificaciones pasan por comandos asíncronos que validan las reglas de negocio de la especificación.

## Estructura

- `src/core`: almacenamiento, colecciones reactivas, utilidades.
- `src/components`: componentes del sistema de diseño "Inventarios USPNNA".
- `src/modules/*`: dashboard, establecimientos, bienes, suministros, campañas, conciliación, reportes y prototipo (tipos, servicios, componentes, páginas y rutas).
