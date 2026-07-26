import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasTenantPermission } from '@/lib/rbac';
import { Card, Button, Input, Badge, Textarea } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { riskLevelTone } from '@/domain/inspections/validation';

const levels = ['VERY_LOW', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const;

export default async function RisksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant, membership } = await requireTenantPermission('company.read');
  const canManage = hasTenantPermission(membership.role, 'inspection.manage', membership.permissions);
  const company = await db.company.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      establishments: { where: { active: true }, include: { sectors: { where: { active: true }, include: { ghes: { where: { active: true } } } } } },
      inspections: { orderBy: { createdAt: 'desc' } },
      risks: { include: { ghe: true, inspection: true, actions: true }, orderBy: [{ status: 'asc' }, { initialScore: 'desc' }, { code: 'asc' }] },
    },
  });
  if (!company) notFound();
  const ghes = company.establishments.flatMap((establishment) => establishment.sectors.flatMap((sector) => sector.ghes));
  const activeRisks = company.risks.filter((risk) => risk.status === 'ACTIVE');
  const highRisks = activeRisks.filter((risk) => risk.initialLevel === 'HIGH' || risk.initialLevel === 'CRITICAL');
  const withoutAction = highRisks.filter((risk) => risk.actions.length === 0);

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><Link href={`/companies/${id}`} className="text-sm text-brand-700">← Voltar à empresa</Link><h1 className="mt-1 text-3xl font-bold">Inventário de riscos</h1><p className="text-slate-500">{company.tradeName ?? company.legalName}</p></div><Link href={`/companies/${id}/actions`} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold">Plano de ação</Link></div>
    <div className="mt-6 grid gap-4 md:grid-cols-4"><Card><p className="text-sm text-slate-500">Riscos ativos</p><p className="text-3xl font-bold">{activeRisks.length}</p></Card><Card><p className="text-sm text-slate-500">Altos ou críticos</p><p className="text-3xl font-bold text-rose-700">{highRisks.length}</p></Card><Card><p className="text-sm text-slate-500">Sem ação vinculada</p><p className="text-3xl font-bold text-amber-700">{withoutAction.length}</p></Card><Card><p className="text-sm text-slate-500">Arquivados</p><p className="text-3xl font-bold">{company.risks.length - activeRisks.length}</p></Card></div>

    {canManage && <Card className="mt-6"><h2 className="font-bold">Cadastrar risco</h2><p className="mt-1 text-sm text-slate-500">A matriz usa severidade × probabilidade × exposição, todos de 1 a 5.</p><RiskForm action={`/api/companies/${id}/risks`} ghes={ghes} inspections={company.inspections} /></Card>}

    <div className="mt-6 space-y-4">{company.risks.map((risk) => <Card key={risk.id} className={risk.status !== 'ACTIVE' ? 'opacity-70' : ''}><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs text-slate-500">{risk.code} · {risk.category}{risk.ghe ? ` · ${risk.ghe.name}` : ''}</p><h2 className="font-bold">{risk.hazard}</h2><p className="mt-1 text-sm text-slate-500">{risk.source ?? 'Fonte não informada'} · {risk.exposedCount} exposto(s)</p></div><div className="flex gap-2"><Badge tone={riskLevelTone(risk.initialLevel)}>Inicial: {risk.initialLevel} ({risk.initialScore})</Badge>{risk.residualLevel && <Badge tone={riskLevelTone(risk.residualLevel)}>Residual: {risk.residualLevel} ({risk.residualScore})</Badge>}<Badge>{risk.status}</Badge></div></div>
      <div className="mt-3 grid gap-3 text-sm md:grid-cols-3"><div><b>Danos possíveis:</b> {risk.possibleHarm ?? '—'}</div><div><b>Frequência/duração:</b> {risk.frequency ?? '—'} / {risk.duration ?? '—'}</div><div><b>Próxima revisão:</b> {formatDate(risk.reviewDueAt)}</div></div>
      <div className="mt-3 text-sm"><b>Controles existentes:</b> {Array.isArray(risk.existingControls) ? risk.existingControls.join(', ') || '—' : '—'}</div>
      {canManage && <details className="mt-4 rounded-xl border p-3"><summary className="cursor-pointer font-semibold">Editar avaliação</summary><RiskForm action={`/api/risks/${risk.id}`} ghes={ghes} inspections={company.inspections} risk={risk} /><form action={`/api/risks/${risk.id}`} method="post" className="mt-3"><input type="hidden" name="operation" value={risk.status === 'ACTIVE' ? 'archive' : 'reactivate'} /><Button className={risk.status === 'ACTIVE' ? 'bg-rose-700 hover:bg-rose-800' : ''}>{risk.status === 'ACTIVE' ? 'Arquivar risco' : 'Reativar risco'}</Button></form></details>}
    </Card>)}{!company.risks.length && <Card><p className="text-sm text-slate-500">Nenhum risco cadastrado.</p></Card>}</div>
  </div>;
}

function RiskForm({ action, ghes, inspections, risk }: { action: string; ghes: Array<{ id: string; name: string; code: string | null }>; inspections: Array<{ id: string; title: string }>; risk?: any }) {
  const controls = Array.isArray(risk?.existingControls) ? risk.existingControls.join('\n') : '';
  const references = Array.isArray(risk?.legalReferences) ? risk.legalReferences.join('\n') : '';
  const assessmentBasis = risk?.assessmentBasis && typeof risk.assessmentBasis === 'object' && !Array.isArray(risk.assessmentBasis) ? risk.assessmentBasis as Record<string, any> : {};
  const basis = String(assessmentBasis.observations ?? '');
  const residualInputs = assessmentBasis.residualInputs && typeof assessmentBasis.residualInputs === 'object' ? assessmentBasis.residualInputs as Record<string, number> : {};
  return <form action={action} method="post" className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
    {!risk && <label className="text-sm font-medium">Código<Input name="code" required placeholder="R-001" /></label>}
    <label className="text-sm font-medium">Categoria<Input name="category" defaultValue={risk?.category ?? ''} required placeholder="Ergonômico, físico..." /></label>
    <label className="text-sm font-medium md:col-span-2">Perigo ou fator<Input name="hazard" defaultValue={risk?.hazard ?? ''} required /></label>
    <label className="text-sm font-medium">GHE<select name="gheId" defaultValue={risk?.gheId ?? ''} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5"><option value="">Geral</option>{ghes.map((ghe) => <option key={ghe.id} value={ghe.id}>{ghe.code ? `${ghe.code} — ` : ''}{ghe.name}</option>)}</select></label>
    {!risk && <label className="text-sm font-medium">Vistoria de origem<select name="inspectionId" className="mt-1 w-full rounded-xl border border-slate-300 p-2.5"><option value="">Sem vínculo</option>{inspections.map((inspection) => <option key={inspection.id} value={inspection.id}>{inspection.title}</option>)}</select></label>}
    <label className="text-sm font-medium">Expostos<Input name="exposedCount" type="number" min="0" defaultValue={risk?.exposedCount ?? 0} /></label>
    <label className="text-sm font-medium">Metodologia<Input name="methodology" defaultValue={risk?.methodology ?? ''} placeholder="Matriz 5x5, observação..." /></label>
    <label className="text-sm font-medium md:col-span-2">Fonte / circunstância<Textarea name="source" defaultValue={risk?.source ?? ''} /></label>
    <label className="text-sm font-medium md:col-span-2">Possíveis danos<Textarea name="possibleHarm" defaultValue={risk?.possibleHarm ?? ''} /></label>
    <label className="text-sm font-medium">Frequência<Input name="frequency" defaultValue={risk?.frequency ?? ''} /></label><label className="text-sm font-medium">Duração<Input name="duration" defaultValue={risk?.duration ?? ''} /></label>
    <ScoreField name="severity" label="Severidade inicial" value={risk?.severity ?? 1} /><ScoreField name="probability" label="Probabilidade inicial" value={risk?.probability ?? 1} /><ScoreField name="exposure" label="Exposição inicial" value={risk?.exposure ?? 1} />
    <label className="text-sm font-medium">Eficácia controles (%)<Input name="controlEffectiveness" type="number" min="0" max="100" defaultValue={risk?.controlEffectiveness ?? ''} /></label>
    <ScoreField name="residualSeverity" label="Severidade residual" value={residualInputs.severity ?? ''} optional /><ScoreField name="residualProbability" label="Probabilidade residual" value={residualInputs.probability ?? ''} optional /><ScoreField name="residualExposure" label="Exposição residual" value={residualInputs.exposure ?? ''} optional />
    <label className="text-sm font-medium">Próxima revisão<Input name="reviewDueAt" type="date" defaultValue={risk?.reviewDueAt ? new Date(risk.reviewDueAt).toISOString().slice(0, 10) : ''} /></label>
    <label className="text-sm font-medium md:col-span-2">Controles existentes<Textarea name="existingControls" defaultValue={controls} placeholder="Um controle por linha" /></label>
    <label className="text-sm font-medium md:col-span-2">Referências legais/técnicas<Textarea name="legalReferences" defaultValue={references} placeholder="Uma referência por linha" /></label>
    <label className="text-sm font-medium md:col-span-2 xl:col-span-4">Base da avaliação<Textarea name="assessmentBasis" defaultValue={basis} /></label>
    <div className="md:col-span-2 xl:col-span-4"><Button>{risk ? 'Salvar avaliação' : 'Cadastrar risco'}</Button></div>
  </form>;
}
function ScoreField({ name, label, value, optional = false }: { name: string; label: string; value: number | string; optional?: boolean }) { return <label className="text-sm font-medium">{label}<Input name={name} type="number" min="1" max="5" defaultValue={value} required={!optional} /></label>; }
