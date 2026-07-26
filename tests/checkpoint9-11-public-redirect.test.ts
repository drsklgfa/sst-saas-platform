import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

test('login usa a URL pública canônica e não o endereço interno do contêiner', () => {
  const login = readFileSync('src/app/api/auth/login/route.ts', 'utf8');
  const helper = readFileSync('src/lib/public-url.ts', 'utf8');
  assert.match(login, /publicAppUrl\(landingPageFor\(user\)\)/);
  assert.doesNotMatch(login, /new URL\([^\n]*request\.url/);
  assert.match(helper, /new URL\(path, env\.APP_URL\)/);
});

test('redirecionamentos das rotas não derivam origem de request.url', () => {
  const routeFiles = filesUnder('src/app/api').filter((file) => file.endsWith('route.ts'));
  for (const file of routeFiles) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /NextResponse\.redirect\([^\n]*new URL\([^\n]*request\.url/, file);
  }
});

test('middleware redireciona para APP_URL em produção', () => {
  const middleware = readFileSync('src/middleware.ts', 'utf8');
  assert.match(middleware, /process\.env\.APP_URL/);
  assert.match(middleware, /publicRedirectUrl\('\/login', request\)/);
});
