import { ServiceStatus } from '@prisma/client';
import { notFound } from 'next/navigation';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { Badge, Button, Card, Input, Textarea } from '@/components/ui';
import { formatDate } from '@/lib/utils';

const labels: Record<ServiceStatus, string> = {
  PROPOSAL: 'Proposta', CONTRACTED: 'Contratado', IN_PROGRESS: 'Em execução', WAITING_CLIENT: 'Aguardando cliente', DELIVERED: 'Entregue', COMPLETED: 'Concluído', SUSPENDED: 'Suspenso', CANCELLED: 'Cancelado', EXPIRED: 'Vencido',
};

function money(value: unknown): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}
function inputDate(value: Date | null): string { return value ? value.toISOString().slice(0, 10) : ''; }
function tone(status: ServiceStatus): 'neutral' | 'success' | 'warning' | 'danger' {
  if (['COMPLETED', 'DELIVERED'].includes(status)) return 'success';
  if (['WAITING_CLIENT', 'SUSPENDED'].includes(status)) return 'warning';
  if (['CANCELLED', 'EXPIRED'].includes(status)) return 'danger';
  return 'neutral';
}

export default async function ServicesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; updated?: string }> }) {
  const { id } = await params;
  const feedback = await searchParams;
  const { tenant } = await requireTenantPermission('company.write');
  const company = await db.company.findFirst({ where: { id, tenantId: tenant.id }, include: { services: { orderBy: [{ active: 'desc' }, { dueAt: 'asc' }, { createdAt: 'desc' }] } } });
  if (!company) notFound();
  const now = new Date();
  const inThirtyDays = new Date(now.getTime() + 30 * 86400000);
  const overdue = company.services.filter((service) => service.active && service.dueAt && service.dueAt < now && !['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(service.status)).length;
  const renewals = company.services.filter((service) => service.active && service.renewalAt && service.renewalAt >= now && service.renewalAt <= inThirtyDays).length;
  const openValue = company.services.filter((service) => service.active && !['CANCELLED', 'EXPIRED'].includes(service.status)).reduce((sum, service) => sum + Number(service.contractedValue ?? 0), 0);

  return <div>
    <div><h1 className="text-3xl font-bold">Serviços contratados</h1><p className="text-slate-500">{company.tradeName ?? company.legalName} · valores, responsáveis, prazos, entregas e renovações.</p></div>
    {(feedback.created || feedback.updated) && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Serviço salvo com sucesso.</p>}
    <div className="mt-6 grid gap-4 md:grid-cols-3"><Card><p className="text-sm text-slate-500">Valor contratado ativo</p><p className="text-2xl font-bold">{money(openValue)}</p></Card><Card><p className="text-sm text-slate-500">Prazos vencidos</p><p className="text-2xl font-bold">{overdue}</p></Card><Card><p className="text-sm text-slate-500">Renovações em 30 dias</p><p className="text-2xl font-bold">{renewals}</p></Card></div>

    <Card className="mt-6"><h2 className="font-bold">Cadastrar serviço</h2><form action={`/api/companies/${id}/services`} method="post" className="mt-4 grid gap-4 md:grid-cols-3">
      <label className="text-sm font-medium">Código<Input name="code" required placeholder="AET-2026-01" className="mt-1" /></label><label className="text-sm font-medium md:col-span-2">Nome do serviço<Input name="name" required className="mt-1" /></label>
      <label className="text-sm font-medium">Categoria<Input name="category" placeholder="Ergonomia, PGR, LTCAT..." className="mt-1" /></label><label className="text-sm font-medium">Situação<select name="status" defaultValue="CONTRACTED" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">{Object.values(ServiceStatus).map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></label><label className="text-sm font-medium">Valor contratado<Input name="contractedValue" inputMode="decimal" placeholder="0,00" className="mt-1" /></label>
      <label className="text-sm font-medium">Data da contratação<Input name="contractedAt" type="date" className="mt-1" /></label><label className="text-sm font-medium">Início<Input name="startsAt" type="date" className="mt-1" /></label><label className="text-sm font-medium">Prazo de entrega<Input name="dueAt" type="date" className="mt-1" /></label>
      <label className="text-sm font-medium">Data da entrega<Input name="deliveredAt" type="date" className="mt-1" /></label><label className="text-sm font-medium">Renovação<Input name="renewalAt" type="date" className="mt-1" /></label><label className="text-sm font-medium">Avisar antes (dias)<Input name="renewalNoticeDays" type="number" min="0" max="365" defaultValue="30" className="mt-1" /></label>
      <label className="text-sm font-medium">Responsável<Input name="responsibleName" className="mt-1" /></label><label className="text-sm font-medium">Pedido/contrato<Input name="purchaseOrder" className="mt-1" /></label><label className="text-sm font-medium md:col-span-3">Descrição<Textarea name="description" className="mt-1" /></label><label className="text-sm font-medium md:col-span-3">Observações internas<Textarea name="notes" className="mt-1" /></label><div className="md:col-span-3"><Button>Cadastrar serviço</Button></div>
    </form></Card>

    <div className="mt-6 space-y-4">{company.services.map((service) => {
      const isOverdue = service.active && service.dueAt && service.dueAt < now && !['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(service.status);
      return <Card key={service.id} className={!service.active ? 'opacity-65' : ''}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{service.code} · {service.name}</h3><Badge tone={tone(service.status)}>{labels[service.status]}</Badge>{!service.active && <Badge>Arquivado</Badge>}{isOverdue && <Badge tone="danger">Prazo vencido</Badge>}</div><p className="mt-1 text-sm text-slate-500">{service.category ?? 'Sem categoria'} · {money(service.contractedValue)} · responsável: {service.responsibleName ?? 'não definido'}</p><p className="text-sm text-slate-500">Prazo: {formatDate(service.dueAt)} · entrega: {formatDate(service.deliveredAt)} · renovação: {formatDate(service.renewalAt)}</p></div><details><summary className="cursor-pointer text-sm font-semibold text-brand-700">Editar</summary><form action={`/api/companies/${id}/services/${service.id}`} method="post" className="mt-3 grid max-w-4xl gap-3 md:grid-cols-3"><input type="hidden" name="operation" value="update" /><Input name="code" defaultValue={service.code} required /><Input name="name" defaultValue={service.name} required className="md:col-span-2" /><Input name="category" defaultValue={service.category ?? ''} /><select name="status" defaultValue={service.status} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm">{Object.values(ServiceStatus).map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select><Input name="contractedValue" defaultValue={service.contractedValue?.toString() ?? ''} /><Input name="contractedAt" type="date" defaultValue={inputDate(service.contractedAt)} /><Input name="startsAt" type="date" defaultValue={inputDate(service.startsAt)} /><Input name="dueAt" type="date" defaultValue={inputDate(service.dueAt)} /><Input name="deliveredAt" type="date" defaultValue={inputDate(service.deliveredAt)} /><Input name="renewalAt" type="date" defaultValue={inputDate(service.renewalAt)} /><Input name="renewalNoticeDays" type="number" min="0" max="365" defaultValue={service.renewalNoticeDays} /><Input name="responsibleName" defaultValue={service.responsibleName ?? ''} /><Input name="purchaseOrder" defaultValue={service.purchaseOrder ?? ''} /><Textarea name="description" defaultValue={service.description ?? ''} className="md:col-span-3" /><Textarea name="notes" defaultValue={service.notes ?? ''} className="md:col-span-3" /><Button>Salvar alterações</Button></form><form action={`/api/companies/${id}/services/${service.id}`} method="post" className="mt-2"><input type="hidden" name="operation" value={service.active ? 'archive' : 'restore'} /><button className="text-sm text-rose-700">{service.active ? 'Arquivar serviço' : 'Reativar serviço'}</button></form></details></div></Card>;
    })}{!company.services.length && <Card><p className="text-sm text-slate-500">Nenhum serviço contratado cadastrado.</p></Card>}</div>
  </div>;
}
