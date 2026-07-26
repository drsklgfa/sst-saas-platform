import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { resolveCommentEntity } from '@/domain/communication/entities';
import { requiredCommunicationText } from '@/domain/communication/validation';
import { db } from '@/lib/db';
import { saveFile } from '@/lib/files';
import { notifyUsers } from '@/lib/notifications';
import { hasCompanyPermission } from '@/lib/rbac';
import { safeReturnTo } from '@/domain/communication/validation';
import { NextResponse } from 'next/server';

const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain']);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('message.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const company = await db.company.findFirst({ where: { id, tenantId: tenant.id } });
  if (!company) return new Response('Empresa não encontrada', { status: 404 });
  const form = await request.formData();
  const entityType = String(form.get('entityType') ?? '');
  const entityId = String(form.get('entityId') ?? '');
  const entity = await resolveCommentEntity(id, entityType, entityId);
  if (!entity) return new Response('Referência inválida', { status: 400 });
  const body = requiredCommunicationText(form.get('body'), 'Comentário', 5000);
  const internal = form.get('internal') === 'true';
  const files = form.getAll('attachments').filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length > 3) return new Response('Envie no máximo 3 anexos', { status: 400 });
  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) return new Response('Anexo maior que 10 MB', { status: 413 });
    if (file.type && !allowed.has(file.type)) return new Response('Tipo de anexo não permitido', { status: 415 });
  }
  const comment = await db.entityComment.create({ data: { tenantId: tenant.id, companyId: id, userId: user.id, entityType, entityId, body, internal } });
  for (const file of files) {
    const saved = await saveFile({ tenantId: tenant.id, companyId: id, originalName: file.name, mimeType: file.type || 'application/octet-stream', data: Buffer.from(await file.arrayBuffer()), createdById: user.id, visibility: internal ? 'PRIVATE' : 'COMPANY', metadata: { purpose: 'COMMENT_ATTACHMENT', commentId: comment.id } });
    await db.commentAttachment.create({ data: { commentId: comment.id, fileId: saved.id } });
  }
  if (!internal) {
    const accesses = await db.companyAccess.findMany({ where: { companyId: id, active: true, user: { active: true } }, select: { userId: true, role: true, permissions: true } });
    await notifyUsers(accesses.filter((access) => hasCompanyPermission(access.role, 'message.read', access.permissions)).map((access) => access.userId), { type: entityType === 'DOCUMENT' ? 'REPORT' : 'ACTION', title: `Novo comentário: ${entity.label}`, body: body.slice(0, 180), href: `/portal/company/${id}`, companyId: id, metadata: { entityType, entityId, commentId: comment.id } });
  }
  await audit({ tenantId: tenant.id, companyId: id, userId: user.id, action: internal ? 'INTERNAL_COMMENT' : 'COMMENT', entityType, entityId, after: { commentId: comment.id, attachmentCount: files.length } });
  return NextResponse.redirect(publicAppUrl(safeReturnTo(form.get('returnTo'), `/companies/${id}`)), 303);
}
