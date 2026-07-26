import { Card, Input, Button } from '@/components/ui';
import { requireTenantPermission } from '@/lib/auth';

export default async function NewCompany() {
  await requireTenantPermission('company.write');
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold">Nova empresa</h1>
      <Card className="mt-6">
        <form action="/api/companies" method="post" className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium md:col-span-2">Razão social<Input name="legalName" required maxLength={200} className="mt-1" /></label>
          <label className="text-sm font-medium">Nome fantasia<Input name="tradeName" maxLength={200} className="mt-1" /></label>
          <label className="text-sm font-medium">CNPJ<Input name="cnpj" inputMode="numeric" className="mt-1" /></label>
          <label className="text-sm font-medium">CNAE principal<Input name="primaryCnae" className="mt-1" /></label>
          <label className="text-sm font-medium">Grau de risco<Input name="riskGrade" type="number" min="1" max="4" className="mt-1" /></label>
          <label className="text-sm font-medium">Colaboradores<Input name="employeeCount" type="number" min="0" className="mt-1" /></label>
          <div className="md:col-span-2"><Button>Criar empresa</Button></div>
        </form>
      </Card>
    </div>
  );
}
