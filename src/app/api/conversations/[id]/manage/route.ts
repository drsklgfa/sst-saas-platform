import { publicAppUrl } from '@/lib/public-url';
import type { ConversationStatus } from '@prisma/client';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { conversationPriorities, conversationStatuses } from '@/domain/communication/validation';
import { conversationHrefForUser, notifyUsers } from '@/lib/notifications';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('message.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const before = await db.conversation.findFirst({ where: { id, tenantId: tenant.id }, include: { participants: true, company: true } });
  if (!before) return new Response('Conversa não encontrada', { status: 404 });
  const form = await request.formData();
  const status = String(form.get('status') ?? before.status) as ConversationStatus;
  const priority = String(form.get('priority') ?? before.priority);
  const assignedToId = String(form.get('assignedToId') ?? '').trim() || null;
  if (!conversationStatuses.has(status)) return new Response('Situação inválida', { status: 400 });
  if (!conversationPriorities.includes(priority as (typeof conversationPriorities)[number])) return new Response('Prioridade inválida', { status: 400 });
  if (assignedToId) {
    const assignee = await db.membership.findFirst({ where: { tenantId: tenant.id, userId: assignedToId, active: true, user: { active: true } }, select: { userId: true } });
    if (!assignee) return new Response('Responsável inválido', { status: 400 });
  }
  const updated = await db.conversation.update({
    where: { id },
    data: {
      status,
      priority,
      assignedToId,
      resolvedAt: status === 'RESOLVED' ? new Date() : status === 'REOPENED' ? null : before.resolvedAt,
      archivedAt: status === 'ARCHIVED' ? new Date() : status === 'REOPENED' ? null : before.archivedAt,
    },
  });
  if (assignedToId) {
    await db.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId: id, userId: assignedToId } },
      update: {},
      create: { conversationId: id, userId: assignedToId },
    });
    if (assignedToId !== user.id && assignedToId !== before.assignedToId) {
      await notifyUsers([assignedToId], { type: 'MESSAGE', title: `Conversa atribuída: ${before.subject}`, body: before.company?.legalName ?? 'Conversa interna', href: `/messages/${id}`, companyId: before.companyId, metadata: { conversationId: id } });
    }
  }
  if (status !== before.status) {
    for (const participant of before.participants.filter((candidate) => candidate.userId !== user.id && !candidate.muted)) {
      const href = await conversationHrefForUser(participant.userId, id, before.tenantId, before.companyId);
      if (href) await notifyUsers([participant.userId], { type: 'MESSAGE', title: `Conversa atualizada: ${before.subject}`, body: `Nova situação: ${status}`, href, companyId: before.companyId, metadata: { conversationId: id, status } });
    }
  }
  await audit({ tenantId: tenant.id, companyId: before.companyId ?? undefined, userId: user.id, action: 'UPDATE', entityType: 'Conversation', entityId: id, before, after: updated });
  return NextResponse.redirect(publicAppUrl(`/messages/${id}`), 303);
}
