import { publicAppUrl } from '@/lib/public-url';
import { headers } from 'next/headers';
import { authorizeTenantApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { sha256 } from '@/lib/crypto';
import { enqueueJob } from '@/lib/jobs';
import { audit } from '@/lib/audit';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('document.sign');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const document = await db.document.findFirst({ where: { id, company: { tenantId: tenant.id } } });
  if (!document) return new Response('Documento não encontrado', { status: 404 });
  const version = await db.documentVersion.findUnique({
    where: { documentId_version: { documentId: id, version: document.currentVersion } },
    include: { snapshot: true },
  });
  if (!version?.snapshot) return new Response('Gere a prévia antes de registrar a aprovação.', { status: 409 });
  if (['ISSUED_SIGNED', 'ISSUED_UNSIGNED', 'REPLACED', 'CANCELLED', 'ARCHIVED'].includes(version.status)) {
    return new Response('Esta revisão já foi encerrada.', { status: 409 });
  }

  const form = await request.formData();
  const signerName = String(form.get('signerName') ?? '').trim();
  const registration = String(form.get('registration') ?? '').trim() || null;
  const signatureRole = String(form.get('signatureRole') ?? 'RESPONSIBLE_TECH').trim() || 'RESPONSIBLE_TECH';
  if (signerName.length < 3) return new Response('Nome do responsável obrigatório', { status: 400 });
  const duplicate = await db.signature.findFirst({ where: { documentVersionId: version.id, signerName, signerRegistration: registration, signedAt: { not: null } } });
  if (duplicate) return new Response('Esta aprovação já foi registrada nesta revisão.', { status: 409 });

  const requestHeaders = await headers();
  const signature = await db.signature.create({
    data: {
      documentId: document.id,
      documentVersionId: version.id,
      versionNumber: version.version,
      method: 'INTERNAL',
      signerName,
      signerRegistration: registration,
      signatureRole,
      signedById: user.id,
      signedAt: new Date(),
      ipHash: sha256(requestHeaders.get('x-forwarded-for') ?? 'unknown'),
      documentHash: version.snapshot.dataHash,
      metadata: { declaration: 'O responsável confirmou a aprovação do snapshot imutável desta revisão.' },
    },
  });
  await db.documentVersion.update({ where: { id: version.id }, data: { status: 'WAITING_SIGNATURE' } });
  await db.document.update({ where: { id: document.id }, data: { status: 'WAITING_SIGNATURE' } });
  await enqueueJob(tenant.id, 'DOCUMENT_GENERATE', { documentId: document.id, version: version.version, userId: user.id, official: false });
  await audit({ tenantId: tenant.id, companyId: document.companyId, userId: user.id, action: 'DOCUMENT_VERSION_SIGNED_INTERNAL', entityType: 'Signature', entityId: signature.id, after: { version: version.version, signerName, registration, snapshotHash: version.snapshot.dataHash } });
  return NextResponse.redirect(publicAppUrl(`/documents/${document.id}`), 303);
}
