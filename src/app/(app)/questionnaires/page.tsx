import Link from 'next/link';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { Badge, Button, Card, Input, Textarea } from '@/components/ui';

export default async function QuestionnairesPage() {
  const { tenant } = await requireTenantPermission('campaign.manage');
  const questionnaires = await db.questionnaire.findMany({
    where: { tenantId: tenant.id },
    include: { versions: { orderBy: { version: 'desc' }, take: 1, include: { _count: { select: { questions: true, campaignLinks: true } } } } },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  });

  return <div className="max-w-6xl">
    <div><h1 className="text-3xl font-bold">Questionários</h1><p className="text-slate-500">Crie modelos reutilizáveis e publique versões imutáveis para as campanhas.</p></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card><h2 className="font-bold">Novo questionário</h2><form action="/api/questionnaires" method="post" className="mt-4 space-y-4">
        <label className="block text-sm font-medium">Nome<Input name="name" required maxLength={180} className="mt-1" /></label>
        <label className="block text-sm font-medium">Categoria<Input name="category" required maxLength={80} className="mt-1" placeholder="ERGONOMICS_PSYCHOSOCIAL" /></label>
        <label className="block text-sm font-medium">Título da primeira versão<Input name="title" required maxLength={180} className="mt-1" /></label>
        <label className="block text-sm font-medium">Descrição<Textarea name="description" rows={3} className="mt-1" /></label>
        <label className="block text-sm font-medium">Instruções ao participante<Textarea name="instructions" rows={4} className="mt-1" /></label>
        <Button className="w-full">Criar rascunho</Button>
      </form></Card>
      <Card><h2 className="font-bold">Modelos cadastrados</h2><div className="mt-3 divide-y">{questionnaires.map((questionnaire) => {
        const version = questionnaire.versions[0];
        return <Link key={questionnaire.id} href={`/questionnaires/${questionnaire.id}`} className="flex items-center justify-between gap-4 py-4">
          <div><p className="font-semibold">{questionnaire.name}</p><p className="text-sm text-slate-500">{questionnaire.category}{version ? ` · versão ${version.version} · ${version._count.questions} perguntas` : ' · sem versão'}</p></div>
          <Badge tone={!questionnaire.active ? 'neutral' : version?.publishedAt ? 'success' : 'warning'}>{!questionnaire.active ? 'Inativo' : version?.publishedAt ? 'Publicado' : 'Rascunho'}</Badge>
        </Link>;
      })}{!questionnaires.length && <p className="py-4 text-sm text-slate-500">Nenhum questionário cadastrado.</p>}</div></Card>
    </div>
  </div>;
}
