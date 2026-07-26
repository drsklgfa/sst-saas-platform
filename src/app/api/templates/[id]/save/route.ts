import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { validateTemplateSchema } from '@/domain/documents/templates';
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
  const version = template.versions[0];
  if (!version || version.publishedAt) return new Response('A versão publicada é imutável. Crie uma nova versão.', { status: 409 });
  const form = await request.formData();
  const count = Math.min(60, Math.max(0, Number(form.get('sectionCount')) || 0));
  const sections = Array.from({ length: count }, (_, index) => ({
    code: String(form.get(`code_${index}`) ?? '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
    title: String(form.get(`title_${index}`) ?? '').trim(),
    html: String(form.get(`html_${index}`) ?? '').trim(),
  })).filter((section) => section.code && section.title);
  const schema = { sections };
  const errors = validateTemplateSchema(schema);
  if (errors.length) return new Response(errors.join('\n'), { status: 400 });
  await db.documentTemplateVersion.update({ where: { id: version.id }, data: { schema: toPrismaJson(schema) } });
  await audit({ tenantId: tenant.id, userId: user.id, action: 'DOCUMENT_TEMPLATE_VERSION_UPDATED', entityType: 'DocumentTemplateVersion', entityId: version.id, after: { version: version.version, sections: sections.length } });
  return NextResponse.redirect(publicAppUrl(`/settings/templates/${id}`), 303);
}
