import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { QuestionType } from '@prisma/client';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { Badge, Button, Card, Input, Textarea } from '@/components/ui';
import { serializeQuestionOptions } from '@/domain/questionnaires/editor';

const questionTypes: Array<{ value: QuestionType; label: string }> = [
  { value: 'YES_NO', label: 'Sim ou não' },
  { value: 'SINGLE_CHOICE', label: 'Escolha única' },
  { value: 'MULTI_CHOICE', label: 'Múltipla escolha' },
  { value: 'LIKERT', label: 'Escala/Likert' },
  { value: 'NUMBER', label: 'Número' },
  { value: 'TEXT', label: 'Texto curto' },
  { value: 'LONG_TEXT', label: 'Texto longo' },
  { value: 'DATE', label: 'Data' },
  { value: 'BODY_MAP', label: 'Mapa corporal' },
  { value: 'MATRIX', label: 'Matriz/texto estruturado' },
];

export default async function QuestionnairePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ version?: string; saved?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const { tenant } = await requireTenantPermission('campaign.manage');
  const questionnaire = await db.questionnaire.findFirst({
    where: { id, tenantId: tenant.id },
    include: { versions: { orderBy: { version: 'desc' }, include: { questions: { orderBy: { position: 'asc' }, include: { options: { orderBy: { position: 'asc' } } } }, _count: { select: { campaignLinks: true } } } } },
  });
  if (!questionnaire) notFound();
  const requestedVersion = Number(query.version);
  const selected = questionnaire.versions.find((version) => version.version === requestedVersion) ?? questionnaire.versions[0];
  if (!selected) notFound();
  const editable = !selected.publishedAt;

  return <div className="max-w-6xl">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><Link href="/questionnaires" className="text-sm text-brand-700">← Questionários</Link><h1 className="mt-1 text-3xl font-bold">{questionnaire.name}</h1><p className="text-slate-500">{questionnaire.category} · {questionnaire.description ?? 'Sem descrição'}</p></div>
      <form action={`/api/questionnaires/${questionnaire.id}/versions`} method="post"><Button className="bg-slate-800 hover:bg-slate-900">Criar nova versão</Button></form>
    </div>
    {query.saved && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Alterações salvas.</p>}
    <div className="mt-5 flex flex-wrap gap-2">{questionnaire.versions.map((version) => <Link key={version.id} href={`/questionnaires/${questionnaire.id}?version=${version.version}`} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${version.id === selected.id ? 'border-brand-600 bg-brand-50 text-brand-800' : 'bg-white'}`}>v{version.version} · {version.publishedAt ? 'publicada' : 'rascunho'}</Link>)}</div>

    <Card className="mt-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">Versão {selected.version}: {selected.title}</h2><p className="mt-1 text-sm text-slate-500">{selected.instructions ?? 'Sem instruções.'}</p><p className="mt-1 text-xs text-slate-400">{selected._count.campaignLinks} campanha(s) vinculada(s)</p></div><Badge tone={selected.publishedAt ? 'success' : 'warning'}>{selected.publishedAt ? 'Imutável e publicada' : 'Rascunho editável'}</Badge></div>
      {editable && <form action={`/api/questionnaire-versions/${selected.id}/publish`} method="post" className="mt-4"><Button>Publicar esta versão</Button><p className="mt-2 text-xs text-slate-500">Após publicar, perguntas e opções desta versão não poderão mais ser alteradas. Para mudanças, crie outra versão.</p></form>}
    </Card>

    {editable && <Card className="mt-6"><h2 className="font-bold">Adicionar pergunta</h2><form action={`/api/questionnaire-versions/${selected.id}/questions`} method="post" className="mt-4 grid gap-4 md:grid-cols-2"><input type="hidden" name="operation" value="create" />
      <label className="block text-sm font-medium md:col-span-2">Pergunta<Input name="text" required maxLength={1000} className="mt-1" /></label>
      <label className="block text-sm font-medium">Código interno<Input name="code" maxLength={60} className="mt-1" placeholder="gerado pelo texto se vazio" /></label>
      <label className="block text-sm font-medium">Tipo<select name="type" className="mt-1 w-full rounded-xl border border-slate-300 p-2.5">{questionTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
      <label className="block text-sm font-medium">Dimensão<Input name="dimension" maxLength={100} className="mt-1" placeholder="Ex.: LEADERSHIP_SUPPORT" /></label>
      <label className="block text-sm font-medium">Ajuda ao participante<Input name="helpText" maxLength={500} className="mt-1" /></label>
      <label className="block text-sm font-medium">Posição<Input name="position" type="number" min="1" className="mt-1" /></label>
      <label className="block text-sm font-medium">Valor mínimo<Input name="minValue" type="number" step="any" className="mt-1" /></label>
      <label className="block text-sm font-medium">Valor máximo<Input name="maxValue" type="number" step="any" className="mt-1" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="required" value="true" defaultChecked /> Obrigatória</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="reverseScore" value="true" /> Inverter pontuação</label>
      <label className="block text-sm font-medium md:col-span-2">Opções, uma por linha<Textarea name="options" rows={5} className="mt-1" placeholder={'valor|Rótulo|pontuação\n1|Nunca|1\n2|Às vezes|2'} /><span className="mt-1 block text-xs text-slate-500">Necessário para escolha, Likert e sim/não. Em sim/não, pode deixar vazio para usar Sim/Não.</span></label>
      <label className="block text-sm font-medium md:col-span-2">Condições em JSON (opcional)<Textarea name="conditions" rows={3} className="mt-1 font-mono text-xs" placeholder={'[{"questionCode":"tem_dor","operator":"equals","value":"YES"}]'} /></label>
      <div className="md:col-span-2"><Button>Adicionar pergunta</Button></div>
    </form></Card>}

    <div className="mt-6 space-y-4">{selected.questions.map((question) => <Card key={question.id} className={!editable ? 'bg-slate-50' : ''}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-brand-700">{question.position}. {question.code} · {question.type}</p><h3 className="mt-1 font-semibold">{question.text}</h3><p className="text-sm text-slate-500">{question.dimension ?? 'Sem dimensão'} · {question.required ? 'Obrigatória' : 'Opcional'}{question.reverseScore ? ' · pontuação invertida' : ''}</p></div>{question.options.length > 0 && <Badge>{question.options.length} opções</Badge>}</div>
      {question.options.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{question.options.map((option) => <span key={option.id} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs">{option.label}{option.score === null ? '' : ` (${option.score})`}</span>)}</div>}
      {editable && <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-brand-700">Editar pergunta</summary><form action={`/api/questionnaire-versions/${selected.id}/questions`} method="post" className="mt-4 grid gap-3 md:grid-cols-2"><input type="hidden" name="operation" value="update" /><input type="hidden" name="questionId" value={question.id} />
        <label className="block text-sm font-medium md:col-span-2">Pergunta<Input name="text" required defaultValue={question.text} className="mt-1" /></label>
        <label className="block text-sm font-medium">Código<Input name="code" required defaultValue={question.code} className="mt-1" /></label>
        <label className="block text-sm font-medium">Tipo<select name="type" defaultValue={question.type} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5">{questionTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
        <label className="block text-sm font-medium">Dimensão<Input name="dimension" defaultValue={question.dimension ?? ''} className="mt-1" /></label>
        <label className="block text-sm font-medium">Ajuda<Input name="helpText" defaultValue={question.helpText ?? ''} className="mt-1" /></label>
        <label className="block text-sm font-medium">Posição<Input name="position" type="number" min="1" defaultValue={question.position} className="mt-1" /></label>
        <label className="block text-sm font-medium">Mínimo<Input name="minValue" type="number" step="any" defaultValue={question.minValue ?? ''} className="mt-1" /></label>
        <label className="block text-sm font-medium">Máximo<Input name="maxValue" type="number" step="any" defaultValue={question.maxValue ?? ''} className="mt-1" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="required" value="true" defaultChecked={question.required} /> Obrigatória</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="reverseScore" value="true" defaultChecked={question.reverseScore} /> Inverter pontuação</label>
        <label className="block text-sm font-medium md:col-span-2">Opções<Textarea name="options" rows={5} defaultValue={serializeQuestionOptions(question.options)} className="mt-1" /></label>
        <label className="block text-sm font-medium md:col-span-2">Condições<Textarea name="conditions" rows={3} defaultValue={JSON.stringify(question.conditions, null, 2)} className="mt-1 font-mono text-xs" /></label>
        <div className="flex gap-3 md:col-span-2"><Button>Salvar</Button></div>
      </form><form action={`/api/questionnaire-versions/${selected.id}/questions`} method="post" className="mt-3"><input type="hidden" name="operation" value="delete" /><input type="hidden" name="questionId" value={question.id} /><button className="text-sm font-semibold text-rose-700">Excluir pergunta do rascunho</button></form></details>}
    </Card>)}{!selected.questions.length && <Card><p className="text-sm text-slate-500">Adicione a primeira pergunta.</p></Card>}</div>
  </div>;
}
