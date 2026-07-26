import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { enqueueJob } from '@/lib/jobs';
import { NextResponse } from 'next/server';

const boundedInt = (value: FormDataEntryValue | null, min: number, max: number, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
};

export async function POST(request: Request) {
  const authorization = await authorizeTenantApi('security.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const form = await request.formData();
  const operation = String(form.get('operation') ?? 'save');

  if (operation === 'run_retention') {
    await enqueueJob(tenant.id, 'RETENTION_RUN', { userId: user.id });
    return NextResponse.redirect(publicAppUrl('/settings/security?retention=queued'), 303);
  }

  const current = await db.tenantSecurityPolicy.findUnique({ where: { tenantId: tenant.id } });
  const data = {
    legalHold: form.get('legalHold') === 'on',
    auditDeletionEnabled: form.get('auditDeletionEnabled') === 'on',
    auditRetentionDays: boundedInt(form.get('auditRetentionDays'), 365, 36500, current?.auditRetentionDays ?? 3650),
    notificationRetentionDays: boundedInt(form.get('notificationRetentionDays'), 30, 3650, current?.notificationRetentionDays ?? 365),
    jobRetentionDays: boundedInt(form.get('jobRetentionDays'), 7, 3650, current?.jobRetentionDays ?? 90),
    expiredSessionRetentionDays: boundedInt(form.get('expiredSessionRetentionDays'), 1, 365, current?.expiredSessionRetentionDays ?? 30),
    inviteRetentionDays: boundedInt(form.get('inviteRetentionDays'), 1, 365, current?.inviteRetentionDays ?? 30),
    backupReviewDays: boundedInt(form.get('backupReviewDays'), 1, 365, current?.backupReviewDays ?? 7),
  };

  if (data.legalHold) data.auditDeletionEnabled = false;
  const policy = await db.tenantSecurityPolicy.upsert({
    where: { tenantId: tenant.id },
    update: data,
    create: { tenantId: tenant.id, ...data },
  });
  await audit({ tenantId: tenant.id, userId: user.id, action: 'SECURITY_POLICY_UPDATED', entityType: 'TenantSecurityPolicy', entityId: policy.id, before: current, after: policy });
  return NextResponse.redirect(publicAppUrl('/settings/security?saved=1'), 303);
}
