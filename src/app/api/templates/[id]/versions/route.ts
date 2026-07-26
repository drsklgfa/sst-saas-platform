import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { toPrismaJson } from '@/lib/prisma-json';
import { audit } from '@/lib/audit';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('settings.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const template = await db.documentTemplate.findFirst({ where: { id, tenantId: tenant.id }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } });
  if (!template) return new Response('Modelo não encontrado', { status: 404 });
  const latest = template.versions[0];
  if (!latest?.publishedAt) return new Response('Publique a versão em rascunho antes de criar outra.', { status: 409 });
  const created = await db.documentTemplateVersion.create({ data: { templateId: id, version: latest.version + 1, schema: toPrismaJson(latest.schema), styles: toPrismaJson(latest.styles), variables: toPrismaJson(latest.variables), regulatoryPackage: toPrismaJson(latest.regulatoryPackage) } });
  await audit({ tenantId: tenant.id, userId: user.id, action: 'DOCUMENT_TEMPLATE_VERSION_CREATED', entityType: 'DocumentTemplateVersion', entityId: created.id, after: { version: created.version, basedOn: latest.version } });
  return NextResponse.redirect(publicAppUrl(`/settings/templates/${id}`), 303);
}
