import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { createDocumentSnapshot } from '@/domain/reports/generate';
import { enqueueJob } from '@/lib/jobs';
import { audit } from '@/lib/audit';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('document.edit');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const document = await db.document.findFirst({ where: { id, company: { tenantId: tenant.id } } });
  if (!document) return new Response('Não encontrado', { status: 404 });
  try {
    const version = await createDocumentSnapshot(document.id, user.id);
    await enqueueJob(tenant.id, 'DOCUMENT_GENERATE', { documentId: document.id, version: version.version, userId: user.id, official: false });
    await audit({ tenantId: tenant.id, companyId: document.companyId, userId: user.id, action: 'DOCUMENT_PREVIEW_REQUESTED', entityType: 'DocumentVersion', entityId: version.id, metadata: { version: version.version } });
    return NextResponse.redirect(publicAppUrl(`/documents/${id}`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Não foi possível gerar a prévia', { status: 409 });
  }
}
