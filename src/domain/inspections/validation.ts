import type { InspectionEvidenceKind, InspectionStatus, RiskLevel } from '@prisma/client';
import { calculateRisk } from '@/domain/engines/risk-matrix';

export const inspectionStatuses = new Set<InspectionStatus>(['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED']);
export const evidenceKinds = new Set<InspectionEvidenceKind>(['PHOTO', 'DOCUMENT', 'MEASUREMENT', 'OTHER']);

export function requiredText(value: FormDataEntryValue | null, label: string, max = 500): string {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${label} é obrigatório.`);
  if (text.length > max) throw new Error(`${label} excede ${max} caracteres.`);
  return text;
}

export function optionalText(value: FormDataEntryValue | null, max = 4000): string | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (text.length > max) throw new Error(`Texto excede ${max} caracteres.`);
  return text;
}

export function boundedInteger(value: FormDataEntryValue | null, label: string, min: number, max: number, fallback?: number): number {
  const raw = String(value ?? '').trim();
  if (!raw && fallback !== undefined) return fallback;
  const number = Number(raw);
  if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${label} deve estar entre ${min} e ${max}.`);
  return number;
}

export function optionalDate(value: FormDataEntryValue | null): Date | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const date = new Date(`${raw}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error('Data inválida.');
  return date;
}

export function stringList(value: FormDataEntryValue | null, maxItems = 50): string[] {
  const values = String(value ?? '').split(/[\n;,]+/).map((item) => item.trim()).filter(Boolean);
  if (values.length > maxItems) throw new Error(`Limite de ${maxItems} itens excedido.`);
  return [...new Set(values)];
}

export function parseRiskAssessment(form: FormData) {
  const severity = boundedInteger(form.get('severity'), 'Severidade', 1, 5);
  const probability = boundedInteger(form.get('probability'), 'Probabilidade', 1, 5);
  const exposure = boundedInteger(form.get('exposure'), 'Exposição', 1, 5, 1);
  const initial = calculateRisk(severity, probability, exposure);

  const residualSeverityRaw = String(form.get('residualSeverity') ?? '').trim();
  const residualProbabilityRaw = String(form.get('residualProbability') ?? '').trim();
  const residualExposureRaw = String(form.get('residualExposure') ?? '').trim();
  const hasResidual = Boolean(residualSeverityRaw || residualProbabilityRaw || residualExposureRaw);
  const residual = hasResidual
    ? calculateRisk(
        boundedInteger(form.get('residualSeverity'), 'Severidade residual', 1, 5),
        boundedInteger(form.get('residualProbability'), 'Probabilidade residual', 1, 5),
        boundedInteger(form.get('residualExposure'), 'Exposição residual', 1, 5, 1),
      )
    : null;

  const controlRaw = String(form.get('controlEffectiveness') ?? '').trim();
  const controlEffectiveness = controlRaw ? boundedInteger(form.get('controlEffectiveness'), 'Eficácia do controle', 0, 100) : null;

  return {
    severity,
    probability,
    exposure,
    initial,
    residual,
    controlEffectiveness,
  };
}

export function riskLevelTone(level: RiskLevel): 'neutral' | 'success' | 'warning' | 'danger' {
  if (level === 'VERY_LOW' || level === 'LOW') return 'success';
  if (level === 'MODERATE') return 'warning';
  if (level === 'HIGH' || level === 'CRITICAL') return 'danger';
  return 'neutral';
}
