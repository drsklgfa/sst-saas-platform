import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeReportHtml } from '../src/domain/reports/sanitize.ts';

test('remove scripts, eventos e URLs javascript do relatório', () => {
  const dirty = '<p onclick="alert(1)">Texto</p><script>alert(2)</script><a href="javascript:alert(3)" style="color:red">x</a>';
  const clean = sanitizeReportHtml(dirty);
  assert.equal(clean.includes('<script'), false);
  assert.equal(clean.includes('onclick'), false);
  assert.equal(clean.includes('javascript:'), false);
  assert.equal(clean.includes('style='), false);
  assert.equal(clean.includes('Texto'), true);
});
