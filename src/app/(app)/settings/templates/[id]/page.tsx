import { notFound } from 'next/navigation';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { parseTemplateSchema } from '@/domain/documents/templates';
import { Card, Button, Input, Textarea, Badge } from '@/components/ui';
import { sanitizeReportHtml } from '@/domain/reports/sanitize';

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant } = await requireTenantPermission('settings.manage');
  const template = await db.documentTemplate.findFirst({ where: { id, tenantId: tenant.id }, include: { documentType: true, versions: { orderBy: { version: 'desc' } } } });
  if (!template) notFound();
  const latest = template.versions[0];
  if (!latest) notFound();
  const schema = parseTemplateSchema(latest.schema);
  const editable = !latest.publishedAt;
  return <div><div className="flex flex-wrap justify-between gap-3"><div><p className="text-sm text-brand-700">{template.documentType.name}</p><h1 className="text-3xl font-bold">{template.name}</h1><p className="text-slate-500">Versão {latest.version}</p></div><Badge>{editable ? 'Rascunho' : 'Publicado'}</Badge></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]"><Card><h2 className="font-bold">Seções do modelo</h2>{editable ? <form action={`/api/templates/${template.id}/save`} method="post" className="mt-4 space-y-4"><input type="hidden" name="sectionCount" value={schema.sections.length} />{schema.sections.map((section, index) => <div key={`${section.code}-${index}`} className="rounded-xl border p-4"><div className="grid gap-3 md:grid-cols-[180px_1fr]"><label className="text-xs font-medium">Código<Input name={`code_${index}`} defaultValue={section.code} className="mt-1" /></label><label className="text-xs font-medium">Título<Input name={`title_${index}`} defaultValue={section.title} className="mt-1" /></label></div><label className="mt-3 block text-xs font-medium">Conteúdo-base<Textarea name={`html_${index}`} rows={5} defaultValue={section.html} className="mt-1 font-mono text-xs" /></label></div>)}<Button>Salvar rascunho</Button></form> : <div className="mt-4 space-y-3">{schema.sections.map((section) => <div key={section.code} className="rounded-xl border p-4"><strong>{section.title}</strong><p className="text-xs text-slate-500">{section.code}</p><div className="mt-2 text-sm" dangerouslySetInnerHTML={{ __html: sanitizeReportHtml(section.html) }} /></div>)}</div>}</Card>
      <div className="space-y-4"><Card><h2 className="font-bold">Ciclo da versão</h2>{editable ? <form action={`/api/templates/${template.id}/publish`} method="post" className="mt-3"><Button className="w-full">Publicar versão {latest.version}</Button></form> : <form action={`/api/templates/${template.id}/versions`} method="post" className="mt-3"><Button className="w-full">Criar versão {latest.version + 1}</Button></form>}<p className="mt-3 text-xs text-slate-500">Documentos já criados continuam vinculados à versão usada na origem.</p></Card><Card><h2 className="font-bold">Histórico</h2><div className="mt-3 space-y-2">{template.versions.map((version) => <div key={version.id} className="flex justify-between rounded-lg border p-2 text-sm"><span>Versão {version.version}</span><Badge>{version.publishedAt ? new Date(version.publishedAt).toLocaleDateString('pt-BR') : 'Rascunho'}</Badge></div>)}</div></Card></div></div>
  </div>;
}
