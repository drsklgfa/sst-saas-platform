import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

async function routes(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return routes(target);
    return entry.name === 'route.ts' ? [target] : [];
  }));
  return nested.flat();
}

test('rotas mutáveis autenticadas declaram autorização explícita', async () => {
  const root = path.resolve('src/app/api');
  const files = await routes(root);
  const exempt = [
    `${path.sep}api${path.sep}auth${path.sep}`,
    `${path.sep}api${path.sep}activate${path.sep}`,
    `${path.sep}api${path.sep}public${path.sep}`,
    `${path.sep}api${path.sep}health${path.sep}`,
  ];
  const failures: string[] = [];
  for (const file of files) {
    if (exempt.some((part) => file.includes(part))) continue;
    const source = await readFile(file, 'utf8');
    if (!/export async function (POST|PUT|PATCH|DELETE)/.test(source)) continue;
    const authorized = /authorizeTenantApi|authorizeCompanyApi|getCurrentUser/.test(source);
    if (!authorized) failures.push(path.relative(process.cwd(), file));
  }
  assert.deepEqual(failures, []);
});
