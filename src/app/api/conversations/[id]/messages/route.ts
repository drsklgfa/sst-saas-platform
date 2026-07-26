import { publicAppUrl } from '@/lib/public-url';
import { getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { saveFile } from '@/lib/files';
import { conversationHrefForUser, notifyUsers } from '@/lib/notifications';
import { hasCompanyPermission, hasTenantPermission } from '@/lib/rbac';
import { NextResponse } from 'next/server';

const allowedAttachments = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response('Não autenticado', { status: 401 });

  const conversation = await db.conversation.findUnique({
    where: { id },
    include: { participants: true, company: true },
  });
  if (!conversation || !conversation.participants.some((participant) => participant.userId === user.id)) {
    return new Response('Acesso negado', { status: 403 });
  }

  const membership = user.memberships.find((candidate) => candidate.tenantId === conversation.tenantId);
  const companyAccess = conversation.companyId
    ? user.companyAccesses.find((candidate) => candidate.companyId === conversation.companyId)
    : undefined;
  const internalAuthorized = Boolean(membership && hasTenantPermission(membership.role, 'message.manage', membership.permissions));
  const companyAuthorized = Boolean(companyAccess && hasCompanyPermission(companyAccess.role, 'message.reply', companyAccess.permissions));
  if (!internalAuthorized && !companyAuthorized) return new Response('Acesso negado', { status: 403 });

  const form = await request.formData();
  const body = String(form.get('body') ?? '').trim();
  if (!body || body.length > 20_000) return new Response('Mensagem inválida', { status: 400 });
  const internal = internalAuthorized && form.get('internal') === 'true';
  const attachments = form.getAll('attachments').filter((value): value is File => value instanceof File && value.size > 0);
  if (attachments.length > 5) return new Response('Envie no máximo 5 anexos por mensagem', { status: 400 });
  for (const file of attachments) {
    if (file.size > 10 * 1024 * 1024) return new Response(`O arquivo ${file.name} excede 10 MB`, { status: 413 });
    if (file.type && !allowedAttachments.has(file.type)) return new Response(`Tipo não permitido: ${file.name}`, { status: 415 });
  }

  const message = await db.message.create({ data: { conversationId: id, userId: user.id, body, internal } });
  for (const file of attachments) {
    const saved = await saveFile({
      tenantId: conversation.tenantId,
      companyId: conversation.companyId ?? undefined,
      originalName: file.name,
      mimeType: file.type || 'application/octet-stream',
      data: Buffer.from(await file.arrayBuffer()),
      createdById: user.id,
      visibility: conversation.companyId && !internal ? 'COMPANY' : 'PRIVATE',
      metadata: { purpose: 'MESSAGE_ATTACHMENT', conversationId: id, messageId: message.id },
    });
    await db.messageAttachment.create({ data: { messageId: message.id, fileId: saved.id } });
  }

  const nextStatus = internal
    ? conversation.status
    : internalAuthorized
      ? 'WAITING_COMPANY'
      : 'WAITING_CONSULTANT';
  await db.$transaction([
    db.conversation.update({
      where: { id },
      data: {
        lastMessageAt: new Date(),
        status: nextStatus,
        ...(!internal && (conversation.status === 'RESOLVED' || conversation.status === 'ARCHIVED') ? { status: 'REOPENED', archivedAt: null, resolvedAt: null } : {}),
      },
    }),
    db.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: id, userId: user.id } },
      data: { lastReadAt: new Date() },
    }),
  ]);

  if (!internal) {
    for (const participant of conversation.participants.filter((candidate) => candidate.userId !== user.id && !candidate.muted)) {
      const href = await conversationHrefForUser(participant.userId, id, conversation.tenantId, conversation.companyId);
      if (!href) continue;
      await notifyUsers([participant.userId], {
        type: 'MESSAGE',
        title: conversation.subject,
        body: body.slice(0, 180),
        href,
        companyId: conversation.companyId,
        metadata: { conversationId: id, messageId: message.id },
      });
    }
  }
  await audit({ tenantId: conversation.tenantId, companyId: conversation.companyId ?? undefined, userId: user.id, action: internal ? 'INTERNAL_NOTE' : 'MESSAGE', entityType: 'Conversation', entityId: id, after: { messageId: message.id, attachmentCount: attachments.length } });

  return NextResponse.redirect(publicAppUrl(internalAuthorized ? `/messages/${id}` : `/portal/messages/${id}`), 303);
}
