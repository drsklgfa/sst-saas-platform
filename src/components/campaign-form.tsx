'use client';

import { useMemo, useState } from 'react';
import { Button, Input } from './ui';

type GheOption = { id: string; label: string; expectedResponses: number };
type QuestionnaireOption = { id: string; label: string };

export function CampaignForm({
  companyId,
  defaultExpectedResponses,
  ghes,
  questionnaires,
}: {
  companyId: string;
  defaultExpectedResponses: number;
  ghes: GheOption[];
  questionnaires: QuestionnaireOption[];
}) {
  const [startsAtLocal, setStartsAtLocal] = useState('');
  const [endsAtLocal, setEndsAtLocal] = useState('');
  const [selectedGhes, setSelectedGhes] = useState<string[]>([]);
  const startsAtUtc = useMemo(() => startsAtLocal ? new Date(startsAtLocal).toISOString() : '', [startsAtLocal]);
  const endsAtUtc = useMemo(() => endsAtLocal ? new Date(endsAtLocal).toISOString() : '', [endsAtLocal]);

  return <form action={`/api/companies/${companyId}/campaigns`} method="post" className="space-y-5">
    <input type="hidden" name="startsAtUtc" value={startsAtUtc} />
    <input type="hidden" name="endsAtUtc" value={endsAtUtc} />
    <label className="block text-sm font-medium">Nome da campanha<Input name="name" required maxLength={200} className="mt-1" placeholder="Avaliação Ergonômica e Psicossocial 2026" /></label>
    <label className="block text-sm font-medium">Respostas esperadas<Input name="expectedResponses" type="number" min="0" max="100000" className="mt-1" defaultValue={defaultExpectedResponses} /></label>
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block text-sm font-medium">Abertura programada<input type="datetime-local" value={startsAtLocal} onChange={(event) => setStartsAtLocal(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /></label>
      <label className="block text-sm font-medium">Encerramento programado<input type="datetime-local" value={endsAtLocal} onChange={(event) => setEndsAtLocal(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /></label>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block text-sm font-medium">Grupo mínimo para consolidar<Input name="minimumGroupSize" type="number" min="3" max="100" defaultValue={5} className="mt-1" /></label>
      <label className="block text-sm font-medium">Grupo mínimo para detalhamento<Input name="detailedGroupSize" type="number" min="3" max="100" defaultValue={10} className="mt-1" /></label>
    </div>
    <label className="block text-sm font-medium">Estado inicial<select name="requestedStatus" className="mt-1 w-full rounded-xl border border-slate-300 p-2.5"><option value="ACTIVE">Ativar na abertura</option><option value="DRAFT">Salvar como rascunho</option></select></label>

    <fieldset className="rounded-xl border p-4"><legend className="px-2 text-sm font-semibold">Questionários publicados</legend><div className="space-y-2">{questionnaires.map((questionnaire, index) => <label key={questionnaire.id} className="flex items-start gap-2 text-sm"><input type="checkbox" name="questionnaireVersionIds" value={questionnaire.id} defaultChecked={index === 0} className="mt-1" /><span>{questionnaire.label}</span></label>)}</div>{!questionnaires.length && <p className="text-sm text-rose-700">Publique um questionário antes de criar a campanha.</p>}</fieldset>

    <fieldset className="rounded-xl border p-4"><legend className="px-2 text-sm font-semibold">Segmentação por GHE</legend><p className="mb-3 text-xs text-slate-500">Sem seleção, o link será geral. Com seleção, cada GHE terá seu próprio link e QR Code.</p><div className="grid gap-2 md:grid-cols-2">{ghes.map((ghe) => <label key={ghe.id} className="flex items-start gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" name="gheIds" value={ghe.id} checked={selectedGhes.includes(ghe.id)} onChange={(event) => setSelectedGhes((current) => event.target.checked ? [...current, ghe.id] : current.filter((id) => id !== ghe.id))} className="mt-1" /><span>{ghe.label}<span className="block text-xs text-slate-500">{ghe.expectedResponses} trabalhador(es) cadastrados</span></span></label>)}</div></fieldset>

    <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="anonymousCodesEnabled" value="true" className="mt-1" /><span>Exigir código anônimo de uso único<span className="block text-xs text-slate-500">Os códigos serão gerados e baixados depois da criação. O sistema armazena somente o hash.</span></span></label>
    <label className="block text-sm font-medium">Aviso adicional de privacidade<textarea name="privacyNotice" rows={3} maxLength={1000} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="Opcional. Não inclua promessa de anonimato além das regras realmente aplicadas." /></label>
    <Button disabled={!questionnaires.length}>Criar campanha</Button>
  </form>;
}
