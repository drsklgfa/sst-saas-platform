import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { inspectBackup, importCompanyAsNew } from '@/domain/backup/import-company';
import { importPlatformBackup } from '@/domain/backup/import-platform';
import { NextResponse } from 'next/server';
export async function POST(request: Request) {
  const authorization = await authorizeTenantApi('backup.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant } = authorization;
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return new Response('Arquivo ausente', { status: 400 });
  if (file.size > 2 * 1024 * 1024 * 1024) return new Response('Backup maior que 2 GB', { status: 413 });
  const buffer = Buffer.from(await file.arrayBuffer());
  const password = String(form.get('password') ?? '') || undefined;
  const inspected = await inspectBackup(buffer, password);
  if (inspected.manifest.type === 'PLATFORM_FULL') {
    await importPlatformBackup(tenant.id, buffer, password);
    return NextResponse.redirect(publicAppUrl('/companies'), 303);
  }
  const company = await importCompanyAsNew(tenant.id, buffer, password);
  return NextResponse.redirect(publicAppUrl(`/companies/${company.id}`), 303);
}
