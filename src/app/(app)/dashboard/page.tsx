import Link from 'next/link';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { StatCard } from '@/components/stat-card';
import { Card, Badge } from '@/components/ui';
import { hasTenantPermission } from '@/lib/rbac';
import { formatDate } from '@/lib/utils';

export default async function Dashboard() {
  const { tenant, membership } = await requireTenantPermission('company.read');
  const canCreate = hasTenantPermission(membership.role, 'company.write', membership.permissions);
  const canMessage = hasTenantPermission(membership.role, 'message.manage', membership.permissions);
  const now = new Date();
  const inThirtyDays = new Date(now.getTime() + 30 * 86400000);
  const [companies, campaigns, documents, actions, servicesOverdue, servicesRenewing, messages] = await Promise.all([
    db.company.count({ where: { tenantId: tenant.id, status: 'ACTIVE' } }),
    db.campaign.count({ where: { company: { tenantId: tenant.id }, status: 'ACTIVE' } }),
    db.document.count({ where: { company: { tenantId: tenant.id }, status: { in: ['REVIEW', 'WAITING_SIGNATURE', 'PREVIEW'] } } }),
    db.actionItem.count({ where: { actionPlan: { company: { tenantId: tenant.id } }, status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'OVERDUE'] } } }),
    db.serviceContract.findMany({
      where: { company: { tenantId: tenant.id }, active: true, dueAt: { lt: now }, status: { notIn: ['DELIVERED', 'COMPLETED', 'CANCELLED'] } },
      include: { company: true }, orderBy: { dueAt: 'asc' }, take: 8,
    }),
    db.serviceContract.findMany({
      where: { company: { tenantId: tenant.id }, active: true, renewalAt: { gte: now, lte: inThirtyDays }, status: { notIn: ['CANCELLED', 'EXPIRED'] } },
      include: { company: true }, orderBy: { renewalAt: 'asc' }, take: 8,
    }),
    canMessage ? db.conversation.findMany({ where: { tenantId: tenant.id, status: { notIn: ['ARCHIVED', 'RESOLVED'] } }, include: { company: true }, orderBy: { lastMessageAt: 'desc' }, take: 5 }) : Promise.resolve([]),
  ]);

  return (
    <div>
      <div className="flex items-end justify-between"><div><h1 className="text-3xl font-bold">Visão geral</h1><p className="mt-1 text-slate-500">Operação técnica, documentos, serviços e comunicação.</p></div>{canCreate && <Link href="/companies/new" className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">Nova empresa</Link>}</div>
      <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6"><StatCard label="Empresas ativas" value={companies} /><StatCard label="Campanhas ativas" value={campaigns} /><StatCard label="Documentos em revisão" value={documents} /><StatCard label="Ações abertas" value={actions} /><StatCard label="Serviços vencidos" value={servicesOverdue.length} /><StatCard label="Renovações em 30 dias" value={servicesRenewing.length} /></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><h2 className="font-bold">Serviços com prazo vencido</h2><div className="mt-3 divide-y">{servicesOverdue.map((service) => <Link key={service.id} href={`/companies/${service.companyId}/services`} className="flex items-center justify-between gap-3 py-3"><div><p className="font-medium">{service.code} · {service.name}</p><p className="text-sm text-slate-500">{service.company.tradeName ?? service.company.legalName} · prazo {formatDate(service.dueAt)}</p></div><Badge tone="danger">Vencido</Badge></Link>)}{!servicesOverdue.length && <p className="py-4 text-sm text-slate-500">Nenhum serviço vencido.</p>}</div></Card>
        <Card><h2 className="font-bold">Renovações próximas</h2><div className="mt-3 divide-y">{servicesRenewing.map((service) => <Link key={service.id} href={`/companies/${service.companyId}/services`} className="flex items-center justify-between gap-3 py-3"><div><p className="font-medium">{service.code} · {service.name}</p><p className="text-sm text-slate-500">{service.company.tradeName ?? service.company.legalName} · renovação {formatDate(service.renewalAt)}</p></div><Badge tone="warning">Renovar</Badge></Link>)}{!servicesRenewing.length && <p className="py-4 text-sm text-slate-500">Nenhuma renovação nos próximos 30 dias.</p>}</div></Card>
      </div>
      {canMessage && <Card className="mt-6"><div className="flex justify-between"><h2 className="font-bold">Conversas recentes</h2><Link href="/messages" className="text-sm text-brand-700">Ver todas</Link></div><div className="mt-4 divide-y">{messages.map((message) => <Link key={message.id} href={`/messages/${message.id}`} className="flex items-center justify-between py-3"><div><p className="font-medium">{message.subject}</p><p className="text-sm text-slate-500">{message.company?.tradeName ?? message.company?.legalName ?? 'Interno'}</p></div><Badge>{message.status}</Badge></Link>)}{!messages.length && <p className="py-5 text-sm text-slate-500">Nenhuma conversa pendente.</p>}</div></Card>}
    </div>
  );
}
