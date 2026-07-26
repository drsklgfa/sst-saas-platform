import { notFound } from 'next/navigation';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, Input, Button } from '@/components/ui';

export default async function NewInspection({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant } = await requireTenantPermission('inspection.manage');
  const company = await db.company.findFirst({ where: { id, tenantId: tenant.id }, include: { establishments: { where: { active: true }, include: { sectors: { where: { active: true }, include: { ghes: { where: { active: true } } } } } } } });
  if (!company) notFound();
  const ghes = company.establishments.flatMap((establishment) => establishment.sectors.flatMap((sector) => sector.ghes));
  return <div className="max-w-3xl"><h1 className="text-3xl font-bold">Nova vistoria</h1><p className="text-slate-500">{company.tradeName ?? company.legalName}</p><Card className="mt-6"><form action={`/api/companies/${company.id}/inspections`} method="post" className="space-y-4">
    <label className="block text-sm font-medium">Título<Input name="title" required className="mt-1" placeholder="Vistoria ergonômica — Produção" /></label>
    <label className="block text-sm font-medium">GHE<select name="gheId" className="mt-1 w-full rounded-xl border border-slate-300 p-2.5"><option value="">Avaliação geral da empresa</option>{ghes.map((ghe) => <option key={ghe.id} value={ghe.id}>{ghe.code ? `${ghe.code} — ` : ''}{ghe.name}</option>)}</select></label>
    <label className="block text-sm font-medium">Observações iniciais<textarea name="notes" rows={5} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
    <Button>Criar vistoria</Button>
  </form></Card></div>;
}
