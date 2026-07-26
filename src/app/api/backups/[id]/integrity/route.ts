import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { enqueueJob } from '@/lib/jobs';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeTenantApi('backup.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const { id } = await params;
  const backup = await db.backupExport.findFirst({ where: { id, tenantId: tenant.id, status: 'SUCCEEDED', fileObjectId: { not: null } } });
  if (!backup) return new Response('Backup concluído não encontrado', { status: 404 });
  const form = await request.formData();
  const password = String(form.get('password') ?? '') || undefined;
  if (backup.encrypted && !password) return new Response('Informe a senha do backup protegido', { status: 400 });
  const test = await db.recoveryTest.create({ data: { tenantId: tenant.id, backupExportId: backup.id, createdById: user.id } });
  await enqueueJob(tenant.id, 'BACKUP_INTEGRITY', { testId: test.id, password });
  await audit({ tenantId: tenant.id, userId: user.id, action: 'BACKUP_INTEGRITY_QUEUED', entityType: 'BackupExport', entityId: backup.id, metadata: { recoveryTestId: test.id } });
  return NextResponse.redirect(publicAppUrl('/backups?integrity=queued'), 303);
}
