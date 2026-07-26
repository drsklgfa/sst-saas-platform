import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { getDefaultSections } from '@/domain/documents/default-sections';
import { audit } from '@/lib/audit';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const authorization = await authorizeTenantApi('settings.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const form = await request.formData();
  const name = String(form.get('name') ?? '').trim();
  const documentTypeId = String(form.get('documentTypeId') ?? '').trim();
  if (name.length < 3) return new Response('Nome do modelo inválido', { status: 400 });
  const type = await db.documentType.findFirst({ where: { id: documentTypeId, tenantId: tenant.id, active: true } });
  if (!type) return new Response('Tipo de documento inválido', { status: 400 });
  const duplicate = await db.documentTemplate.findFirst({ where: { tenantId: tenant.id, documentTypeId, name: { equals: name, mode: 'insensitive' }, active: true } });
  if (duplicate) return new Response('Já existe um modelo ativo com este nome para o tipo escolhido.', { status: 409 });
  const template = await db.documentTemplate.create({
    data: {
      tenantId: tenant.id,
      documentTypeId,
      name,
      description: String(form.get('description') ?? '').trim() || null,
      versions: { create: { version: 1, schema: { sections: getDefaultSections(type.code) }, styles: {}, variables: [], regulatoryPackage: {} } },
    },
  });
  await audit({ tenantId: tenant.id, userId: user.id, action: 'DOCUMENT_TEMPLATE_CREATED', entityType: 'DocumentTemplate', entityId: template.id, after: { name, type: type.code } });
  return NextResponse.redirect(publicAppUrl(`/settings/templates/${template.id}`), 303);
}
