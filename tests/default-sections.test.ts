import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefaultSections } from '../src/domain/documents/default-sections.ts';

test('todos os tipos principais recebem estrutura documental mínima', () => {
  for (const code of ['AEP','AET','PSY','PGR','LTCAT','INSAL','PERIC','APR','OS','CUSTOM']) {
    const sections = getDefaultSections(code);
    assert.ok(sections.length >= 11, `${code} sem seções mínimas`);
    assert.ok(sections.some((section) => section.code === 'CONCLUSION'));
    assert.equal(new Set(sections.map((section) => section.code)).size, sections.length);
  }
});
