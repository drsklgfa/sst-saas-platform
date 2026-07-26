import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, Button, Input, Badge, Textarea } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { riskLevelTone } from '@/domain/inspections/validation';

export default async function InspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant } = await requireTenantPermission('inspection.manage');
  const inspection = await db.inspection.findFirst({
    where: { id, company: { tenantId: tenant.id } },
    include: {
      company: { include: { establishments: { where: { active: true }, include: { sectors: { where: { active: true }, include: { ghes: { where: { active: true } } } } } } } },
      ghe: true,
      items: { orderBy: { position: 'asc' } },
      evidences: { include: { file: true }, orderBy: [{ kind: 'asc' }, { position: 'asc' }] },
      risks: { orderBy: { initialScore: 'desc' } },
      calculations: { include: { methodology: true }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!inspection) notFound();
  const ghes = inspection.company.establishments.flatMap((establishment) => establishment.sectors.flatMap((sector) => sector.ghes));
  const metadata = inspection.metadata && typeof inspection.metadata === 'object' && !Array.isArray(inspection.metadata) ? inspection.metadata as Record<string, unknown> : {};
  const locked = inspection.status === 'REVIEWED';

  return <div>
    <div className="flex flex-wrap justify-between gap-3"><div><Link href={`/companies/${inspection.companyId}`} className="text-sm text-brand-700">← Voltar à empresa</Link><p className="mt-2 text-brand-700">Vistoria técnica</p><h1 className="text-3xl font-bold">{inspection.title}</h1><p className="text-slate-500">{inspection.company.legalName}{inspection.ghe ? ` · ${inspection.ghe.name}` : ''}</p></div><div className="flex items-start gap-2"><Badge tone={inspection.status === 'REVIEWED' ? 'success' : inspection.status === 'COMPLETED' ? 'warning' : 'neutral'}>{inspection.status}</Badge><Link href={`/companies/${inspection.companyId}/risks`} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold">Inventário</Link></div></div>

    <div className="mt-6 grid gap-4 md:grid-cols-4"><Card><p className="text-sm text-slate-500">Itens técnicos</p><p className="text-3xl font-bold">{inspection.items.length}</p></Card><Card><p className="text-sm text-slate-500">Cálculos</p><p className="text-3xl font-bold">{inspection.calculations.length}</p></Card><Card><p className="text-sm text-slate-500">Evidências</p><p className="text-3xl font-bold">{inspection.evidences.length}</p></Card><Card><p className="text-sm text-slate-500">Riscos vinculados</p><p className="text-3xl font-bold">{inspection.risks.length}</p></Card></div>

    <Card className="mt-6"><div className="flex justify-between"><div><h2 className="font-bold">Caracterização da vistoria</h2><p className="text-sm text-slate-500">Dados coletados uma única vez e reutilizados em relatórios.</p></div>{locked && <Badge tone="success">Imutável</Badge>}</div>
      <form action={`/api/inspections/${inspection.id}/details`} method="post" className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-medium md:col-span-2">Título<Input name="title" defaultValue={inspection.title} required disabled={locked} /></label>
        <label className="text-sm font-medium">GHE<select name="gheId" defaultValue={inspection.gheId ?? ''} disabled={locked} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 disabled:bg-slate-100"><option value="">Avaliação geral</option>{ghes.map((ghe) => <option key={ghe.id} value={ghe.id}>{ghe.code ? `${ghe.code} — ` : ''}{ghe.name}</option>)}</select></label>
        <label className="text-sm font-medium">Data<Input name="performedAt" type="date" defaultValue={(inspection.performedAt ?? inspection.createdAt).toISOString().slice(0, 10)} disabled={locked} /></label>
        <label className="text-sm font-medium md:col-span-2">Atividade observada<Textarea name="activity" defaultValue={String(metadata.activity ?? '')} disabled={locked} /></label>
        <label className="text-sm font-medium md:col-span-2">Ambiente e condições<Textarea name="environment" defaultValue={String(metadata.environment ?? '')} disabled={locked} /></label>
        <label className="text-sm font-medium md:col-span-2">Organização do trabalho<Textarea name="workOrganization" defaultValue={String(metadata.workOrganization ?? '')} disabled={locked} /></label>
        <label className="text-sm font-medium">Trabalhadores observados<Input name="observedWorkers" type="number" min="0" defaultValue={Number(metadata.observedWorkers ?? 0)} disabled={locked} /></label>
        <label className="text-sm font-medium">Participantes<Input name="participants" defaultValue={Array.isArray(metadata.participants) ? metadata.participants.join(', ') : ''} disabled={locked} /></label>
        <label className="text-sm font-medium md:col-span-2 xl:col-span-4">Notas gerais<Textarea name="notes" rows={4} defaultValue={inspection.notes ?? ''} disabled={locked} /></label>
        {!locked && <div className="md:col-span-2 xl:col-span-4"><Button>Salvar caracterização</Button></div>}
      </form>
    </Card>

    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <Card><h2 className="font-bold">Checklist técnico</h2><div className="mt-3 space-y-3">{inspection.items.map((item) => { const value = item.value && typeof item.value === 'object' && !Array.isArray(item.value) ? item.value as Record<string, unknown> : {}; return <div key={item.id} className="rounded-xl border p-3"><div className="flex justify-between gap-3"><div><p className="text-xs text-slate-500">{item.category} · {item.code}</p><p className="font-medium">{item.label}</p><p className="mt-1 text-sm text-slate-500">{String(value.observation ?? '') || 'Sem observação'}</p>{value.recommendation ? <p className="mt-1 text-sm text-brand-800">Recomendação: {String(value.recommendation)}</p> : null}</div><Badge tone={value.critical ? 'danger' : value.result === 'OK' ? 'success' : value.result === 'NC' ? 'warning' : 'neutral'}>{String(value.result ?? 'NA')}</Badge></div></div>; })}{!inspection.items.length && <p className="text-sm text-slate-500">Nenhum item registrado.</p>}</div>
        {!locked && <form action={`/api/inspections/${inspection.id}/items`} method="post" className="mt-4 grid gap-3 md:grid-cols-2"><label className="text-sm font-medium">Categoria<Input name="category" required placeholder="Postura, mobiliário..." /></label><label className="text-sm font-medium">Código<Input name="code" required placeholder="POSTURA_01" /></label><label className="text-sm font-medium md:col-span-2">Item avaliado<Input name="label" required /></label><label className="text-sm font-medium">Resultado<select name="result" className="mt-1 w-full rounded-xl border p-2.5"><option value="OK">Conforme</option><option value="NC">Não conforme</option><option value="NA">Não se aplica</option><option value="OBS">Observação</option></select></label><label className="flex items-center gap-2 self-end pb-3 text-sm"><input name="critical" type="checkbox" /> Item crítico</label><label className="text-sm font-medium md:col-span-2">Observação<Textarea name="observation" /></label><label className="text-sm font-medium md:col-span-2">Recomendação<Textarea name="recommendation" /></label><div className="md:col-span-2"><Button>Salvar item</Button></div></form>}
      </Card>

      <Card><h2 className="font-bold">Fotos, medições e documentos</h2><div className="mt-3 space-y-3">{inspection.evidences.map((evidence) => <div key={evidence.id} className="flex justify-between gap-3 rounded-xl border p-3"><div><a href={`/api/files/local?key=${encodeURIComponent(evidence.file.storageKey)}`} target="_blank" className="font-medium text-brand-700">{evidence.file.originalName}</a><p className="text-xs text-slate-500">{evidence.caption ?? 'Sem legenda'} · {formatDate(evidence.createdAt)}</p></div><Badge>{evidence.kind}</Badge></div>)}{!inspection.evidences.length && <p className="text-sm text-slate-500">Nenhuma evidência anexada.</p>}</div>
        {!locked && <form action={`/api/inspections/${inspection.id}/evidences`} method="post" encType="multipart/form-data" className="mt-4 grid gap-3 md:grid-cols-2"><label className="text-sm font-medium">Tipo<select name="kind" className="mt-1 w-full rounded-xl border p-2.5"><option value="PHOTO">Foto</option><option value="MEASUREMENT">Medição</option><option value="DOCUMENT">Documento</option><option value="OTHER">Outro</option></select></label><label className="text-sm font-medium">Arquivo<Input name="file" type="file" required /></label><label className="text-sm font-medium md:col-span-2">Legenda<Input name="caption" placeholder="Posto de trabalho, equipamento, condição observada..." /></label><div className="md:col-span-2"><Button>Anexar evidência</Button></div></form>}
      </Card>
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-3">
      <MethodCard title="NIOSH" action={`/api/inspections/${inspection.id}/calculate`} method="NIOSH" locked={locked} fields={['loadKg:Carga (kg):23:0.01:1000','horizontalCm:Distância horizontal (cm):25:1:1000','originHeightCm:Altura inicial (cm):75:0:500','verticalTravelCm:Deslocamento vertical (cm):25:1:1000','asymmetryDeg:Assimetria (graus):0:0:180','frequencyMultiplier:Multiplicador de frequência:1:0:1','couplingMultiplier:Multiplicador de pega:1:0:1','durationMultiplier:Multiplicador de duração:1:0:1']} />
      <MethodCard title="RULA" action={`/api/inspections/${inspection.id}/calculate`} method="RULA" locked={locked} fields={['upperArm:Braço:1:1:6','lowerArm:Antebraço:1:1:4','wrist:Punho:1:1:4','wristTwist:Rotação punho:1:1:2','neck:Pescoço:1:1:6','trunk:Tronco:1:1:6','legs:Pernas:1:1:2','muscleUse:Uso muscular:0:0:1','forceLoad:Carga/força:0:0:3']} />
      <MethodCard title="REBA" action={`/api/inspections/${inspection.id}/calculate`} method="REBA" locked={locked} fields={['trunk:Tronco:1:1:5','neck:Pescoço:1:1:3','legs:Pernas:1:1:4','upperArm:Braço:1:1:6','lowerArm:Antebraço:1:1:2','wrist:Punho:1:1:3','load:Carga:0:0:3','coupling:Pega:0:0:3','activity:Atividade:0:0:3']} />
    </div>

    <Card className="mt-6"><h2 className="font-bold">Memórias de cálculo</h2><div className="mt-3 divide-y">{inspection.calculations.map((calculation) => <div key={calculation.id} className="py-3"><div className="flex justify-between"><p className="font-medium">{calculation.methodology.name} · {calculation.classification}</p><span className="text-sm text-slate-500">Pontuação {calculation.score ?? '—'} · {formatDate(calculation.createdAt)}</span></div><details className="mt-2"><summary className="cursor-pointer text-sm text-brand-700">Ver memória</summary><pre className="mt-2 overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify({ inputs: calculation.inputs, outputs: calculation.outputs, engineVersion: calculation.engineVersion }, null, 2)}</pre></details></div>)}{!inspection.calculations.length && <p className="py-4 text-sm text-slate-500">Nenhum cálculo realizado.</p>}</div></Card>

    {inspection.risks.length > 0 && <Card className="mt-6"><div className="flex justify-between"><h2 className="font-bold">Riscos originados nesta vistoria</h2><Link href={`/companies/${inspection.companyId}/risks`} className="text-sm text-brand-700">Abrir inventário</Link></div><div className="mt-3 divide-y">{inspection.risks.map((risk) => <div key={risk.id} className="flex justify-between py-3"><div><p className="font-medium">{risk.code} · {risk.hazard}</p><p className="text-xs text-slate-500">{risk.category}</p></div><Badge tone={riskLevelTone(risk.initialLevel)}>{risk.initialLevel} · {risk.initialScore}</Badge></div>)}</div></Card>}

    <Card className="mt-6"><h2 className="font-bold">Ciclo da vistoria</h2><form action={`/api/inspections/${inspection.id}/status`} method="post" className="mt-3 flex flex-wrap gap-3"><select name="status" defaultValue={inspection.status} className="rounded-xl border p-2.5"><option value="DRAFT">Rascunho</option><option value="IN_PROGRESS">Em andamento</option><option value="COMPLETED">Concluída</option><option value="REVIEWED">Revisada e bloqueada</option></select>{inspection.status === 'REVIEWED' && <Input name="reason" placeholder="Justificativa para reabrir" className="max-w-md" />}<Button>Atualizar status</Button></form></Card>
  </div>;
}

function MethodCard({ title, action, method, fields, locked }: { title: string; action: string; method: string; fields: string[]; locked: boolean }) {
  return <Card><h2 className="font-bold">{title}</h2><form action={action} method="post" className="mt-4 grid grid-cols-2 gap-3"><input type="hidden" name="method" value={method} />{fields.map((item) => { const [name, label, value, min, max] = item.split(':'); return <label key={name} className="block text-xs font-medium">{label}<Input name={name} type="number" step="0.01" min={min} max={max} defaultValue={value} disabled={locked} className="mt-1" /></label>; })}{!locked && <Button className="col-span-2 w-full">Calcular {title}</Button>}</form></Card>;
}
