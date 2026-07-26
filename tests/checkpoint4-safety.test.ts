import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

test('worker sincroniza campanhas programadas com proteção contra concorrência', () => {
  const worker = read('src/worker/index.ts');
  const scheduler = read('src/domain/campaign-scheduler.ts');
  assert.match(worker, /syncCampaignSchedules/);
  assert.match(scheduler, /updateMany/);
  assert.match(scheduler, /AUTO_OPEN/);
  assert.match(scheduler, /AUTO_CLOSE/);
});

test('backup não exporta códigos anônimos reutilizáveis', () => {
  const exporter = read('src/domain/backup/export-company.ts');
  const importer = read('src/domain/backup/import-company.ts');
  assert.match(exporter, /version: 8/);
  assert.match(exporter, /codes: \[\]/);
  assert.match(exporter, /anonymousCodeSummary/);
  assert.match(importer, /codesRequireRegeneration: true/);
  assert.doesNotMatch(importer, /for \(const code of campaign\.codes/);
});

test('validador local detecta valores duplicados em enums Prisma', () => {
  const validator = read('scripts/validate-prisma-schema.mjs');
  assert.match(validator, /valor duplicado no enum/);
  const schema = read('prisma/schema.prisma');
  const messageChannel = schema.match(/enum MessageChannel \{([\s\S]*?)\}/)?.[1] ?? '';
  const values = messageChannel.trim().split(/\s+/);
  assert.equal(new Set(values).size, values.length);
});
