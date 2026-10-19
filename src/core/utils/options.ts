// Conversión de catálogos de etiquetas en opciones de QSelect y reglas de validación reutilizables
import type { SelectOption } from 'src/core/types/common';
import { toText } from 'src/core/utils/format';

export function optionsFrom<K extends string>(labels: Record<K, string>): SelectOption<K>[] {
  return (Object.keys(labels) as K[]).map((value) => ({ label: labels[value], value }));
}

export function optionsFromList(values: readonly string[]): SelectOption[] {
  return values.map((value) => ({ label: value, value }));
}

type Rule = (value: unknown) => true | string;

/** Reglas de QInput/QSelect: el mensaje dice qué corregir. */
export const rules = {
  required(message: string): Rule {
    return (value) => {
      if (Array.isArray(value)) return value.length > 0 || message;
      return (value !== null && value !== undefined && toText(value).trim() !== '') || message;
    };
  },
  minLength(min: number, message: string): Rule {
    return (value) => !value || toText(value).trim().length >= min || message;
  },
  pattern(regex: RegExp, message: string): Rule {
    return (value) => !value || regex.test(toText(value).trim()) || message;
  },
  positiveInteger(message: string): Rule {
    return (value) => value === null || value === '' || value === undefined || (Number.isInteger(Number(value)) && Number(value) > 0) || message;
  },
  nonNegativeNumber(message: string): Rule {
    return (value) => value === null || value === '' || value === undefined || (Number.isFinite(Number(value)) && Number(value) >= 0) || message;
  },
};
