import test from 'node:test';
import assert from 'node:assert/strict';
import { conditionsSatisfied, detectResponseQuality, validateQuestionnaireResponse, type PublicQuestionRule } from '../src/domain/questionnaires/rules.ts';

const questions: PublicQuestionRule[] = [
  { id: 'q1', code: 'has_pain', type: 'YES_NO', required: true, options: [{ value: 'YES' }, { value: 'NO' }] },
  { id: 'q2', code: 'pain_level', type: 'NUMBER', required: true, minValue: 1, maxValue: 10, options: [], conditions: [{ questionCode: 'has_pain', operator: 'equals', value: 'YES' }] },
  { id: 'q3', code: 'support', type: 'LIKERT', required: true, options: [{ value: '1' }, { value: '2' }, { value: '3' }] },
];

test('condições controlam perguntas dependentes', () => {
  assert.equal(conditionsSatisfied([{ questionCode: 'has_pain', operator: 'equals', value: 'YES' }], { has_pain: 'YES' }), true);
  assert.equal(conditionsSatisfied([{ questionCode: 'has_pain', operator: 'equals', value: 'YES' }], { has_pain: 'NO' }), false);
});

test('validação ignora obrigatória oculta e rejeita opção inválida', () => {
  const valid = validateQuestionnaireResponse({ questions, answers: [{ questionId: 'q1', value: 'NO' }, { questionId: 'q3', value: '2' }], bodyPains: [] });
  assert.equal(valid.valid, true);
  assert.equal(valid.activeQuestionIds.has('q2'), false);

  const invalid = validateQuestionnaireResponse({ questions, answers: [{ questionId: 'q1', value: 'MAYBE' }, { questionId: 'q3', value: '2' }], bodyPains: [] });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some((error) => error.includes('Opção inválida')));
});

test('validação exige número dentro da faixa quando condição está ativa', () => {
  const result = validateQuestionnaireResponse({ questions, answers: [{ questionId: 'q1', value: 'YES' }, { questionId: 'q2', value: 15 }, { questionId: 'q3', value: '1' }], bodyPains: [] });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('acima do máximo')));
});

test('qualidade sinaliza conclusão rápida e repetição extensa', () => {
  const flags = detectResponseQuality({ durationSeconds: 5, activeQuestionCount: 10, answers: Array.from({ length: 8 }, (_, index) => ({ questionId: `q${index}`, value: '1' })) });
  assert.deepEqual(flags.sort(), ['FAST_COMPLETION', 'STRAIGHT_LINING']);
});
