import Link from 'next/link';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, Button, Input, Badge } from '@/components/ui';

export default async function TemplatesPage() {
  const { tenant } = await requireTenantPermission('settings.manage');
  const [types, templates] = await Promise.all([
    db.documentType.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
    db.documentTemplate.findMany({ where: { tenantId: tenant.id, active: true }, include: { documentType: true, versions: { orderBy: { version: 'desc' }, take: 1 } }, orderBy: { name: 'asc' } }),
  ]);
  return <div><div><p className="text-sm text-brand-700">Configurações</p><h1 className="text-3xl font-bold">Modelos documentais</h1><p className="text-slate-500">Modelos publicados são imutáveis. Alterações futuras criam uma nova versão.</p></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]"><Card><h2 className="font-bold">Novo modelo</h2><form action="/api/templates" method="post" className="mt-4 space-y-3"><label className="block text-sm font-medium">Tipo<select name="documentTypeId" required className="mt-1 w-full rounded-xl border border-slate-300 p-2.5">{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label><label className="block text-sm font-medium">Nome<Input name="name" required className="mt-1" placeholder="Modelo padrão da consultoria" /></label><label className="block text-sm font-medium">Descrição<Input name="description" className="mt-1" /></label><Button className="w-full">Criar modelo</Button></form></Card>
      <Card><h2 className="font-bold">Modelos existentes</h2><div className="mt-3 divide-y">{templates.map((template) => { const latest = template.versions[0]; return <Link key={template.id} href={`/settings/templates/${template.id}`} className="flex items-center justify-between gap-3 py-3"><div><p className="font-semibold">{template.name}</p><p className="text-xs text-slate-500">{template.documentType.name} · versão {latest?.version ?? '—'}</p></div><Badge>{latest?.publishedAt ? 'Publicado' : 'Rascunho'}</Badge></Link>; })}{!templates.length && <p className="py-4 text-sm text-slate-500">Nenhum modelo criado.</p>}</div></Card></div>
  </div>;
}
