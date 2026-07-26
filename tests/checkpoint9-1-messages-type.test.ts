import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/(app)/messages/page.tsx', 'utf8');

test('central de mensagens normaliza nomes para ReactNode textual', () => {
  assert.match(source, /new Map<string, string>/);
  assert.match(source, /const assignedName = \(assignedToId: string \| null \| undefined\)/);
  assert.match(source, /\{assignedName\(row\.assignedToId\)\}/);
  assert.doesNotMatch(source, /\{row\.assignedToId \? names\.get\(row\.assignedToId\)/);
});
