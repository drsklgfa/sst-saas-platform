import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { validateTemplateSchema } from '@/domain/documents/templates';
import { audit } from '@/lib/audit';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('settings.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const template = await db.documentTemplate.findFirst({ where: { id, tenantId: tenant.id }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } });
  if (!template) return new Response('Modelo não encontrado', { status: 404 });
  const version = template.versions[0];
  if (!version) return new Response('Versão não encontrada', { status: 404 });
  if (version.publishedAt) return NextResponse.redirect(publicAppUrl(`/settings/templates/${id}`), 303);
  const errors = validateTemplateSchema(version.schema);
  if (errors.length) return new Response(errors.join('\n'), { status: 400 });
  await db.documentTemplateVersion.update({ where: { id: version.id }, data: { publishedAt: new Date() } });
  await audit({ tenantId: tenant.id, userId: user.id, action: 'DOCUMENT_TEMPLATE_VERSION_PUBLISHED', entityType: 'DocumentTemplateVersion', entityId: version.id, after: { version: version.version } });
  return NextResponse.redirect(publicAppUrl(`/settings/templates/${id}`), 303);
}
