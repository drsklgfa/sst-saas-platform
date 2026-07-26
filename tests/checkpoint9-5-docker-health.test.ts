import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('imagem Docker força o Next standalone a ouvir em todas as interfaces', () => {
  const dockerfile = readFileSync('Dockerfile', 'utf8');
  assert.match(dockerfile, /HOSTNAME=0\.0\.0\.0/);
});

test('homologação Docker usa rede própria, PostgreSQL próprio e porta publicada', () => {
  const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
  assert.match(workflow, /docker network create/);
  assert.match(workflow, /--name sst-postgres-ci/);
  assert.match(workflow, /@sst-postgres-ci:5432/);
  assert.match(workflow, /-p 3000:3000/);
  assert.match(workflow, /-e HOSTNAME=0\.0\.0\.0/);
  assert.doesNotMatch(workflow, /--network host/);
});

test('homologação diagnostica saída prematura de Web e Worker', () => {
  const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
  assert.match(workflow, /Contêiner Web encerrou antes/);
  assert.match(workflow, /Contêiner Worker encerrou antes/);
  assert.match(workflow, /Último HTTP:/);
});
