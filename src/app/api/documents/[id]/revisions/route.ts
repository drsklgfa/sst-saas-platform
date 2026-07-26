import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { toPrismaJson } from '@/lib/prisma-json';
import { audit } from '@/lib/audit';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('document.edit');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const document = await db.document.findFirst({ where: { id, company: { tenantId: tenant.id } } });
  if (!document) return new Response('Documento não encontrado', { status: 404 });
  const current = await db.documentVersion.findUnique({
    where: { documentId_version: { documentId: id, version: document.currentVersion } },
    include: { sections: { orderBy: { position: 'asc' } } },
  });
  if (!current) return new Response('Revisão atual não encontrada', { status: 404 });
  if (current.status === 'WAITING_DOCUMENTS') return new Response('A emissão oficial está em processamento. Aguarde a conclusão antes de criar uma nova revisão.', { status: 409 });
  if (['DRAFT', 'REVIEW'].includes(current.status) && !current.snapshotId) {
    return NextResponse.redirect(publicAppUrl(`/documents/${id}`), 303);
  }
  const nextVersion = document.currentVersion + 1;
  const justification = String((await request.formData()).get('justification') ?? '').trim();
  const created = await db.$transaction(async (transaction) => {
    const version = await transaction.documentVersion.create({
      data: {
        documentId: id,
        version: nextVersion,
        status: 'DRAFT',
        content: toPrismaJson(current.content),
        justification: justification || null,
        createdById: user.id,
        sections: {
          create: current.sections.map((section) => ({
            code: section.code,
            title: section.title,
            position: section.position,
            enabled: section.enabled,
            content: toPrismaJson(section.content),
          })),
        },
      },
    });
    await transaction.document.update({ where: { id }, data: { currentVersion: nextVersion, status: 'DRAFT' } });
    return version;
  });
  await audit({ tenantId: tenant.id, companyId: document.companyId, userId: user.id, action: 'DOCUMENT_REVISION_CREATED', entityType: 'DocumentVersion', entityId: created.id, after: { version: nextVersion, basedOn: current.version, justification } });
  return NextResponse.redirect(publicAppUrl(`/documents/${id}`), 303);
}
