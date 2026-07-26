import Link from 'next/link';
import { requireCompanyPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, Input, Textarea, Button, Badge } from '@/components/ui';
import { hasCompanyPermission } from '@/lib/rbac';
import { conversationCategories } from '@/domain/communication/validation';
import { formatDate } from '@/lib/utils';

export default async function PortalMessages({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, access, company } = await requireCompanyPermission(id, 'message.read');
  const canCreate = hasCompanyPermission(access.role, 'message.create', access.permissions);
  const conversations = await db.conversation.findMany({
    where: { companyId: id, participants: { some: { userId: user.id } } },
    include: { participants: { where: { userId: user.id } }, messages: { where: { internal: false }, take: 1, orderBy: { createdAt: 'desc' } } },
    orderBy: { lastMessageAt: 'desc' },
  });

  return <main className="shell min-h-screen p-6"><div className="mx-auto max-w-5xl"><div className="flex justify-between"><div><h1 className="text-3xl font-bold">Mensagens</h1><p className="text-slate-500">{company.tradeName ?? company.legalName}</p></div><Link href={`/portal/company/${id}`} className="text-brand-700">Voltar</Link></div>
    <div className={`mt-6 grid gap-6 ${canCreate ? 'lg:grid-cols-[380px_1fr]' : ''}`}>{canCreate && <Card><h2 className="font-bold">Nova conversa</h2><form action={`/api/portal/companies/${id}/conversations`} method="post" encType="multipart/form-data" className="mt-4 space-y-4"><label className="block text-sm font-medium">Assunto<Input name="subject" required maxLength={200} className="mt-1" /></label><label className="block text-sm font-medium">Categoria<select name="category" className="mt-1 w-full rounded-xl border border-slate-300 p-2.5">{conversationCategories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="block text-sm font-medium">Mensagem<Textarea name="body" required maxLength={20000} rows={6} className="mt-1" /></label><label className="block text-sm font-medium">Anexos<Input name="attachments" type="file" multiple className="mt-1" /></label><Button className="w-full">Enviar à consultoria</Button></form></Card>}
      <Card><h2 className="font-bold">Conversas</h2><div className="mt-3 divide-y">{conversations.map((conversation) => { const latest = conversation.messages[0]; const participant = conversation.participants[0]; const unread = Boolean(latest && (!participant?.lastReadAt || latest.createdAt > participant.lastReadAt)); return <Link href={`/portal/messages/${conversation.id}`} key={conversation.id} className={`block py-3 ${unread ? 'bg-brand-50/40' : ''}`}><div className="flex justify-between gap-3"><div><div className="flex items-center gap-2"><p className="font-medium">{conversation.subject}</p>{unread && <Badge tone="warning">Nova</Badge>}</div><p className="text-sm text-slate-500">{latest?.body.slice(0,100) ?? 'Sem mensagens'}</p><p className="mt-1 text-xs text-slate-400">{formatDate(conversation.lastMessageAt)}</p></div><Badge>{conversation.status}</Badge></div></Link>; })}{!conversations.length && <p className="py-4 text-sm text-slate-500">Nenhuma conversa iniciada.</p>}</div></Card></div></div></main>;
}
