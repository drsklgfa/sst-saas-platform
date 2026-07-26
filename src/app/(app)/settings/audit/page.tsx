import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, Input, Badge, Button } from '@/components/ui';

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string; companyId?: string; action?: string; page?: string }> }) {
  const query = await searchParams;
  const { tenant } = await requireTenantPermission('audit.read');
  const page = Math.max(1, Number(query.page) || 1);
  const take = 50;
  const where = {
    tenantId: tenant.id,
    ...(query.companyId ? { companyId: query.companyId } : {}),
    ...(query.action ? { action: { contains: query.action, mode: 'insensitive' as const } } : {}),
    ...(query.q ? { OR: [
      { action: { contains: query.q, mode: 'insensitive' as const } },
      { entityType: { contains: query.q, mode: 'insensitive' as const } },
      { entityId: { contains: query.q, mode: 'insensitive' as const } },
    ] } : {}),
  };
  const [logs, total, companies] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * take, take }),
    db.auditLog.count({ where }),
    db.company.findMany({ where: { tenantId: tenant.id }, select: { id: true, legalName: true }, orderBy: { legalName: 'asc' } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / take));
  return <div className="max-w-7xl"><h1 className="text-3xl font-bold">Auditoria</h1><p className="text-slate-500">Histórico imutável das operações relevantes da plataforma.</p>
    <Card className="mt-6"><form className="grid gap-3 md:grid-cols-[1fr_260px_240px_auto]"><Input name="q" defaultValue={query.q} placeholder="Entidade, ID ou ação" /><select name="companyId" defaultValue={query.companyId ?? ''} className="rounded-xl border p-2.5"><option value="">Todas as empresas</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.legalName}</option>)}</select><Input name="action" defaultValue={query.action} placeholder="Ex.: DOCUMENT, ACCESS" /><Button>Filtrar</Button></form></Card>
    <Card className="mt-6"><div className="flex items-center justify-between"><h2 className="font-bold">Eventos</h2><Badge>{total} registros</Badge></div><div className="mt-3 divide-y">{logs.map((log) => <details key={log.id} className="py-3"><summary className="cursor-pointer list-none"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{log.action}</p><p className="text-xs text-slate-500">{log.entityType}{log.entityId ? ` · ${log.entityId}` : ''} · {log.createdAt.toLocaleString('pt-BR')}</p></div><Badge tone={log.companyId ? 'neutral' : 'warning'}>{log.companyId ? 'Empresa' : 'Consultoria'}</Badge></div></summary><div className="mt-3 grid gap-3 lg:grid-cols-3"><pre className="overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(log.before, null, 2)}</pre><pre className="overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(log.after, null, 2)}</pre><pre className="overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(log.metadata, null, 2)}</pre></div></details>)}{!logs.length && <p className="py-5 text-sm text-slate-500">Nenhum evento encontrado.</p>}</div>
      <div className="mt-5 flex justify-between text-sm"><span>Página {page} de {pages}</span><div className="flex gap-3">{page > 1 && <a href={`?${new URLSearchParams({ ...(query.q ? { q: query.q } : {}), ...(query.companyId ? { companyId: query.companyId } : {}), ...(query.action ? { action: query.action } : {}), page: String(page - 1) })}`} className="font-semibold text-brand-700">Anterior</a>}{page < pages && <a href={`?${new URLSearchParams({ ...(query.q ? { q: query.q } : {}), ...(query.companyId ? { companyId: query.companyId } : {}), ...(query.action ? { action: query.action } : {}), page: String(page + 1) })}`} className="font-semibold text-brand-700">Próxima</a>}</div></div>
    </Card>
  </div>;
}
