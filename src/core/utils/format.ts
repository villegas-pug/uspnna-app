// Formatos de presentación en español del Perú. Las fechas YYYY-MM-DD se interpretan en hora
// local para evitar el desfase de un día que produce `new Date('YYYY-MM-DD')` (UTC) en Lima.
import type { IsoDate, IsoDateTime } from 'src/core/types/common';

const numberFormat = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 });
const currencyFormat = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
});

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Convierte YYYY-MM-DD en Date local; devuelve null si el texto no es una fecha válida. */
export function parseIsoDate(value: IsoDate | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toIsoDate(date: Date): IsoDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayIso(): IsoDate {
  return toIsoDate(new Date());
}

export function nowIso(): IsoDateTime {
  return new Date().toISOString();
}

/** Días desde hoy hasta la fecha (negativo si ya pasó). */
export function daysFromToday(value: IsoDate): number | null {
  const date = parseIsoDate(value);
  if (!date) return null;
  const today = parseIsoDate(todayIso());
  if (!today) return null;
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

/** 2026-10-17 → 17/10/2026 */
export function formatDate(value: IsoDate | null | undefined): string {
  const date = parseIsoDate(value ?? null);
  return date ? `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}` : '';
}

/** ISO 8601 → 17/10/2026 15:30 */
export function formatDateTime(value: IsoDateTime | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 17/10/2026 → 2026-10-17; null si el texto no es una fecha válida. */
export function parseDisplayDate(value: string): IsoDate | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const date = parseIsoDate(iso);
  return date && toIsoDate(date) === iso ? iso : null;
}

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatCurrency(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : currencyFormat.format(value);
}

export function formatPercent(value: number): string {
  return `${Math.round(value)} %`;
}

/** "kg" → "12 kg"; respeta singular para unidades contables. */
export function formatQuantity(value: number, unit: string): string {
  return `${formatNumber(value)} ${unit}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${formatNumber(bytes / 1024)} KB`;
  return `${formatNumber(bytes / (1024 * 1024))} MB`;
}

/** Texto de un valor primitivo para mostrar o validar; objetos y vacíos → ''. */
export function toText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

/** Normaliza texto para búsquedas sin tildes ni mayúsculas. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Coincidencia de búsqueda en varios campos, sin tildes. */
export function matchesSearch(term: string, ...fields: (string | number | null | undefined)[]): boolean {
  const needle = normalizeText(term);
  if (!needle) return true;
  return fields.some((field) => field !== null && field !== undefined && normalizeText(String(field)).includes(needle));
}
