import { notFound } from 'next/navigation';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { Button, Card, Input } from '@/components/ui';

export default async function CompanyProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const { tenant } = await requireTenantPermission('company.write');
  const company = await db.company.findFirst({ where: { id, tenantId: tenant.id } });
  if (!company) notFound();

  return <div className="max-w-4xl">
    <h1 className="text-3xl font-bold">Dados da empresa</h1>
    <p className="text-slate-500">Informações cadastrais e situação operacional.</p>
    {saved && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Dados atualizados.</p>}
    <Card className="mt-6">
      <form action={`/api/companies/${company.id}/profile`} method="post" className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium md:col-span-2">Razão social<Input name="legalName" defaultValue={company.legalName} required maxLength={200} className="mt-1" /></label>
        <label className="text-sm font-medium">Nome fantasia<Input name="tradeName" defaultValue={company.tradeName ?? ''} maxLength={200} className="mt-1" /></label>
        <label className="text-sm font-medium">CNPJ<Input name="cnpj" defaultValue={company.cnpj ?? ''} inputMode="numeric" className="mt-1" /></label>
        <label className="text-sm font-medium">CNAE principal<Input name="primaryCnae" defaultValue={company.primaryCnae ?? ''} className="mt-1" /></label>
        <label className="text-sm font-medium">Grau de risco<Input name="riskGrade" defaultValue={company.riskGrade ?? ''} type="number" min="1" max="4" className="mt-1" /></label>
        <label className="text-sm font-medium">Colaboradores<Input name="employeeCount" defaultValue={company.employeeCount} type="number" min="0" className="mt-1" /></label>
        <label className="text-sm font-medium">Responsável na empresa<Input name="managerName" defaultValue={company.managerName ?? ''} className="mt-1" /></label>
        <label className="text-sm font-medium">Situação<select name="status" defaultValue={company.status} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="ACTIVE">Ativa</option><option value="INACTIVE">Inativa</option><option value="ARCHIVED">Arquivada</option></select></label>
        <div className="md:col-span-2"><Button>Salvar alterações</Button></div>
      </form>
    </Card>
  </div>;
}
