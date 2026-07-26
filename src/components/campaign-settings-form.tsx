'use client';

import { useMemo, useState } from 'react';
import { Button, Input } from './ui';

function localDateTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function CampaignSettingsForm({
  campaignId,
  name,
  expectedResponses,
  minimumGroupSize,
  detailedGroupSize,
  startsAt,
  endsAt,
  privacyNotice,
}: {
  campaignId: string;
  name: string;
  expectedResponses: number;
  minimumGroupSize: number;
  detailedGroupSize: number;
  startsAt: string | null;
  endsAt: string | null;
  privacyNotice: string;
}) {
  const [startsLocal, setStartsLocal] = useState(() => localDateTime(startsAt));
  const [endsLocal, setEndsLocal] = useState(() => localDateTime(endsAt));
  const startsUtc = useMemo(() => startsLocal ? new Date(startsLocal).toISOString() : '', [startsLocal]);
  const endsUtc = useMemo(() => endsLocal ? new Date(endsLocal).toISOString() : '', [endsLocal]);
  return <form action={`/api/campaigns/${campaignId}/settings`} method="post" className="mt-4 grid gap-3 md:grid-cols-2">
    <input type="hidden" name="startsAtUtc" value={startsUtc} /><input type="hidden" name="endsAtUtc" value={endsUtc} />
    <label className="block text-sm font-medium md:col-span-2">Nome<Input name="name" required defaultValue={name} className="mt-1" /></label>
    <label className="block text-sm font-medium">Respostas esperadas<Input name="expectedResponses" type="number" min="0" max="100000" defaultValue={expectedResponses} className="mt-1" /></label>
    <label className="block text-sm font-medium">Grupo mínimo<Input name="minimumGroupSize" type="number" min="3" max="100" defaultValue={minimumGroupSize} className="mt-1" /></label>
    <label className="block text-sm font-medium">Detalhamento mínimo<Input name="detailedGroupSize" type="number" min="3" max="100" defaultValue={detailedGroupSize} className="mt-1" /></label>
    <span />
    <label className="block text-sm font-medium">Abertura<input type="datetime-local" value={startsLocal} onChange={(event) => setStartsLocal(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /></label>
    <label className="block text-sm font-medium">Encerramento<input type="datetime-local" value={endsLocal} onChange={(event) => setEndsLocal(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /></label>
    <label className="block text-sm font-medium md:col-span-2">Aviso de privacidade<textarea name="privacyNotice" rows={3} defaultValue={privacyNotice} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm" /></label>
    <div className="md:col-span-2"><Button>Salvar configuração</Button></div>
  </form>;
}
