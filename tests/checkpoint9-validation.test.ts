import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

test('evidência do portal usa transação interativa e retorna o registro criado', () => {
  const source = read('src/app/api/portal/actions/[id]/evidence/route.ts');
  assert.match(source, /db\.\$transaction\(async \(tx\) =>/);
  assert.match(source, /return created;/);
  assert.doesNotMatch(source, /evidence\[0\]/);
});

test('rotina agendada de retenção possui resultado explicitamente tipado', () => {
  const source = read('src/domain/retention.ts');
  assert.match(source, /Array<\{ tenantId: string; result: Awaited<ReturnType<typeof runRetentionForTenant>> \}>/);
});

test('validação offline gera enums e models a partir do schema real', () => {
  const generator = read('scripts/generate-offline-prisma-types.mjs');
  const packageJson = JSON.parse(read('package.json'));
  assert.match(generator, /prisma\/schema\.prisma/);
  assert.match(generator, /PrismaClientKnownRequestError/);
  assert.equal(packageJson.scripts['typecheck:offline'], 'npm run generate:offline-types && tsc -p tsconfig.offline.json');
});

test('CI mantém typecheck real e testa Web e Worker dentro da imagem Docker', () => {
  const workflow = read('.github/workflows/ci.yml');
  assert.match(workflow, /npm run typecheck:offline/);
  assert.match(workflow, /npm run typecheck\n/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /docker build --tag sst-saas-platform:ci/);
  assert.match(workflow, /--name sst-worker-ci/);
  assert.match(workflow, /--name sst-web-ci/);
  assert.match(workflow, /h\.worker!=='ok'/);
});

test('framework usa patches mantidos das linhas Next 15 e React 19.1', () => {
  const packageJson = JSON.parse(read('package.json'));
  assert.equal(packageJson.dependencies.next, '15.5.20');
  assert.equal(packageJson.dependencies.react, '19.1.8');
  assert.equal(packageJson.dependencies['react-dom'], '19.1.8');
});

test('CI formata com o Prisma oficial antes de conferir, validar e gerar', () => {
  const workflow = read('.github/workflows/ci.yml');
  const format = workflow.indexOf('npx prisma format\n');
  const check = workflow.indexOf('npx prisma format --check');
  const validate = workflow.indexOf('npx prisma validate');
  const generate = workflow.indexOf('npx prisma generate');
  assert.ok(format >= 0);
  assert.ok(check > format);
  assert.ok(validate > check);
  assert.ok(generate > validate);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/);
});
