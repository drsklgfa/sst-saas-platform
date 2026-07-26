import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

test('configuração compartilhada não impõe healthcheck ao Worker', () => {
  const shared = read('railway.toml');
  assert.doesNotMatch(shared, /healthcheckPath/);
  assert.match(shared, /builder\s*=\s*"DOCKERFILE"/);
});

test('Web possui healthcheck próprio e usa o Dockerfile', () => {
  const web = read('railway.web.toml');
  assert.match(web, /healthcheckPath\s*=\s*"\/api\/health"/);
  assert.match(web, /dockerfilePath\s*=\s*"Dockerfile"/);
});

test('Worker usa entrypoint, npm run worker e não expõe healthcheck HTTP', () => {
  const worker = read('railway.worker.toml');
  assert.match(worker, /entrypoint\.sh npm run worker/);
  assert.doesNotMatch(worker, /healthcheckPath/);
  assert.match(worker, /restartPolicyType\s*=\s*"ON_FAILURE"/);
});
