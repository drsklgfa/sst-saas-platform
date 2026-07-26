export function requiredText(value: FormDataEntryValue | null, label: string, maxLength = 200): string {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${label} é obrigatório`);
  if (text.length > maxLength) throw new Error(`${label} deve ter no máximo ${maxLength} caracteres`);
  return text;
}

export function optionalText(value: FormDataEntryValue | null, maxLength = 1000): string | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (text.length > maxLength) throw new Error(`Texto deve ter no máximo ${maxLength} caracteres`);
  return text;
}

export function nonNegativeInteger(value: FormDataEntryValue | null, fallback = 0): number {
  const text = String(value ?? '').trim();
  if (!text) return fallback;
  const number = Number(text);
  if (!Number.isInteger(number) || number < 0 || number > 1_000_000) throw new Error('Quantidade inválida');
  return number;
}

export function optionalDate(value: FormDataEntryValue | null): Date | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const date = new Date(`${text}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error('Data inválida');
  return date;
}

export function optionalMoney(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const normalized = raw.replace(/\./g, '').replace(',', '.');
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(normalized)) throw new Error('Valor inválido');
  return Number(normalized).toFixed(2);
}

export function digits(value: FormDataEntryValue | null, maxLength = 20): string | null {
  const normalized = String(value ?? '').replace(/\D/g, '');
  if (!normalized) return null;
  if (normalized.length > maxLength) throw new Error('Número inválido');
  return normalized;
}

export function upperState(value: FormDataEntryValue | null): string | null {
  const state = String(value ?? '').trim().toUpperCase();
  if (!state) return null;
  if (!/^[A-Z]{2}$/.test(state)) throw new Error('UF inválida');
  return state;
}

export function csvItems(value: FormDataEntryValue | null): string[] {
  return String(value ?? '')
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 100);
}
