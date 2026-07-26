import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasTenantPermission } from '@/lib/rbac';
import { Badge, Button, Card, Input } from '@/components/ui';
import { campaignAvailability } from '@/domain/campaigns';
import { aggregatePsychosocial, type ScoredAnswer } from '@/domain/engines/psychosocial';
import { env } from '@/lib/env';
import { CampaignSettingsForm } from '@/components/campaign-settings-form';

function formatDate(value: Date | null): string {
  return value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(value) : '—';
}
function jsonStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
function moderationReason(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const reason = (value as { reason?: unknown }).reason;
  return typeof reason === 'string' ? reason : null;
}

export default async function CampaignPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ codes?: string; saved?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const { tenant, membership } = await requireTenantPermission('company.read');
  const canManage = hasTenantPermission(membership.role, 'campaign.manage', membership.permissions);
  const canModerate = hasTenantPermission(membership.role, 'response.moderate', membership.permissions);
  const campaign = await db.campaign.findFirst({
    where: { id, company: { tenantId: tenant.id } },
    include: {
      company: true,
      targets: { include: { ghe: { include: { sector: { include: { establishment: true } } } } }, orderBy: { ghe: { name: 'asc' } } },
      questionnaires: { include: { questionnaireVersion: { include: { questionnaire: true, _count: { select: { questions: true } } } } }, orderBy: { position: 'asc' } },
      _count: { select: { responseSessions: true, codes: true } },
    },
  });
  if (!campaign) notFound();

  const responseSessions = canModerate ? await db.responseSession.findMany({ where: { campaignId: campaign.id, status: { in: ['SUBMITTED', 'INVALIDATED'] } }, orderBy: { submittedAt: 'desc' }, include: { answers: { include: { question: { include: { options: true } } } }, bodyPains: true } }) : [];
  const submittedCount = await db.responseSession.count({ where: { campaignId: campaign.id, status: 'SUBMITTED' } });
  const includedCount = await db.responseSession.count({ where: { campaignId: campaign.id, status: 'SUBMITTED', includedInConsolidation: true } });
  const usedCodes = campaign.anonymousCodesEnabled ? await db.anonymousCode.count({ where: { campaignId: campaign.id, usedAt: { not: null } } }) : 0;
  const availability = campaignAvailability(campaign);
  const canConsolidate = includedCount >= campaign.minimumGroupSize;

  const scored: ScoredAnswer[] = [];
  if (canModerate && canConsolidate) {
    for (const session of responseSessions) {
      if (session.status !== 'SUBMITTED' || !session.includedInConsolidation) continue;
      for (const answer of session.answers) {
        const question = answer.question;
        if (!question.dimension || question.minValue === null || question.maxValue === null || question.maxValue === question.minValue) continue;
        const selected = question.options.find((option) => option.value === String(answer.value));
        const score = selected?.score ?? answer.numericValue;
        if (score === null || score === undefined) continue;
        scored.push({ dimension: question.dimension, score, min: question.minValue, max: question.maxValue, reverse: question.reverseScore });
      }
    }
  }
  const consolidated = scored.length ? aggregatePsychosocial(scored) : [];

  return <div className="max-w-7xl">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><Link href={`/companies/${campaign.companyId}`} className="text-sm text-brand-700">← {campaign.company.tradeName ?? campaign.company.legalName}</Link><h1 className="mt-1 text-3xl font-bold">{campaign.name}</h1><p className="text-slate-500">Abertura: {formatDate(campaign.startsAt)} · encerramento: {formatDate(campaign.endsAt)}</p></div><Badge tone={availability === 'OPEN' ? 'success' : availability === 'SCHEDULED' ? 'warning' : 'neutral'}>{availability}</Badge></div>
    {query.saved && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Configuração atualizada.</p>}
    {query.codes && <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Os códigos foram gerados no download. Guarde o arquivo: os códigos em texto não ficam armazenados no sistema.</p>}

    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <Card><p className="text-sm text-slate-500">Respostas</p><p className="text-3xl font-bold">{submittedCount}</p><p className="text-xs text-slate-500">esperadas: {campaign.expectedResponses || 'não informado'}</p></Card>
      <Card><p className="text-sm text-slate-500">Incluídas</p><p className="text-3xl font-bold">{includedCount}</p><p className="text-xs text-slate-500">mínimo: {campaign.minimumGroupSize}</p></Card>
      <Card><p className="text-sm text-slate-500">GHEs</p><p className="text-3xl font-bold">{campaign.targets.length || 'Geral'}</p></Card>
      <Card><p className="text-sm text-slate-500">Questionários</p><p className="text-3xl font-bold">{campaign.questionnaires.length}</p></Card>
      <Card><p className="text-sm text-slate-500">Códigos usados</p><p className="text-3xl font-bold">{campaign.anonymousCodesEnabled ? `${usedCodes}/${campaign._count.codes}` : 'Não'}</p></Card>
    </div>

    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <Card><h2 className="font-bold">Links de participação</h2><div className="mt-3 space-y-4">{campaign.targets.length === 0 && <div className="rounded-xl border p-3"><p className="font-medium">Link geral</p><code className="mt-1 block break-all text-xs">{env.APP_URL}/p/{campaign.publicToken}</code><div className="mt-2 flex gap-3 text-sm"><Link target="_blank" href={`/p/${campaign.publicToken}`} className="text-brand-700">Abrir</Link><a href={`/api/campaigns/${campaign.id}/qr`} className="text-brand-700">QR Code</a></div></div>}{campaign.targets.map((target) => <div key={target.id} className="rounded-xl border p-3"><p className="font-medium">{target.ghe.code ? `${target.ghe.code} — ` : ''}{target.ghe.name}</p><p className="text-xs text-slate-500">{target.ghe.sector.establishment.name} / {target.ghe.sector.name}</p><code className="mt-1 block break-all text-xs">{env.APP_URL}/p/{target.token}</code><div className="mt-2 flex gap-3 text-sm"><Link target="_blank" href={`/p/${target.token}`} className="text-brand-700">Abrir</Link><a href={`/api/campaigns/${campaign.id}/qr?targetId=${target.id}`} className="text-brand-700">QR Code</a></div></div>)}</div></Card>

      <Card><h2 className="font-bold">Configuração</h2><div className="mt-3 space-y-2 text-sm"><p>Grupo mínimo: <strong>{campaign.minimumGroupSize}</strong></p><p>Detalhamento mínimo: <strong>{campaign.detailedGroupSize}</strong></p><p>Código de uso único: <strong>{campaign.anonymousCodesEnabled ? 'Sim' : 'Não'}</strong></p>{campaign.questionnaires.map((item) => <p key={item.id}>{item.position}. {item.questionnaireVersion.questionnaire.name} · versão {item.questionnaireVersion.version} · {item.questionnaireVersion._count.questions} perguntas</p>)}</div>
        {canManage && <details className="mt-5 rounded-xl border p-3"><summary className="cursor-pointer text-sm font-semibold text-brand-700">Editar programação e limites</summary><CampaignSettingsForm campaignId={campaign.id} name={campaign.name} expectedResponses={campaign.expectedResponses} minimumGroupSize={campaign.minimumGroupSize} detailedGroupSize={campaign.detailedGroupSize} startsAt={campaign.startsAt?.toISOString() ?? null} endsAt={campaign.endsAt?.toISOString() ?? null} privacyNotice={campaign.settings && typeof campaign.settings === 'object' && !Array.isArray(campaign.settings) && typeof (campaign.settings as Record<string, unknown>).privacyNotice === 'string' ? String((campaign.settings as Record<string, unknown>).privacyNotice) : ''} /></details>}
        {canManage && <div className="mt-5 space-y-4">{campaign.anonymousCodesEnabled && <form action={`/api/campaigns/${campaign.id}/codes`} method="post" className="flex items-end gap-2"><label className="block flex-1 text-sm font-medium">Gerar novos códigos<Input name="count" type="number" min="1" max="5000" defaultValue={Math.max(1, campaign.expectedResponses - campaign._count.codes)} className="mt-1" /></label><Button>Baixar CSV</Button></form>}<div className="flex flex-wrap gap-2">{availability === 'OPEN' && <form action={`/api/campaigns/${campaign.id}/status`} method="post"><input type="hidden" name="status" value="PAUSED" /><Button className="bg-amber-600 hover:bg-amber-700">Pausar</Button></form>}{availability === 'PAUSED' && <form action={`/api/campaigns/${campaign.id}/status`} method="post"><input type="hidden" name="status" value="REOPENED" /><Button>Reabrir</Button></form>}{!['CLOSED', 'ARCHIVED', 'CANCELLED'].includes(availability) && <form action={`/api/campaigns/${campaign.id}/status`} method="post"><input type="hidden" name="status" value="CLOSED" /><Button className="bg-rose-700 hover:bg-rose-800">Encerrar</Button></form>}{availability === 'CLOSED' && <form action={`/api/campaigns/${campaign.id}/status`} method="post"><input type="hidden" name="status" value="REOPENED" /><Button>Reabrir</Button></form>}</div></div>}
      </Card>
    </div>

    <Card className="mt-6"><h2 className="font-bold">Consolidação</h2>{!canConsolidate ? <p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Resultados suprimidos: são necessárias pelo menos {campaign.minimumGroupSize} respostas incluídas para preservar o grupo.</p> : consolidated.length ? <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{consolidated.map((item) => <div key={item.dimension} className="rounded-xl border p-4"><p className="text-xs font-semibold uppercase text-slate-500">{item.dimension}</p><p className="mt-1 text-2xl font-bold">{item.score}</p><Badge tone={item.level === 'FAVORÁVEL' ? 'success' : item.level === 'ATENÇÃO' ? 'warning' : 'danger'}>{item.level}</Badge></div>)}</div> : <p className="mt-3 text-sm text-slate-500">Não há perguntas pontuadas suficientes para gerar dimensões.</p>}</Card>

    {canModerate && <Card className="mt-6"><h2 className="font-bold">Moderação das respostas</h2><p className="mt-1 text-sm text-slate-500">O registro original permanece preservado. Exclusões da consolidação exigem justificativa e ficam auditadas.</p><div className="mt-4 divide-y">{responseSessions.map((session) => { const flags = jsonStringArray(session.qualityFlags); const reason = moderationReason(session.moderation); return <div key={session.id} className="py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">Resposta de {formatDate(session.submittedAt)}</p><p className="text-xs text-slate-500">Duração: {session.durationSeconds ?? '—'}s · {session.answers.length} respostas · {session.bodyPains.length} regiões corporais</p><div className="mt-2 flex flex-wrap gap-2">{flags.map((flag) => <Badge key={flag} tone="warning">{flag}</Badge>)}{!flags.length && <Badge tone="success">Sem alerta automático</Badge>}<Badge tone={session.includedInConsolidation ? 'success' : 'danger'}>{session.includedInConsolidation ? 'Incluída' : 'Excluída'}</Badge></div>{reason && <p className="mt-2 text-sm text-rose-700">Justificativa: {reason}</p>}</div><form action={`/api/responses/${session.id}/moderation`} method="post" className="min-w-72 space-y-2"><input type="hidden" name="campaignId" value={campaign.id} /><input type="hidden" name="decision" value={session.includedInConsolidation ? 'exclude' : 'include'} /><Input name="reason" required={session.includedInConsolidation} placeholder={session.includedInConsolidation ? 'Justificativa obrigatória' : 'Motivo da reinclusão'} /><Button className={session.includedInConsolidation ? 'w-full bg-rose-700 hover:bg-rose-800' : 'w-full'}>{session.includedInConsolidation ? 'Excluir da consolidação' : 'Reincluir'}</Button></form></div></div>; })}{!responseSessions.length && <p className="py-4 text-sm text-slate-500">Nenhuma resposta recebida.</p>}</div></Card>}
  </div>;
}
