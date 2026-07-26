import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, Textarea, Button, Badge, Input } from '@/components/ui';
import { hasCompanyPermission } from '@/lib/rbac';
import { formatDate } from '@/lib/utils';

export default async function PortalThread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const conversation = await db.conversation.findFirst({
    where: { id, participants: { some: { userId: user.id } }, companyId: { not: null } },
    include: { company: true, messages: { where: { internal: false }, include: { user: true, attachments: { include: { file: true } } }, orderBy: { createdAt: 'asc' } } },
  });
  if (!conversation?.companyId) notFound();
  const access = user.companyAccesses.find((candidate) => candidate.companyId === conversation.companyId);
  if (!access || !hasCompanyPermission(access.role, 'message.read', access.permissions)) notFound();
  const canReply = hasCompanyPermission(access.role, 'message.reply', access.permissions);
  await db.conversationParticipant.updateMany({ where: { conversationId: id, userId: user.id }, data: { lastReadAt: new Date() } });

  return <main className="shell min-h-screen p-6"><div className="mx-auto max-w-4xl"><div className="flex flex-wrap justify-between gap-3"><div><a href={`/portal/company/${conversation.companyId}/messages`} className="text-sm text-brand-700">← Voltar às conversas</a><h1 className="mt-1 text-2xl font-bold">{conversation.subject}</h1><p className="text-slate-500">{conversation.company?.legalName}</p></div><Badge>{conversation.status}</Badge></div>
    <Card className="mt-6"><div className="space-y-4">{conversation.messages.map((message) => <div key={message.id} className={`max-w-[88%] rounded-2xl p-3 ${message.userId === user.id ? 'ml-auto bg-brand-600 text-white' : 'bg-slate-100'}`}><div className="flex justify-between gap-3"><p className="text-xs opacity-70">{message.user?.name ?? 'Consultoria'}</p><p className="text-xs opacity-60">{formatDate(message.createdAt)}</p></div><p className="mt-1 whitespace-pre-wrap">{message.body}</p>{message.attachments.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{message.attachments.map((attachment) => <a key={attachment.id} href={`/api/files/local?key=${encodeURIComponent(attachment.file.storageKey)}`} target="_blank" className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${message.userId === user.id ? 'bg-white/20 text-white' : 'bg-white text-brand-700'}`}>{attachment.file.originalName}</a>)}</div>}</div>)}</div>{canReply && <form action={`/api/conversations/${conversation.id}/messages`} method="post" encType="multipart/form-data" className="mt-6"><Textarea name="body" required maxLength={20000} rows={4} placeholder="Escreva sua resposta..." /><Input name="attachments" type="file" multiple className="mt-2" /><Button className="mt-3">Responder</Button></form>}</Card></div></main>;
}
