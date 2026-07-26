import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { auditDocumentSnapshot } from '@/domain/documents/audit';
import { db } from '@/lib/db';
import { enqueueJob } from '@/lib/jobs';
import { toPrismaJson } from '@/lib/prisma-json';
import { audit } from '@/lib/audit';
import { notifyUsers } from '@/lib/notifications';
import { hasCompanyPermission } from '@/lib/rbac';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('document.issue');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const document = await db.document.findFirst({ where: { id, company: { tenantId: tenant.id } } });
  if (!document) return new Response('Documento não encontrado', { status: 404 });
  const version = await db.documentVersion.findUnique({
    where: { documentId_version: { documentId: id, version: document.currentVersion } },
    include: { snapshot: true, signatures: { where: { signedAt: { not: null } } }, files: { include: { fileObject: true }, orderBy: { createdAt: 'desc' } } },
  });
  if (!version?.snapshot) return new Response('Gere uma prévia antes da emissão.', { status: 409 });
  if (['ISSUED_SIGNED', 'ISSUED_UNSIGNED'].includes(version.status)) return new Response('Esta revisão já foi emitida.', { status: 409 });

  const form = await request.formData();
  const justification = String(form.get('justification') ?? '').trim();
  const result = auditDocumentSnapshot(version.snapshot.data, { signatureCount: version.signatures.length });
  if (result.errorCount > 0 && justification.length < 15) {
    return new Response('A auditoria encontrou pendências críticas. Informe uma justificativa técnica com pelo menos 15 caracteres para prosseguir.', { status: 409 });
  }
  await db.documentAuditRun.create({ data: { documentVersionId: version.id, status: result.status, results: toPrismaJson(result.checks), warningCount: result.warningCount, errorCount: result.errorCount, createdById: user.id } });

  const signatureCount = version.signatures.length;
  const uploadedSigned = version.files.find((file) => file.format === 'PDF_SIGNED' && file.snapshotHash === version.snapshot?.dataHash && file.signatureCount === signatureCount);
  const now = new Date();
  if (uploadedSigned) {
    await db.$transaction([
      db.documentFile.updateMany({ where: { documentId: id, official: true }, data: { official: false } }),
      db.documentFile.update({ where: { id: uploadedSigned.id }, data: { official: true } }),
      db.fileObject.update({ where: { id: uploadedSigned.fileObjectId }, data: { visibility: 'COMPANY' } }),
      db.document.update({ where: { id }, data: { status: 'ISSUED_SIGNED', releasedToCompany: true, releasedVersion: version.version, releasedAt: now } }),
      db.documentVersion.update({ where: { id: version.id }, data: { status: 'ISSUED_SIGNED', issuedAt: now, releasedAt: now, justification: justification || version.justification } }),
    ]);
    const accesses = await db.companyAccess.findMany({ where: { companyId: document.companyId, active: true, user: { active: true } }, select: { userId: true, role: true, permissions: true } });
    await notifyUsers(accesses.filter((access) => hasCompanyPermission(access.role, 'document.read', access.permissions)).map((access) => access.userId), { type: 'REPORT', title: `Documento liberado: ${document.title}`, body: `Revisão ${version.version}`, href: `/portal/company/${document.companyId}`, companyId: document.companyId, metadata: { documentId: id, version: version.version } });
  } else {
    await db.$transaction([
      db.document.update({ where: { id }, data: { status: 'WAITING_DOCUMENTS' } }),
      db.documentVersion.update({ where: { id: version.id }, data: { status: 'WAITING_DOCUMENTS', justification: justification || version.justification } }),
    ]);
    await enqueueJob(tenant.id, 'DOCUMENT_GENERATE', { documentId: id, version: version.version, userId: user.id, official: true, releaseAfterGenerate: true, justification });
  }
  await audit({ tenantId: tenant.id, companyId: document.companyId, userId: user.id, action: 'DOCUMENT_ISSUE_REQUESTED', entityType: 'DocumentVersion', entityId: version.id, after: { version: version.version, auditStatus: result.status, errors: result.errorCount, warnings: result.warningCount, externalSignedFile: Boolean(uploadedSigned), justification } });
  return NextResponse.redirect(publicAppUrl(`/documents/${id}`), 303);
}
