import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { auditDocumentSnapshot } from '@/domain/documents/audit';
import { db } from '@/lib/db';
import { toPrismaJson } from '@/lib/prisma-json';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('document.edit');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const document = await db.document.findFirst({ where: { id, company: { tenantId: tenant.id } } });
  if (!document) return new Response('Documento não encontrado', { status: 404 });
  const version = await db.documentVersion.findUnique({
    where: { documentId_version: { documentId: id, version: document.currentVersion } },
    include: { snapshot: true, signatures: { where: { signedAt: { not: null } } } },
  });
  if (!version?.snapshot) return new Response('Gere a prévia para criar o snapshot auditável.', { status: 409 });
  const result = auditDocumentSnapshot(version.snapshot.data, { signatureCount: version.signatures.length });
  await db.documentAuditRun.create({ data: { documentVersionId: version.id, status: result.status, results: toPrismaJson(result.checks), warningCount: result.warningCount, errorCount: result.errorCount, createdById: user.id } });
  await db.documentVersion.update({ where: { id: version.id }, data: { warnings: toPrismaJson(result.checks.filter((item) => item.severity !== 'PASS').map((item) => `${item.title}: ${item.message}`)) } });
  return NextResponse.redirect(publicAppUrl(`/documents/${id}`), 303);
}
