'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Input } from './ui';
import { conditionsSatisfied, type PublicQuestionType } from '@/domain/questionnaires/rules';

type Question = {
  id: string;
  code: string;
  text: string;
  helpText: string | null;
  type: PublicQuestionType;
  required: boolean;
  minValue: number | null;
  maxValue: number | null;
  conditions: unknown;
  options: Array<{ value: string; label: string }>;
};
type Pain = { regionCode: string; intensity: number };
type Draft = { answers: Record<string, unknown>; pains: Pain[]; step: number; startedAt: string; code: string };

const bodyRegions = [
  ['CERVICAL', 'Pescoço/cervical'], ['OMBRO_D', 'Ombro direito'], ['OMBRO_E', 'Ombro esquerdo'], ['COSTAS_SUPERIOR', 'Costas superior'],
  ['LOMBAR', 'Lombar'], ['COTOVELO_D', 'Cotovelo direito'], ['COTOVELO_E', 'Cotovelo esquerdo'], ['PUNHO_D', 'Punho direito'],
  ['PUNHO_E', 'Punho esquerdo'], ['QUADRIL', 'Quadril'], ['JOELHO_D', 'Joelho direito'], ['JOELHO_E', 'Joelho esquerdo'],
  ['TORNOZELO_D', 'Tornozelo direito'], ['TORNOZELO_E', 'Tornozelo esquerdo'],
] as const;

function randomDeviceId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function PublicQuestionnaire({
  token,
  title,
  company,
  instructions,
  privacyNotice,
  anonymousCodesEnabled,
  questions,
}: {
  token: string;
  title: string;
  company: string;
  instructions: string | null;
  privacyNotice: string | null;
  anonymousCodesEnabled: boolean;
  questions: Question[];
}) {
  const draftKey = `sst:campaign:${token}:draft`;
  const deviceKey = `sst:campaign:${token}:device`;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [pains, setPains] = useState<Pain[]>([]);
  const [code, setCode] = useState('');
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const [deviceId, setDeviceId] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const storedDevice = localStorage.getItem(deviceKey) || randomDeviceId();
      localStorage.setItem(deviceKey, storedDevice);
      setDeviceId(storedDevice);
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<Draft>;
        if (draft.answers && typeof draft.answers === 'object') setAnswers(draft.answers);
        if (Array.isArray(draft.pains)) setPains(draft.pains);
        if (typeof draft.step === 'number') setStep(Math.max(0, draft.step));
        if (typeof draft.startedAt === 'string') setStartedAt(draft.startedAt);
        if (typeof draft.code === 'string') setCode(draft.code);
      }
    } catch {
      setStartedAt(new Date().toISOString());
    } finally {
      setHydrated(true);
    }
  }, [deviceKey, draftKey]);

  const answersByCode = useMemo(() => {
    const result: Record<string, unknown> = {};
    for (const question of questions) if (answers[question.id] !== undefined) result[question.code] = answers[question.id];
    return result;
  }, [answers, questions]);
  const visibleQuestions = useMemo(() => questions.filter((question) => conditionsSatisfied(question.conditions, answersByCode)), [answersByCode, questions]);

  useEffect(() => {
    if (!hydrated || done) return;
    const safeStep = Math.min(step, Math.max(0, visibleQuestions.length - 1));
    if (safeStep !== step) setStep(safeStep);
    localStorage.setItem(draftKey, JSON.stringify({ answers, pains, step: safeStep, startedAt, code } satisfies Draft));
  }, [answers, code, done, draftKey, hydrated, pains, startedAt, step, visibleQuestions.length]);

  const question = visibleQuestions[step];
  const value = question ? answers[question.id] : undefined;
  const complete = question?.type === 'BODY_MAP' ? (!question.required || pains.length > 0) : (!question?.required || (Array.isArray(value) ? value.length > 0 : String(value ?? '').trim().length > 0));

  function setQuestionValue(next: unknown): void {
    if (!question) return;
    setAnswers((current) => ({ ...current, [question.id]: next }));
  }

  async function finish(): Promise<void> {
    if (!deviceId) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/public/campaigns/${token}/responses`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          code,
          startedAt,
          answers: Object.entries(answers).map(([questionId, answerValue]) => ({ questionId, value: answerValue })),
          bodyPains: pains,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string | { formErrors?: string[]; fieldErrors?: Record<string, string[]> } };
      if (!response.ok) {
        const message = typeof payload.error === 'string' ? payload.error : payload.error?.formErrors?.[0] ?? 'Não foi possível enviar. Confira as respostas.';
        setError(message);
        return;
      }
      localStorage.removeItem(draftKey);
      setDone(true);
    } catch {
      setError('Falha de conexão. Seu progresso continua salvo neste navegador; tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  if (!hydrated) return <Card><p className="text-center text-sm text-slate-500">Carregando pesquisa…</p></Card>;
  if (done) return <Card className="text-center"><div className="text-5xl">✓</div><h1 className="mt-4 text-2xl font-bold">Participação registrada</h1><p className="mt-2 text-slate-500">Obrigado. As respostas serão utilizadas apenas de forma consolidada.</p></Card>;
  if (!question) return <Card><p className="text-center">Não há perguntas disponíveis nesta campanha.</p></Card>;

  return <Card>
    <p className="text-sm text-brand-700">{company}</p><h1 className="text-xl font-bold">{title}</h1>
    {instructions && <p className="mt-2 text-sm text-slate-600">{instructions}</p>}
    {privacyNotice && <p className="mt-3 rounded-xl bg-brand-50 p-3 text-xs text-brand-900">{privacyNotice}</p>}
    {anonymousCodesEnabled && <label className="mt-4 block text-sm font-medium">Código anônimo de participação<Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 30))} autoComplete="off" className="mt-1 uppercase tracking-widest" placeholder="Digite o código recebido" /></label>}
    <div className="mt-5 h-2 overflow-hidden rounded bg-slate-100"><div className="h-full bg-brand-600 transition-all" style={{ width: `${((step + 1) / visibleQuestions.length) * 100}%` }} /></div>
    <p className="mt-2 text-xs text-slate-500">Pergunta {step + 1} de {visibleQuestions.length} · progresso salvo automaticamente neste navegador</p>
    <p className="mt-6 text-lg font-semibold">{question.text}</p>{question.helpText && <p className="text-sm text-slate-500">{question.helpText}</p>}

    <div className="mt-5 space-y-2">
      {question.type === 'BODY_MAP' && <div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{bodyRegions.map(([region, label]) => <button type="button" key={region} onClick={() => setPains((current) => current.some((pain) => pain.regionCode === region) ? current.filter((pain) => pain.regionCode !== region) : [...current, { regionCode: region, intensity: 5 }])} className={`rounded-xl border p-3 text-sm ${pains.some((pain) => pain.regionCode === region) ? 'border-brand-600 bg-brand-50' : 'bg-white'}`}>{label}</button>)}</div>{pains.map((pain) => <label key={pain.regionCode} className="mt-3 block text-sm">Intensidade — {bodyRegions.find(([region]) => region === pain.regionCode)?.[1] ?? pain.regionCode}: {pain.intensity}<input type="range" min="1" max="10" value={pain.intensity} onChange={(event) => setPains((current) => current.map((item) => item.regionCode === pain.regionCode ? { ...item, intensity: Number(event.target.value) } : item))} className="w-full" /></label>)}</div>}
      {question.type === 'MULTI_CHOICE' && question.options.map((option) => { const selected = Array.isArray(value) && value.includes(option.value); return <button type="button" key={option.value} onClick={() => setQuestionValue(selected ? (value as unknown[]).filter((item) => item !== option.value) : [...(Array.isArray(value) ? value : []), option.value])} className={`block w-full rounded-xl border p-3 text-left ${selected ? 'border-brand-600 bg-brand-50' : 'bg-white'}`}>{option.label}</button>; })}
      {['YES_NO', 'SINGLE_CHOICE', 'LIKERT'].includes(question.type) && question.options.map((option) => <button type="button" key={option.value} onClick={() => setQuestionValue(option.value)} className={`block w-full rounded-xl border p-3 text-left ${value === option.value ? 'border-brand-600 bg-brand-50' : 'bg-white'}`}>{option.label}</button>)}
      {question.type === 'NUMBER' && <Input type="number" step="any" min={question.minValue ?? undefined} max={question.maxValue ?? undefined} value={String(value ?? '')} onChange={(event) => setQuestionValue(event.target.value)} />}
      {question.type === 'DATE' && <Input type="date" value={String(value ?? '')} onChange={(event) => setQuestionValue(event.target.value)} />}
      {question.type === 'TEXT' && <Input value={String(value ?? '')} maxLength={1000} onChange={(event) => setQuestionValue(event.target.value)} />}
      {['LONG_TEXT', 'MATRIX'].includes(question.type) && <textarea value={String(value ?? '')} maxLength={5000} onChange={(event) => setQuestionValue(event.target.value)} className="w-full rounded-xl border p-3" rows={5} />}
    </div>
    {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    <div className="mt-6 flex justify-between"><Button type="button" className="bg-slate-200 text-slate-800 hover:bg-slate-300" disabled={step === 0} onClick={() => setStep((current) => current - 1)}>Voltar</Button>{step < visibleQuestions.length - 1 ? <Button type="button" disabled={!complete} onClick={() => setStep((current) => current + 1)}>Continuar</Button> : <Button type="button" disabled={busy || !complete || (anonymousCodesEnabled && code.length < 6)} onClick={finish}>{busy ? 'Enviando…' : 'Finalizar'}</Button>}</div>
  </Card>;
}
