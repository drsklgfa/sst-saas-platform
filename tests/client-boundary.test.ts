import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const forbiddenSpecifiers = [
  /^node:/,
  /^server-only$/,
  /^@prisma\/client$/,
  /^next\/(headers|server)$/,
];

function resolveLocalImport(fromFile: string, specifier: string): string | null {
  const base = specifier.startsWith('@/')
    ? path.join(srcRoot, specifier.slice(2))
    : specifier.startsWith('.')
      ? path.resolve(path.dirname(fromFile), specifier)
      : null;

  if (!base) return null;

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js'),
    path.join(base, 'index.jsx'),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function importsOf(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const imports = new Set<string>();
  const patterns = [
    /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) imports.add(match[1]);
  }
  return [...imports];
}

test('componentes client não importam módulos exclusivos do servidor', () => {
  const entry = path.join(srcRoot, 'components', 'public-questionnaire.tsx');
  const visited = new Set<string>();
  const stack = [entry];
  const violations: string[] = [];

  while (stack.length) {
    const file = stack.pop();
    if (!file || visited.has(file)) continue;
    visited.add(file);

    for (const specifier of importsOf(file)) {
      if (forbiddenSpecifiers.some((pattern) => pattern.test(specifier))) {
        violations.push(`${path.relative(root, file)} -> ${specifier}`);
        continue;
      }
      const resolved = resolveLocalImport(file, specifier);
      if (resolved) stack.push(resolved);
    }
  }

  assert.deepEqual(violations, []);
});
