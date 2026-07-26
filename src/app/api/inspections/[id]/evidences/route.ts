import { publicAppUrl } from '@/lib/public-url';
import type { InspectionEvidenceKind } from '@prisma/client';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { saveFile } from '@/lib/files';
import { evidenceKinds, optionalText } from '@/domain/inspections/validation';
import { NextResponse } from 'next/server';

const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('inspection.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const inspection = await db.inspection.findFirst({ where: { id, company: { tenantId: tenant.id } }, include: { evidences: true } });
  if (!inspection) return new Response('Vistoria não encontrada', { status: 404 });
  if (inspection.status === 'REVIEWED') return new Response('Vistoria revisada é imutável.', { status: 409 });
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return new Response('Arquivo ausente', { status: 400 });
  if (file.size > 20 * 1024 * 1024) return new Response('Arquivo maior que 20 MB', { status: 413 });
  if (file.type && !allowed.has(file.type)) return new Response('Tipo de arquivo não permitido', { status: 415 });
  const kind = String(form.get('kind') ?? 'PHOTO') as InspectionEvidenceKind;
  if (!evidenceKinds.has(kind)) return new Response('Tipo de evidência inválido', { status: 400 });
  const saved = await saveFile({ tenantId: tenant.id, companyId: inspection.companyId, originalName: file.name, mimeType: file.type || 'application/octet-stream', data: Buffer.from(await file.arrayBuffer()), createdById: user.id, visibility: 'PRIVATE' });
  const evidence = await db.inspectionEvidence.create({ data: { inspectionId: id, fileId: saved.id, kind, caption: optionalText(form.get('caption'), 500), position: inspection.evidences.length + 1, createdById: user.id } });
  await audit({ tenantId: tenant.id, companyId: inspection.companyId, userId: user.id, action: 'CREATE', entityType: 'InspectionEvidence', entityId: evidence.id, after: evidence });
  return NextResponse.redirect(publicAppUrl(`/inspections/${id}`), 303);
}
