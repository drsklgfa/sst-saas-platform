import Link from 'next/link';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { conversationPriorities } from '@/domain/communication/validation';

const activeStatuses = ['NEW', 'IN_PROGRESS', 'WAITING_COMPANY', 'WAITING_CONSULTANT', 'REOPENED'] as const;
const statusTone = (status: string): 'neutral' | 'success' | 'warning' | 'danger' => status === 'RESOLVED' ? 'success' : status === 'ARCHIVED' ? 'neutral' : status === 'WAITING_CONSULTANT' || status === 'NEW' ? 'warning' : 'neutral';
const priorityTone = (priority: string): 'neutral' | 'success' | 'warning' | 'danger' => priority === 'URGENT' ? 'danger' : priority === 'HIGH' ? 'warning' : 'neutral';

export default async function Messages({ searchParams }: { searchParams: Promise<{ status?: string; priority?: string; company?: string; assigned?: string; q?: string }> }) {
  const { tenant, user } = await requireTenantPermission('message.manage');
  const query = await searchParams;
  const where: any = { tenantId: tenant.id };
  if (query.status === 'active') where.status = { in: activeStatuses };
  else if (query.status) where.status = query.status;
  if (query.priority && conversationPriorities.includes(query.priority as any)) where.priority = query.priority;
  if (query.company) where.companyId = query.company;
  if (query.assigned === 'me') where.assignedToId = user.id;
  else if (query.assigned === 'unassigned') where.assignedToId = null;
  else if (query.assigned) where.assignedToId = query.assigned;
  if (query.q?.trim()) where.OR = [
    { subject: { contains: query.q.trim(), mode: 'insensitive' } },
    { company: { legalName: { contains: query.q.trim(), mode: 'insensitive' } } },
    { company: { tradeName: { contains: query.q.trim(), mode: 'insensitive' } } },
  ];
  const [rows, companies, team] = await Promise.all([
    db.conversation.findMany({ where, include: { company: true, participants: { where: { userId: user.id } }, messages: { take: 1, orderBy: { createdAt: 'desc' } } }, orderBy: { lastMessageAt: 'desc' }, take: 200 }),
    db.company.findMany({ where: { tenantId: tenant.id, status: 'ACTIVE' }, select: { id: true, legalName: true, tradeName: true }, orderBy: { legalName: 'asc' } }),
    db.membership.findMany({ where: { tenantId: tenant.id, active: true, user: { active: true } }, select: { userId: true, user: { select: { name: true } } }, orderBy: { user: { name: 'asc' } } }),
  ]);
  const names = new Map<string, string>(team.map((member) => [String(member.userId), String(member.user.name)]));
  const assignedName = (assignedToId: string | null | undefined) => assignedToId ? names.get(String(assignedToId)) ?? 'Usuário' : 'Não atribuído';
  return <div><div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-bold">Central de comunicação</h1><p className="text-slate-500">Mensagens do portal, notas internas, anexos e responsáveis.</p></div><Link href="/notifications" className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold">Notificações</Link></div>
    <Card className="mt-6"><form className="grid gap-3 md:grid-cols-6"><input name="q" defaultValue={query.q ?? ''} placeholder="Buscar assunto ou empresa" className="rounded-xl border p-2.5 text-sm md:col-span-2" /><select name="status" defaultValue={query.status ?? 'active'} className="rounded-xl border p-2.5 text-sm"><option value="active">Em aberto</option><option value="">Todas</option>{['NEW','IN_PROGRESS','WAITING_COMPANY','WAITING_CONSULTANT','REOPENED','RESOLVED','ARCHIVED'].map((value) => <option key={value}>{value}</option>)}</select><select name="priority" defaultValue={query.priority ?? ''} className="rounded-xl border p-2.5 text-sm"><option value="">Prioridade</option>{conversationPriorities.map((value) => <option key={value}>{value}</option>)}</select><select name="company" defaultValue={query.company ?? ''} className="rounded-xl border p-2.5 text-sm"><option value="">Todas as empresas</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.tradeName ?? company.legalName}</option>)}</select><select name="assigned" defaultValue={query.assigned ?? ''} className="rounded-xl border p-2.5 text-sm"><option value="">Todos responsáveis</option><option value="me">Atribuídas a mim</option><option value="unassigned">Sem responsável</option>{team.map((member) => <option key={member.userId} value={member.userId}>{member.user.name}</option>)}</select><button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white md:col-span-6 md:justify-self-start">Filtrar</button></form></Card>
    <Card className="mt-6 p-0"><div className="divide-y">{rows.map((row) => { const latest = row.messages[0]; const participant = row.participants[0]; const unread = Boolean(latest && (!participant?.lastReadAt || latest.createdAt > participant.lastReadAt)); return <Link href={`/messages/${row.id}`} key={row.id} className={`block p-4 hover:bg-slate-50 ${unread ? 'bg-brand-50/50' : ''}`}><div className="flex flex-wrap justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{row.subject}</p>{unread && <Badge tone="warning">Nova</Badge>}<Badge tone={priorityTone(row.priority)}>{row.priority}</Badge></div><p className="mt-1 text-sm text-slate-500">{row.company?.tradeName ?? row.company?.legalName ?? 'Interno'} · {latest?.body.slice(0,120) ?? 'Sem mensagens'}</p><p className="mt-1 text-xs text-slate-400">Responsável: {assignedName(row.assignedToId)} · {formatDate(row.lastMessageAt)}</p></div><Badge tone={statusTone(row.status)}>{row.status}</Badge></div></Link>; })}{!rows.length && <p className="p-5 text-sm text-slate-500">Nenhuma conversa encontrada.</p>}</div></Card></div>;
}
