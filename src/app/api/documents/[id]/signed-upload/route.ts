import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { saveFile } from '@/lib/files';
import { toPrismaJson } from '@/lib/prisma-json';
import { audit } from '@/lib/audit';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('document.sign');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const document = await db.document.findFirst({ where: { id, company: { tenantId: tenant.id } }, include: { company: true } });
  if (!document) return new Response('Documento não encontrado', { status: 404 });
  const version = await db.documentVersion.findUnique({ where: { documentId_version: { documentId: id, version: document.currentVersion } }, include: { snapshot: true } });
  if (!version?.snapshot) return new Response('Gere a prévia antes de anexar o PDF assinado.', { status: 409 });
  if (['ISSUED_SIGNED', 'ISSUED_UNSIGNED', 'REPLACED', 'CANCELLED', 'ARCHIVED'].includes(version.status)) return new Response('Esta revisão já foi encerrada.', { status: 409 });

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || file.type !== 'application/pdf') return new Response('Envie um PDF assinado', { status: 400 });
  if (file.size > 50 * 1024 * 1024) return new Response('PDF maior que 50 MB', { status: 413 });
  const signerName = String(form.get('signerName') ?? 'Assinatura externa').trim() || 'Assinatura externa';
  const registration = String(form.get('registration') ?? '').trim() || null;
  const data = Buffer.from(await file.arrayBuffer());
  const saved = await saveFile({
    tenantId: tenant.id,
    companyId: document.companyId,
    originalName: file.name,
    mimeType: file.type,
    data,
    createdById: user.id,
    visibility: 'PRIVATE',
    metadata: { documentId: document.id, documentVersionId: version.id, versionNumber: version.version, snapshotHash: version.snapshot.dataHash, artifactType: 'PDF_SIGNED' },
  });
  const existingCount = await db.signature.count({ where: { documentVersionId: version.id, signedAt: { not: null } } });
  const signature = await db.signature.create({
    data: {
      documentId: document.id,
      documentVersionId: version.id,
      versionNumber: version.version,
      method: 'EXTERNAL_UPLOAD',
      signerName,
      signerRegistration: registration,
      signatureRole: 'RESPONSIBLE_TECH',
      signedById: user.id,
      signedAt: new Date(),
      documentHash: saved.sha256,
      metadata: toPrismaJson({ originalName: file.name, snapshotHash: version.snapshot.dataHash }),
    },
  });
  await db.$transaction([
    db.documentFile.create({
      data: {
        documentId: document.id,
        documentVersionId: version.id,
        versionNumber: version.version,
        fileObjectId: saved.id,
        format: 'PDF_SIGNED',
        official: false,
        snapshotHash: version.snapshot.dataHash,
        signatureCount: existingCount + 1,
        metadata: toPrismaJson({ uploaded: true, originalName: file.name }),
      },
    }),
    db.document.update({ where: { id: document.id }, data: { status: 'WAITING_SIGNATURE' } }),
    db.documentVersion.update({ where: { id: version.id }, data: { status: 'WAITING_SIGNATURE' } }),
  ]);
  await audit({ tenantId: tenant.id, companyId: document.companyId, userId: user.id, action: 'DOCUMENT_SIGNED_PDF_UPLOADED', entityType: 'Signature', entityId: signature.id, after: { version: version.version, fileId: saved.id, fileHash: saved.sha256, snapshotHash: version.snapshot.dataHash } });
  return NextResponse.redirect(publicAppUrl(`/documents/${document.id}`), 303);
}
