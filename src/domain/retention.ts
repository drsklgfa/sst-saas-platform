import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

export async function ensureTenantSecurityPolicy(tenantId: string) {
  return db.tenantSecurityPolicy.upsert({
    where: { tenantId },
    update: {},
    create: { tenantId },
  });
}

export async function runRetentionForTenant(tenantId: string, actorId?: string) {
  const policy = await ensureTenantSecurityPolicy(tenantId);
  if (policy.legalHold) {
    await db.tenantSecurityPolicy.update({ where: { tenantId }, data: { lastRetentionRunAt: new Date() } });
    await audit({
      tenantId,
      userId: actorId,
      action: 'RETENTION_SKIPPED_LEGAL_HOLD',
      entityType: 'TenantSecurityPolicy',
      entityId: policy.id,
      metadata: { legalHold: true },
    });
    return { skipped: true, reason: 'LEGAL_HOLD', deleted: {} };
  }

  const deleted = {
    sessions: 0,
    notifications: 0,
    jobs: 0,
    invites: 0,
    auditLogs: 0,
  };

  const sessions = await db.session.deleteMany({
    where: { expiresAt: { lt: daysAgo(policy.expiredSessionRetentionDays) } },
  });
  deleted.sessions = sessions.count;

  const notifications = await db.notification.deleteMany({
    where: {
      readAt: { not: null, lt: daysAgo(policy.notificationRetentionDays) },
      user: { memberships: { some: { tenantId } } },
    },
  });
  deleted.notifications = notifications.count;

  const jobs = await db.job.deleteMany({
    where: {
      tenantId,
      status: { in: ['SUCCEEDED', 'CANCELLED'] },
      updatedAt: { lt: daysAgo(policy.jobRetentionDays) },
    },
  });
  deleted.jobs = jobs.count;

  const invites = await db.userInvite.deleteMany({
    where: {
      createdAt: { lt: daysAgo(policy.inviteRetentionDays) },
      OR: [
        { usedAt: { not: null } },
        { expiresAt: { lt: new Date() } },
      ],
      user: { memberships: { some: { tenantId } } },
    },
  });
  deleted.invites = invites.count;

  if (policy.auditDeletionEnabled) {
    const logs = await db.auditLog.deleteMany({
      where: { tenantId, createdAt: { lt: daysAgo(policy.auditRetentionDays) } },
    });
    deleted.auditLogs = logs.count;
  }

  await db.tenantSecurityPolicy.update({ where: { tenantId }, data: { lastRetentionRunAt: new Date() } });
  await audit({
    tenantId,
    userId: actorId,
    action: 'RETENTION_RUN_COMPLETED',
    entityType: 'TenantSecurityPolicy',
    entityId: policy.id,
    after: deleted,
    metadata: {
      auditDeletionEnabled: policy.auditDeletionEnabled,
      policy: {
        notificationRetentionDays: policy.notificationRetentionDays,
        jobRetentionDays: policy.jobRetentionDays,
        expiredSessionRetentionDays: policy.expiredSessionRetentionDays,
        inviteRetentionDays: policy.inviteRetentionDays,
        auditRetentionDays: policy.auditRetentionDays,
      },
    },
  });

  return { skipped: false, deleted };
}

export async function runScheduledRetention() {
  const tenants = await db.tenant.findMany({ select: { id: true } });
  const results: Array<{ tenantId: string; result: Awaited<ReturnType<typeof runRetentionForTenant>> }> = [];
  for (const tenant of tenants) {
    const policy = await ensureTenantSecurityPolicy(tenant.id);
    if (!policy.lastRetentionRunAt || Date.now() - policy.lastRetentionRunAt.getTime() >= 24 * 60 * 60 * 1000) {
      results.push({ tenantId: tenant.id, result: await runRetentionForTenant(tenant.id) });
    }
  }
  return results;
}
