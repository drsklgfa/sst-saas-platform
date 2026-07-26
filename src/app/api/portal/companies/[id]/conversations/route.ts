import { publicAppUrl } from '@/lib/public-url';
import { authorizeCompanyApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { conversationCategories, requiredCommunicationText } from '@/domain/communication/validation';
import { db } from '@/lib/db';
import { saveFile } from '@/lib/files';
import { notifyUsers } from '@/lib/notifications';
import { NextResponse } from 'next/server';

const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain']);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeCompanyApi(id, 'message.create');
  if (authorization instanceof Response) return authorization;
  const { user, company } = authorization;

  const form = await request.formData();
  let subject: string;
  let body: string;
  try {
    subject = requiredCommunicationText(form.get('subject'), 'Assunto', 200);
    body = requiredCommunicationText(form.get('body'), 'Mensagem', 20_000);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Mensagem inválida', { status: 400 });
  }
  const categoryValue = String(form.get('category') ?? 'Outro');
  const category = conversationCategories.includes(categoryValue as (typeof conversationCategories)[number]) ? categoryValue : 'Outro';
  const relatedType = String(form.get('relatedType') ?? '').trim().slice(0, 80) || null;
  const relatedId = String(form.get('relatedId') ?? '').trim().slice(0, 100) || null;
  const attachments = form.getAll('attachments').filter((value): value is File => value instanceof File && value.size > 0);
  if (attachments.length > 3) return new Response('Envie no máximo 3 anexos', { status: 400 });
  for (const file of attachments) {
    if (file.size > 10 * 1024 * 1024) return new Response('Anexo maior que 10 MB', { status: 413 });
    if (file.type && !allowed.has(file.type)) return new Response('Tipo de anexo não permitido', { status: 415 });
  }

  const candidates = await db.membership.findMany({
    where: { tenantId: company.tenantId, active: true, role: { in: ['OWNER', 'ADMIN', 'CONSULTANT', 'ASSISTANT'] }, user: { active: true } },
    select: { userId: true, user: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const workloads = candidates.length ? await db.conversation.groupBy({
    by: ['assignedToId'],
    where: { tenantId: company.tenantId, assignedToId: { in: candidates.map((candidate) => candidate.userId) }, status: { notIn: ['RESOLVED', 'ARCHIVED'] } },
    _count: { _all: true },
  }) : [];
  const workloadMap = new Map<string | null, number>(
    workloads.map((row) => [row.assignedToId, row._count._all] as const),
  );
  const consultant = candidates.sort((a, b) => (workloadMap.get(a.userId) ?? 0) - (workloadMap.get(b.userId) ?? 0))[0];
  const participantIds = [...new Set([user.id, consultant?.userId].filter((value): value is string => Boolean(value)))];
  const conversation = await db.conversation.create({
    data: {
      tenantId: company.tenantId,
      companyId: id,
      subject,
      category,
      status: 'WAITING_CONSULTANT',
      assignedToId: consultant?.userId,
      relatedType,
      relatedId,
      participants: { create: participantIds.map((userId) => ({ userId, lastReadAt: userId === user.id ? new Date() : null })) },
      messages: { create: { userId: user.id, body, channel: 'PORTAL' } },
    },
    include: { messages: { take: 1, orderBy: { createdAt: 'asc' } } },
  });
  const firstMessage = conversation.messages[0];
  if (firstMessage) {
    for (const file of attachments) {
      const saved = await saveFile({ tenantId: company.tenantId, companyId: id, originalName: file.name, mimeType: file.type || 'application/octet-stream', data: Buffer.from(await file.arrayBuffer()), createdById: user.id, visibility: 'COMPANY', metadata: { purpose: 'MESSAGE_ATTACHMENT', conversationId: conversation.id, messageId: firstMessage.id } });
      await db.messageAttachment.create({ data: { messageId: firstMessage.id, fileId: saved.id } });
    }
  }
  if (consultant) {
    await notifyUsers([consultant.userId], { type: 'MESSAGE', title: `Nova mensagem: ${conversation.subject}`, body: `${company.legalName}: ${body.slice(0, 160)}`, href: `/messages/${conversation.id}`, companyId: id, metadata: { conversationId: conversation.id } });
  }
  await audit({ tenantId: company.tenantId, companyId: id, userId: user.id, action: 'CREATE', entityType: 'Conversation', entityId: conversation.id, after: { subject, category, assignedToId: consultant?.userId, attachmentCount: attachments.length } });
  return NextResponse.redirect(publicAppUrl(`/portal/messages/${conversation.id}`), 303);
}
