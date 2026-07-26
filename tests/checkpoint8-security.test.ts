import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const schema = read('prisma/schema.prisma');

test('schema registra política, incidentes, recuperação e heartbeat', () => {
  for (const model of ['TenantSecurityPolicy', 'SecurityIncident', 'RecoveryTest', 'ServiceHeartbeat']) {
    assert.match(schema, new RegExp(`model ${model} \\{`));
  }
  assert.match(schema, /legalHold\s+Boolean\s+@default\(false\)/);
  assert.match(schema, /backupExport\s+BackupExport\s+@relation/);
  assert.match(schema, /@@unique\(\[service,\s*instanceId\]\)/);
});

test('retenção preserva dados técnicos e respeita legal hold', () => {
  const source = read('src/domain/retention.ts');
  assert.match(source, /RETENTION_SKIPPED_LEGAL_HOLD/);
  assert.doesNotMatch(source, /responseSession\.deleteMany|document\.deleteMany|risk\.deleteMany|actionItem\.deleteMany/);
  assert.match(source, /auditDeletionEnabled/);
  assert.match(source, /status: \{ in: \['SUCCEEDED', 'CANCELLED'\] \}/);
});

test('worker publica heartbeat e executa retenção programada', () => {
  const worker = read('src/worker/index.ts');
  assert.match(worker, /recordHeartbeat\('worker'/);
  assert.match(worker, /runScheduledRetention/);
  assert.match(worker, /lastRetentionSync/);
});

test('payloads com senhas são eliminados após execução', () => {
  const worker = read('src/worker/index.ts');
  assert.match(worker, /BACKUP_COMPANY/);
  assert.match(worker, /BACKUP_PLATFORM/);
  assert.match(worker, /BACKUP_INTEGRITY/);
  assert.match(worker, /redacted: true/);
});

test('backup possui teste de integridade assíncrono e auditado', () => {
  const route = read('src/app/api/backups/[id]/integrity/route.ts');
  const processor = read('src/worker/processors.ts');
  assert.match(route, /authorizeTenantApi\('backup.manage'\)/);
  assert.match(route, /BACKUP_INTEGRITY/);
  assert.match(route, /BACKUP_INTEGRITY_QUEUED/);
  assert.match(processor, /inspectBackup/);
  assert.match(processor, /fileSha256Matches/);
});

test('painéis de auditoria, segurança e sistema exigem permissões próprias', () => {
  assert.match(read('src/app/(app)/settings/audit/page.tsx'), /requireTenantPermission\('audit.read'\)/);
  assert.match(read('src/app/(app)/settings/security/page.tsx'), /requireTenantPermission\('security.manage'\)/);
  assert.match(read('src/app/(app)/settings/system/page.tsx'), /requireTenantPermission\('system.read'\)/);
});

test('middleware bloqueia requisições cross-site e adiciona headers defensivos', () => {
  const middleware = read('src/middleware.ts');
  assert.match(middleware, /sec-fetch-site/);
  assert.match(middleware, /cross-site/);
  assert.match(middleware, /Strict-Transport-Security/);
  assert.match(middleware, /Cross-Origin-Resource-Policy/);
  assert.match(middleware, /X-Permitted-Cross-Domain-Policies/);
});

test('backup portátil versão 8 preserva governança sem segredos de integração', () => {
  const platform = read('src/domain/backup/export-platform.ts');
  assert.match(platform, /version: 8/);
  assert.match(platform, /securityPolicy: true/);
  assert.match(platform, /securityIncidents/);
  assert.match(platform, /auditLogs/);
  assert.match(platform, /integrations: \{ select:/);
  assert.doesNotMatch(platform, /configEncrypted: true/);
});
