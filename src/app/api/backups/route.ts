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
  const companyId = String(form.get('companyId'));
  const company = await db.company.findFirst({ where: { id: companyId, tenantId: tenant.id } });
  if (!company) return new Response('Não encontrado', { status: 404 });
  const password = String(form.get('password') ?? '') || undefined;
  const backup = await db.backupExport.create({ data: { tenantId: tenant.id, companyId, type: 'COMPANY_FULL', encrypted: Boolean(password), createdById: user.id } });
  await enqueueJob(tenant.id, 'BACKUP_COMPANY', { backupId: backup.id, companyId, userId: user.id, password });
  return NextResponse.redirect(publicAppUrl('/backups'), 303);
}
