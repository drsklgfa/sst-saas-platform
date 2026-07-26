import { notFound } from 'next/navigation';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, Input, Button } from '@/components/ui';

export default async function NewDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant } = await requireTenantPermission('document.edit');
  const [company, types, templates] = await Promise.all([
    db.company.findFirst({ where: { id, tenantId: tenant.id } }),
    db.documentType.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
    db.documentTemplateVersion.findMany({
      where: { publishedAt: { not: null }, template: { tenantId: tenant.id, active: true } },
      include: { template: { include: { documentType: true } } },
      orderBy: [{ template: { name: 'asc' } }, { version: 'desc' }],
    }),
  ]);
  if (!company) notFound();

  return <div className="max-w-3xl"><h1 className="text-3xl font-bold">Novo documento</h1><p className="text-slate-500">{company.tradeName ?? company.legalName}</p>
    <Card className="mt-6"><form action={`/api/companies/${company.id}/documents`} method="post" className="space-y-4">
      <label className="block text-sm font-medium">Tipo de documento
        <select name="documentTypeId" required className="mt-1 w-full rounded-xl border border-slate-300 p-2.5">{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select>
      </label>
      <label className="block text-sm font-medium">Modelo publicado
        <select name="templateVersionId" className="mt-1 w-full rounded-xl border border-slate-300 p-2.5"><option value="">Estrutura padrão do tipo escolhido</option>{templates.map((version) => <option key={version.id} value={version.id}>{version.template.documentType.name} · {version.template.name} · v{version.version}</option>)}</select>
        <span className="mt-1 block text-xs text-slate-500">O sistema validará se o modelo pertence ao tipo selecionado.</span>
      </label>
      <label className="block text-sm font-medium">Título personalizado<Input name="title" className="mt-1" placeholder="Deixe vazio para usar o título automático" /></label>
      <label className="block text-sm font-medium">Ano de referência<Input name="referenceYear" type="number" className="mt-1" defaultValue={new Date().getFullYear()} /></label>
      <Button>Criar rascunho</Button>
    </form></Card>
  </div>;
}
