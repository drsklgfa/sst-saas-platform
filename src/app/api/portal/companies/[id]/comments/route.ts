import { publicAppUrl } from '@/lib/public-url';
import { authorizeCompanyApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { resolveCommentEntity } from '@/domain/communication/entities';
import { requiredCommunicationText, safeReturnTo } from '@/domain/communication/validation';
import { db } from '@/lib/db';
import { saveFile } from '@/lib/files';
import { notifyTenantPermission } from '@/lib/notifications';
import { NextResponse } from 'next/server';

const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain']);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeCompanyApi(id, 'message.reply');
  if (authorization instanceof Response) return authorization;
  const { company, user } = authorization;
  const form = await request.formData();
  const entityType = String(form.get('entityType') ?? '');
  const entityId = String(form.get('entityId') ?? '');
  const entity = await resolveCommentEntity(id, entityType, entityId);
  if (!entity) return new Response('Referência inválida', { status: 400 });
  const body = requiredCommunicationText(form.get('body'), 'Comentário', 5000);
  const files = form.getAll('attachments').filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length > 3) return new Response('Envie no máximo 3 anexos', { status: 400 });
  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) return new Response('Anexo maior que 10 MB', { status: 413 });
    if (file.type && !allowed.has(file.type)) return new Response('Tipo de anexo não permitido', { status: 415 });
  }
  const comment = await db.entityComment.create({ data: { tenantId: company.tenantId, companyId: id, userId: user.id, entityType, entityId, body, internal: false } });
  for (const file of files) {
    const saved = await saveFile({ tenantId: company.tenantId, companyId: id, originalName: file.name, mimeType: file.type || 'application/octet-stream', data: Buffer.from(await file.arrayBuffer()), createdById: user.id, visibility: 'COMPANY', metadata: { purpose: 'COMMENT_ATTACHMENT', commentId: comment.id } });
    await db.commentAttachment.create({ data: { commentId: comment.id, fileId: saved.id } });
  }
  await notifyTenantPermission(company.tenantId, 'message.manage', { type: entityType === 'DOCUMENT' ? 'REPORT' : 'ACTION', title: `Comentário do cliente: ${entity.label}`, body: body.slice(0, 180), href: entityType === 'ACTION' ? `/companies/${id}/actions` : `/companies/${id}`, companyId: id, metadata: { entityType, entityId, commentId: comment.id } }, [user.id]);
  await audit({ tenantId: company.tenantId, companyId: id, userId: user.id, action: 'CLIENT_COMMENT', entityType, entityId, after: { commentId: comment.id, attachmentCount: files.length } });
  return NextResponse.redirect(publicAppUrl(safeReturnTo(form.get('returnTo'), `/portal/company/${id}`)), 303);
}
