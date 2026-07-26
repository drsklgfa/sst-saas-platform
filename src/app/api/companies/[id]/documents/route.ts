import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getDefaultSections } from '@/domain/documents/default-sections';
import { parseTemplateSchema } from '@/domain/documents/templates';
import { randomToken } from '@/lib/crypto';
import { audit } from '@/lib/audit';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('document.edit');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const company = await db.company.findFirst({ where: { id, tenantId: tenant.id } });
  if (!company) return new Response('Não encontrado', { status: 404 });

  const form = await request.formData();
  const typeId = String(form.get('documentTypeId') ?? '');
  const templateVersionId = String(form.get('templateVersionId') ?? '').trim() || null;
  const type = await db.documentType.findFirst({ where: { id: typeId, tenantId: tenant.id, active: true } });
  if (!type) return new Response('Tipo de documento inválido', { status: 400 });

  const templateVersion = templateVersionId
    ? await db.documentTemplateVersion.findFirst({
        where: {
          id: templateVersionId,
          publishedAt: { not: null },
          template: { tenantId: tenant.id, documentTypeId: type.id, active: true },
        },
      })
    : null;
  if (templateVersionId && !templateVersion) return new Response('Modelo publicado inválido para este tipo de documento', { status: 400 });

  const title = String(form.get('title') ?? '').trim() || `${type.name} — ${company.tradeName ?? company.legalName}`;
  const referenceYear = Number(form.get('referenceYear')) || new Date().getFullYear();
  const sections = templateVersion ? parseTemplateSchema(templateVersion.schema).sections : getDefaultSections(type.code);
  if (!sections.length) return new Response('O modelo selecionado não possui seções válidas', { status: 400 });

  const document = await db.document.create({
    data: {
      companyId: id,
      documentTypeId: type.id,
      templateVersionId: templateVersion?.id,
      title,
      referenceYear,
      status: 'DRAFT',
      currentVersion: 1,
      verificationCode: randomToken(12),
      versions: {
        create: {
          version: 1,
          status: 'DRAFT',
          content: { title, documentTypeCode: type.code },
          createdById: user.id,
          sections: {
            create: sections.map((section, position) => ({
              code: section.code,
              title: section.title,
              position,
              enabled: true,
              content: { html: section.html },
            })),
          },
        },
      },
    },
  });
  await audit({ tenantId: tenant.id, companyId: company.id, userId: user.id, action: 'DOCUMENT_CREATED', entityType: 'Document', entityId: document.id, after: { title, type: type.code, referenceYear, templateVersionId: templateVersion?.id } });
  return NextResponse.redirect(publicAppUrl(`/documents/${document.id}`), 303);
}
