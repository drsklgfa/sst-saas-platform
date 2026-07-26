import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

test('Button compartilhado aceita variantes sem repassar variant ao elemento HTML', () => {
  const source = read('src/components/ui.tsx');
  assert.match(source, /type ButtonVariant = 'primary' \| 'secondary' \| 'outline' \| 'danger' \| 'ghost'/);
  assert.match(source, /type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & \{[\s\S]*variant\?: ButtonVariant/);
  assert.match(source, /export function Button\(\{ className, variant = 'primary', \.\.\.props \}: ButtonProps\)/);
  assert.match(source, /buttonVariantClasses\[variant\]/);
  assert.doesNotMatch(source, /<button[^>]*\{\.\.\.p\}[^>]*variant=/);
});

test('página de segurança usa uma variante suportada', () => {
  const page = read('src/app/(app)/settings/security/page.tsx');
  assert.match(page, /<Button variant="secondary">Executar limpeza operacional agora<\/Button>/);
});
