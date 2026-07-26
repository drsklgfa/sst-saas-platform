import { db } from '@/lib/db';
import { inspectBackup, importCompanyAsNew } from './import-company';
import { toPrismaJson } from '@/lib/prisma-json';

export async function importPlatformBackup(tenantId: string, input: Buffer, password?: string) {
  const inspected = await inspectBackup(input, password);
  if (!inspected.valid) throw new Error(`Arquivos corrompidos: ${inspected.invalid.join(', ')}`);
  if (inspected.manifest.type !== 'PLATFORM_FULL') throw new Error('O arquivo não é um backup completo da plataforma');
  const tenantEntry = inspected.directory.files.find((entry) => entry.path === 'data/tenant.json');
  if (tenantEntry) {
    const source = JSON.parse((await tenantEntry.buffer()).toString('utf8'));
    const current = await db.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    await db.tenant.update({ where: { id: tenantId }, data: { settings: toPrismaJson({ ...(current.settings as object), ...(source.settings ?? {}) }) } });
    if (source.securityPolicy) {
      const policy = source.securityPolicy;
      await db.tenantSecurityPolicy.upsert({
        where: { tenantId },
        update: {
          legalHold: Boolean(policy.legalHold),
          auditDeletionEnabled: Boolean(policy.auditDeletionEnabled) && !Boolean(policy.legalHold),
          auditRetentionDays: Number(policy.auditRetentionDays) || 3650,
          notificationRetentionDays: Number(policy.notificationRetentionDays) || 365,
          jobRetentionDays: Number(policy.jobRetentionDays) || 90,
          expiredSessionRetentionDays: Number(policy.expiredSessionRetentionDays) || 30,
          inviteRetentionDays: Number(policy.inviteRetentionDays) || 30,
          backupReviewDays: Number(policy.backupReviewDays) || 7,
        },
        create: {
          tenantId,
          legalHold: Boolean(policy.legalHold),
          auditDeletionEnabled: Boolean(policy.auditDeletionEnabled) && !Boolean(policy.legalHold),
          auditRetentionDays: Number(policy.auditRetentionDays) || 3650,
          notificationRetentionDays: Number(policy.notificationRetentionDays) || 365,
          jobRetentionDays: Number(policy.jobRetentionDays) || 90,
          expiredSessionRetentionDays: Number(policy.expiredSessionRetentionDays) || 30,
          inviteRetentionDays: Number(policy.inviteRetentionDays) || 30,
          backupReviewDays: Number(policy.backupReviewDays) || 7,
        },
      });
    }
    for (const incident of source.securityIncidents ?? []) {
      const alreadyRestored = await db.securityIncident.findFirst({ where: { tenantId, metadata: { path: ['restoredFromId'], equals: incident.id } } });
      if (alreadyRestored) continue;
      await db.securityIncident.create({ data: {
        tenantId,
        title: incident.title,
        description: incident.description,
        severity: incident.severity,
        status: incident.status,
        detectedAt: new Date(incident.detectedAt),
        containedAt: incident.containedAt ? new Date(incident.containedAt) : null,
        resolvedAt: incident.resolvedAt ? new Date(incident.resolvedAt) : null,
        closedAt: incident.closedAt ? new Date(incident.closedAt) : null,
        actions: toPrismaJson(incident.actions ?? [], []),
        metadata: toPrismaJson({ ...(incident.metadata ?? {}), restoredFromId: incident.id }),
      } });
    }
  }
  const restored: string[] = [];
  const failures: Array<{ file: string; error: string }> = [];
  for (const entry of inspected.directory.files.filter((file) => file.path.startsWith('companies/') && file.path.endsWith('.zip'))) {
    try {
      const company = await importCompanyAsNew(tenantId, await entry.buffer());
      restored.push(company.id);
    } catch (error) {
      failures.push({ file: entry.path, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { restored, failures };
}
