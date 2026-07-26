export type PublicQuestionType =
  | 'YES_NO'
  | 'SINGLE_CHOICE'
  | 'MULTI_CHOICE'
  | 'LIKERT'
  | 'NUMBER'
  | 'TEXT'
  | 'LONG_TEXT'
  | 'DATE'
  | 'BODY_MAP'
  | 'MATRIX'
  | 'FILE';

export interface PublicQuestionRule {
  id: string;
  code: string;
  type: PublicQuestionType;
  required: boolean;
  minValue?: number | null;
  maxValue?: number | null;
  conditions?: unknown;
  options: Array<{ value: string; score?: number | null }>;
}

export interface SubmittedAnswer {
  questionId: string;
  value: unknown;
}

export interface BodyPainInput {
  regionCode: string;
  intensity: number;
}

type Condition = {
  questionCode: string;
  operator?: 'equals' | 'notEquals' | 'includes' | 'notIncludes' | 'answered' | 'notAnswered';
  value?: unknown;
};

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function normalizeConditions(value: unknown): Condition[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Condition => {
    if (!item || typeof item !== 'object') return false;
    return typeof (item as { questionCode?: unknown }).questionCode === 'string';
  });
}

export function conditionsSatisfied(conditions: unknown, answersByCode: Record<string, unknown>): boolean {
  return normalizeConditions(conditions).every((condition) => {
    const current = answersByCode[condition.questionCode];
    const operator = condition.operator ?? 'equals';
    if (operator === 'answered') return isFilled(current);
    if (operator === 'notAnswered') return !isFilled(current);
    if (operator === 'includes') return Array.isArray(current) && current.some((item) => item === condition.value);
    if (operator === 'notIncludes') return !Array.isArray(current) || !current.some((item) => item === condition.value);
    if (operator === 'notEquals') return current !== condition.value;
    return current === condition.value;
  });
}

function validateValue(question: PublicQuestionRule, value: unknown): string | null {
  if (question.type === 'MULTI_CHOICE') {
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) return 'Seleção múltipla inválida';
    const allowed = new Set(question.options.map((option) => option.value));
    if (value.some((item) => !allowed.has(item))) return 'Opção inválida';
    return null;
  }

  if (['YES_NO', 'SINGLE_CHOICE', 'LIKERT'].includes(question.type)) {
    if (typeof value !== 'string') return 'Opção inválida';
    const allowed = new Set(question.options.map((option) => option.value));
    if (!allowed.has(value)) return 'Opção inválida';
    return null;
  }

  if (question.type === 'NUMBER') {
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number)) return 'Número inválido';
    if (question.minValue !== null && question.minValue !== undefined && number < question.minValue) return 'Número abaixo do mínimo';
    if (question.maxValue !== null && question.maxValue !== undefined && number > question.maxValue) return 'Número acima do máximo';
    return null;
  }

  if (question.type === 'DATE') {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) return 'Data inválida';
    return null;
  }

  if (['TEXT', 'LONG_TEXT', 'MATRIX'].includes(question.type)) {
    if (typeof value !== 'string') return 'Texto inválido';
    if (value.length > 5000) return 'Texto excede o limite';
    return null;
  }

  if (question.type === 'FILE') return 'Envio de arquivos não está habilitado nesta pesquisa';
  return null;
}

export function validateQuestionnaireResponse(input: {
  questions: PublicQuestionRule[];
  answers: SubmittedAnswer[];
  bodyPains: BodyPainInput[];
}): { valid: boolean; errors: string[]; activeQuestionIds: Set<string> } {
  const errors: string[] = [];
  const questionById = new Map(input.questions.map((question) => [question.id, question]));
  const answersById = new Map<string, unknown>();
  for (const answer of input.answers) {
    if (answersById.has(answer.questionId)) errors.push('Pergunta respondida mais de uma vez');
    answersById.set(answer.questionId, answer.value);
  }

  for (const answer of input.answers) {
    if (!questionById.has(answer.questionId)) errors.push('Pergunta inválida');
  }

  const answersByCode: Record<string, unknown> = {};
  for (const question of input.questions) {
    if (answersById.has(question.id)) answersByCode[question.code] = answersById.get(question.id);
  }

  const activeQuestionIds = new Set<string>();
  for (const question of input.questions) {
    if (!conditionsSatisfied(question.conditions, answersByCode)) continue;
    activeQuestionIds.add(question.id);
    if (question.type === 'BODY_MAP') {
      if (question.required && input.bodyPains.length === 0) errors.push(`Resposta obrigatória ausente: ${question.code}`);
      continue;
    }
    const value = answersById.get(question.id);
    if (question.required && !isFilled(value)) {
      errors.push(`Resposta obrigatória ausente: ${question.code}`);
      continue;
    }
    if (!isFilled(value)) continue;
    const valueError = validateValue(question, value);
    if (valueError) errors.push(`${question.code}: ${valueError}`);
  }

  for (const pain of input.bodyPains) {
    if (!/^[A-Z0-9_\-]{2,50}$/.test(pain.regionCode)) errors.push('Região corporal inválida');
    if (!Number.isInteger(pain.intensity) || pain.intensity < 1 || pain.intensity > 10) errors.push('Intensidade corporal inválida');
  }

  return { valid: errors.length === 0, errors, activeQuestionIds };
}

export function detectResponseQuality(input: {
  durationSeconds: number;
  activeQuestionCount: number;
  answers: SubmittedAnswer[];
}): string[] {
  const flags: string[] = [];
  const minimumExpected = Math.max(20, Math.round(input.activeQuestionCount * 1.5));
  if (input.durationSeconds < minimumExpected) flags.push('FAST_COMPLETION');

  const scalarValues = input.answers
    .map((answer) => answer.value)
    .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
    .map(String);
  if (scalarValues.length >= 8 && new Set(scalarValues).size === 1) flags.push('STRAIGHT_LINING');
  return flags;
}
