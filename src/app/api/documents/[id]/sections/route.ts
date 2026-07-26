import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('document.edit');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const document = await db.document.findFirst({ where: { id, company: { tenantId: tenant.id } } });
  if (!document) return new Response('Documento não encontrado', { status: 404 });
  const latest = await db.documentVersion.findUnique({
    where: { documentId_version: { documentId: id, version: document.currentVersion } },
    include: { sections: true, snapshot: true },
  });
  if (!latest) return new Response('Versão não encontrada', { status: 404 });
  if (latest.snapshot || !['DRAFT', 'REVIEW'].includes(latest.status)) {
    return new Response('Esta revisão está congelada. Crie uma nova revisão para alterar o conteúdo.', { status: 409 });
  }
  const form = await request.formData();
  const before = latest.sections.map((section) => ({ id: section.id, title: section.title, enabled: section.enabled, content: section.content }));
  await db.$transaction(latest.sections.map((section) => db.documentSection.update({
    where: { id: section.id },
    data: {
      title: String(form.get(`title_${section.id}`) ?? section.title).trim() || section.title,
      enabled: form.get(`enabled_${section.id}`) === 'on',
      content: { html: String(form.get(`html_${section.id}`) ?? '') },
    },
  })));
  await audit({ tenantId: tenant.id, companyId: document.companyId, userId: user.id, action: 'DOCUMENT_SECTIONS_UPDATED', entityType: 'DocumentVersion', entityId: latest.id, before, after: { version: latest.version, changedSections: latest.sections.length } });
  return NextResponse.redirect(publicAppUrl(`/documents/${id}`), 303);
}
