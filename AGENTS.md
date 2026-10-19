# AGENTS.md — SIGI USPNNA (prototipo)

Prototipo web sin backend del Sistema Integral de Gestión de Inventarios de la USPNNA – INABIF. Vue 3 + TypeScript estricto + Quasar 2 (Vite) + Vue Router. Datos en JSON (`src/mocks`) persistidos en `localStorage`. Idioma: español para comentarios, mensajes de UI, documentación y commits; inglés técnico para código, rutas y comandos.

## Fuentes de verdad (léelas, no las dupliques)

- Reglas de negocio, modelo de datos y rutas: `docs/especificacion.md` (SDD). Si un cambio altera una regla (`RN-*`), actualiza primero la especificación.
- Diseño visual: sistema de diseño "Inventarios USPNNA" (https://claude.ai/artifact/B3ofMKswCd4ALCykStTw4F). Tokens en `src/css/app.scss`, brand en `src/css/quasar.variables.scss`.
- Comandos y módulos: `README.md`.

## Comandos

```bash
npm run typecheck   # vue-tsc --noEmit
npm run lint        # eslint
npm run mocks       # regenera los JSON de forma determinista (no editar src/mocks a mano)
npm run dev | build # solo con autorización explícita
```

## Reglas de trabajo

- No ejecutes `dev`, `build`, servidores ni pruebas sin autorización explícita; `lint` y `typecheck` sí.
- No hagas `commit`, `push`, tags ni PR sin autorización explícita.
- Cambios mínimos y reutilizando lo existente (KISS, DRY, YAGNI). Preserva rutas, contratos y mocks que ya funcionan.
- Señala riesgos de seguridad, acoplamiento o deuda técnica al detectarlos.

## Arquitectura

```
src/core/         infraestructura sin dominio (storage, data/collection, utils)
src/components/   sistema de diseño compartido (+ layout/, charts/)
src/composables/  useConfirm, useNotify, useAsyncTask, usePageLoader, useStatusTone
src/layouts/      MainLayout y menu.ts (árbol del menú)
src/modules/<m>/  types.ts · services/ · components/ · pages/ · routes.ts
src/mocks/        JSON iniciales
```

- Dependencias: `pages → components/services/composables`; `services → core/data`; entre módulos solo en sentido de dominio (conciliación consume campañas, bienes y suministros).
- Las vistas leen con selectores reactivos de los servicios; toda modificación pasa por comandos asíncronos del servicio, que validan las reglas de negocio. Nunca escribas en una `Collection` desde una página.
- Importa con el alias `src/…`. Entidades y operaciones de negocio en español; infraestructura en inglés.
- Estilo: Prettier (`singleQuote`, `printWidth: 100`, `trailingComma: all`), `<script setup lang="ts">`, Composition API, tipado explícito.

## Reglas críticas del dominio

- Bien patrimonial (registro individual) ≠ suministro (por cantidad y lotes). El ID interno (`BP-000001`) es generado y de solo lectura; el código patrimonial oficial es opcional (12 dígitos, único).
- La ubicación de un bien solo cambia con "Transferir bien" (motivo + historial). La baja no elimina: exige motivo, sustento y confirmación.
- Salidas y transferencias descuentan por FEFO; los movimientos no se editan ni eliminan.
- La conciliación nunca actualiza el registro maestro sin diálogo con el cambio exacto, sustento y casilla de confirmación. Solo se verifica con la campaña "En curso".
- Todo alta, edición, transferencia, baja o regularización registra un evento en el historial.

## UI y responsive

- Usa los componentes de `src/components` (PageContainer, DataTable/FilterBar, AppDialog, ConfirmDialog, StatusChip, ActionMenu, FormField, FloatingActions…); no estilices Quasar ad hoc.
- Colores solo con variables CSS (`var(--…)`), nunca hex en componentes. Estados con icono + texto + color (`useStatusTone`).
- Menú: cada nodo y cada submenú declara su `icon` (Material Icons) en `src/layouts/menu.ts`; las rutas fijan `meta.menuKey` y `meta.breadcrumb`.
- Responsive: tablas en modo tarjeta <600 px conservando acciones, diálogos con scroll interno y acciones visibles, formularios de 1 columna en móvil, área táctil ≥44 px. Prohibido `overflow-x: hidden` global; corrige la causa del desbordamiento.
- Accesibilidad: foco visible (`--focus-ring`), `aria-label` en botones de icono, contraste AA.
- El logo oficial `LOGO_INABIF_2020.png` va en `public/img/`; mientras falte se usa el marcador. No dibujes la marca.

## Antes de terminar

1. `npm run lint` y `npm run typecheck` sin errores.
2. Si tocaste UI: revisa 320, 375, 768, 1024 y 1366 px (con servidor solo si fue autorizado).
3. Informa qué verificaste y qué no.
