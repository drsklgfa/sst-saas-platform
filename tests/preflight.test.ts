import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const baseEnvironment = {
  ...process.env,
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/sst_saas?schema=public',
  AUTH_SECRET: 'ci-secret-with-at-least-32-characters',
  FILE_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  AI_PROVIDER: 'disabled',
  EMAIL_PROVIDER: 'disabled',
};

function run(script: string, environment: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    env: environment,
    encoding: 'utf8',
  });
}

test('preflight aceita armazenamento local completo', () => {
  const result = run('scripts/preflight.mjs', {
    ...baseEnvironment,
    STORAGE_DRIVER: 'local',
  });
  assert.equal(result.status, 0, result.stderr);
});

test('preflight rejeita S3 incompleto', () => {
  const result = run('scripts/preflight.mjs', {
    ...baseEnvironment,
    STORAGE_DRIVER: 's3',
    S3_ENDPOINT: '',
    S3_REGION: '',
    S3_BUCKET: '',
    S3_ACCESS_KEY_ID: '',
    S3_SECRET_ACCESS_KEY: '',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Configuração S3 incompleta/);
});

test('preflight do seed aceita credenciais fortes', () => {
  const result = run('scripts/preflight-seed.mjs', {
    ...process.env,
    SEED_TENANT_NAME: 'Consultoria Teste',
    SEED_TENANT_SLUG: 'consultoria-teste',
    SEED_ADMIN_NAME: 'Administrador',
    SEED_ADMIN_EMAIL: 'admin@example.com',
    SEED_ADMIN_PASSWORD: 'SenhaForte@123',
  });
  assert.equal(result.status, 0, result.stderr);
});

test('preflight do seed rejeita senha curta', () => {
  const result = run('scripts/preflight-seed.mjs', {
    ...process.env,
    SEED_TENANT_NAME: 'Consultoria Teste',
    SEED_TENANT_SLUG: 'consultoria-teste',
    SEED_ADMIN_NAME: 'Administrador',
    SEED_ADMIN_EMAIL: 'admin@example.com',
    SEED_ADMIN_PASSWORD: 'curta',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /12 caracteres/);
});
