import type { QuestionType } from '@prisma/client';

const optionTypes = new Set<QuestionType>(['YES_NO', 'SINGLE_CHOICE', 'MULTI_CHOICE', 'LIKERT']);

export interface ParsedQuestionOption {
  value: string;
  label: string;
  score: number | null;
  position: number;
}

export function slugQuestionCode(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

export function parseQuestionOptions(type: QuestionType, raw: unknown): ParsedQuestionOption[] {
  if (!optionTypes.has(type)) return [];
  const text = String(raw ?? '').trim();
  if (!text && type === 'YES_NO') {
    return [
      { value: 'YES', label: 'Sim', score: 1, position: 1 },
      { value: 'NO', label: 'Não', score: 0, position: 2 },
    ];
  }
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const options = lines.map((line, index) => {
    const [rawValue, rawLabel, rawScore] = line.split('|').map((part) => part?.trim());
    const value = (rawValue || rawLabel || '').slice(0, 100);
    const label = (rawLabel || rawValue || '').slice(0, 300);
    const score = rawScore === undefined || rawScore === '' ? null : Number(rawScore);
    if (!value || !label) throw new Error(`Opção inválida na linha ${index + 1}`);
    if (score !== null && !Number.isFinite(score)) throw new Error(`Pontuação inválida na linha ${index + 1}`);
    return { value, label, score, position: index + 1 };
  });
  if (options.length < 2) throw new Error('Informe ao menos duas opções');
  if (new Set(options.map((option) => option.value)).size !== options.length) throw new Error('Os valores das opções devem ser únicos');
  return options;
}

export function parseConditions(raw: unknown): unknown[] {
  const text = String(raw ?? '').trim();
  if (!text) return [];
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) throw new Error('Condições devem ser uma lista JSON');
  for (const condition of parsed) {
    if (!condition || typeof condition !== 'object' || typeof (condition as { questionCode?: unknown }).questionCode !== 'string') {
      throw new Error('Cada condição precisa informar questionCode');
    }
  }
  return parsed;
}

export function serializeQuestionOptions(options: Array<{ value: string; label: string; score: number | null }>): string {
  return options.map((option) => `${option.value}|${option.label}${option.score === null ? '' : `|${option.score}`}`).join('\n');
}
