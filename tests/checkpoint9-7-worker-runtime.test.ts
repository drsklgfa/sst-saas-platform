import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path: string) => readFile(path, 'utf8');

test('imagem final inclui configuração necessária aos aliases do Worker', async () => {
  const dockerfile = await read('Dockerfile');
  assert.match(dockerfile, /COPY --from=builder \/app\/tsconfig\.json \.\/tsconfig\.json/);
  assert.match(dockerfile, /test -f \.\/tsconfig\.json/);
  assert.match(dockerfile, /test -x \.\/node_modules\/\.bin\/tsx/);
});

test('Worker usa script de produção com tsconfig explícito', async () => {
  const pkg = JSON.parse(await read('package.json'));
  assert.equal(pkg.scripts.worker, 'tsx --tsconfig ./tsconfig.json ./src/worker/index.ts');
  assert.equal(pkg.dependencies.tsx, '4.20.5');
  assert.equal(pkg.devDependencies.tsx, undefined);
});

test('homologação inicia Worker pelo contrato do package.json', async () => {
  const workflow = await read('.github/workflows/ci.yml');
  assert.match(workflow, /sst-saas-platform:ci npm run worker/);
  assert.doesNotMatch(workflow, /node --import tsx src\/worker\/index\.ts/);
});
