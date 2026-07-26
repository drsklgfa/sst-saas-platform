import { randomBytes } from 'node:crypto';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type CampaignAvailability = 'DRAFT' | 'SCHEDULED' | 'OPEN' | 'PAUSED' | 'CLOSED' | 'ARCHIVED' | 'CANCELLED';

export function generateParticipationCode(length = 10): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

export function normalizeParticipationCode(value: unknown): string {
  return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function campaignAvailability(input: {
  status: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
  now?: Date;
}): CampaignAvailability {
  const now = input.now ?? new Date();
  if (input.status === 'DRAFT') return 'DRAFT';
  if (input.status === 'PAUSED') return 'PAUSED';
  if (input.status === 'ARCHIVED') return 'ARCHIVED';
  if (input.status === 'CANCELLED') return 'CANCELLED';
  if (input.status === 'CLOSED') return 'CLOSED';
  if (input.startsAt && input.startsAt > now) return 'SCHEDULED';
  if (input.endsAt && input.endsAt <= now) return 'CLOSED';
  if (['ACTIVE', 'REOPENED', 'SCHEDULED'].includes(input.status)) return 'OPEN';
  return 'CLOSED';
}

export function parseOptionalIsoDate(value: unknown): Date | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error('Data ou horário inválido');
  return date;
}

export function campaignStatusForCreation(input: { requested: string; startsAt: Date | null; now?: Date }): 'DRAFT' | 'SCHEDULED' | 'ACTIVE' {
  if (input.requested === 'DRAFT') return 'DRAFT';
  const now = input.now ?? new Date();
  if (input.startsAt && input.startsAt > now) return 'SCHEDULED';
  return 'ACTIVE';
}
