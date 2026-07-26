import type { ActionStatus, RiskLevel } from '@prisma/client';

export const actionStatuses = new Set<ActionStatus>([
  'DRAFT', 'PENDING_APPROVAL', 'NOT_STARTED', 'IN_PROGRESS', 'WAITING_EVIDENCE',
  'WAITING_VALIDATION', 'COMPLETED', 'PARTIAL', 'REJECTED', 'CANCELLED', 'OVERDUE', 'EFFECTIVENESS_VERIFIED',
]);

export const residualLevels = new Set<RiskLevel>(['VERY_LOW', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL']);
export const evidenceReviewStatuses = new Set(['PENDING', 'APPROVED', 'REJECTED']);

export function optionalMoney(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const normalized = raw.includes(',') ? raw.replaceAll('.', '').replace(',', '.') : raw;
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error('Valor monetário inválido.');
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0 || amount > 999999999999.99) throw new Error('Valor monetário fora do limite.');
  return amount.toFixed(2);
}

export function progressValue(value: FormDataEntryValue | null, fallback = 0): number {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  const progress = Number(raw);
  if (!Number.isInteger(progress) || progress < 0 || progress > 100) throw new Error('Progresso deve estar entre 0 e 100.');
  return progress;
}
