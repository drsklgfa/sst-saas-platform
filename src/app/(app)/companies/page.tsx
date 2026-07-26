import Link from 'next/link';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, Badge } from '@/components/ui';
import { hasTenantPermission } from '@/lib/rbac';

export default async function Companies() {
  const { tenant, membership } = await requireTenantPermission('company.read');
  const canCreate = hasTenantPermission(membership.role, 'company.write', membership.permissions);
  const companies = await db.company.findMany({
    where: { tenantId: tenant.id },
    include: { _count: { select: { campaigns: true, documents: true, actionPlans: true, services: true } } },
    orderBy: { legalName: 'asc' },
  });

  return (
    <div>
      <div className="flex justify-between">
        <div><h1 className="text-3xl font-bold">Empresas</h1><p className="text-slate-500">Cadastros, serviços e histórico técnico.</p></div>
        {canCreate && <Link href="/companies/new" className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">Cadastrar empresa</Link>}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {companies.map((company) => (
          <Link href={`/companies/${company.id}`} key={company.id}>
            <Card className="transition hover:-translate-y-0.5">
              <div className="flex justify-between"><div><h2 className="font-bold">{company.tradeName ?? company.legalName}</h2><p className="text-sm text-slate-500">{company.legalName}</p></div><Badge tone={company.status === 'ACTIVE' ? 'success' : 'neutral'}>{company.status}</Badge></div>
              <div className="mt-4 flex gap-5 text-sm text-slate-600"><span>{company._count.campaigns} campanhas</span><span>{company._count.documents} documentos</span><span>{company._count.actionPlans} planos</span><span>{company._count.services} serviços</span></div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
