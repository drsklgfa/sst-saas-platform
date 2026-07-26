import assert from 'node:assert/strict';
import test from 'node:test';
import { safeJson } from '../src/lib/json.ts';

test('safeJson converte BigInt e preserva estruturas JSON', () => {
  assert.deepEqual(safeJson({ total: 12n, nested: [true, null, 'ok'] }), {
    total: '12',
    nested: [true, null, 'ok'],
  });
});

test('safeJson usa fallback quando o valor raiz não é serializável', () => {
  assert.deepEqual(safeJson(undefined, []), []);
});
