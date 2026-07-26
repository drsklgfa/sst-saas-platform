import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { enqueueJob } from '@/lib/jobs';
import { NextResponse } from 'next/server';
export async function POST(request: Request) {
  const authorization = await authorizeTenantApi('backup.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const form = await request.formData();
  const password = String(form.get('password') ?? '') || undefined;
  const backup = await db.backupExport.create({ data: { tenantId: tenant.id, type: 'PLATFORM_FULL', encrypted: Boolean(password), createdById: user.id } });
  await enqueueJob(tenant.id, 'BACKUP_PLATFORM', { backupId: backup.id, userId: user.id, password });
  return NextResponse.redirect(publicAppUrl('/backups'), 303);
}
