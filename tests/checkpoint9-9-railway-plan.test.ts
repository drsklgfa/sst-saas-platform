import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const worker = readFileSync('railway.worker.toml', 'utf8');

test('Worker usa política compatível com Railway Free/trial e reinicia em falha', () => {
  assert.match(worker, /restartPolicyType\s*=\s*"ON_FAILURE"/);
  assert.match(worker, /restartPolicyMaxRetries\s*=\s*10/);
  assert.doesNotMatch(worker, /restartPolicyType\s*=\s*"ALWAYS"/);
});
