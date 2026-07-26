import type { ConversationStatus } from '@prisma/client';

export const conversationCategories = [
  'Campanha',
  'Relatório ou laudo',
  'Plano de ação',
  'Dúvida técnica',
  'Problema de acesso',
  'Financeiro',
  'Outro',
] as const;

export const conversationPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export type ConversationPriority = (typeof conversationPriorities)[number];

export const conversationStatuses = new Set<ConversationStatus>([
  'NEW',
  'IN_PROGRESS',
  'WAITING_COMPANY',
  'WAITING_CONSULTANT',
  'RESOLVED',
  'ARCHIVED',
  'REOPENED',
]);

export function requiredCommunicationText(value: FormDataEntryValue | null, label: string, max: number): string {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${label} é obrigatório`);
  if (text.length > max) throw new Error(`${label} excede ${max} caracteres`);
  return text;
}

export function optionalCommunicationText(value: FormDataEntryValue | null, max: number): string | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (text.length > max) throw new Error(`Texto excede ${max} caracteres`);
  return text;
}

export function safeReturnTo(value: FormDataEntryValue | null, fallback: string): string {
  const candidate = String(value ?? '').trim();
  return candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : fallback;
}
