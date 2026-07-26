import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { ensureTenantSecurityPolicy } from '@/domain/retention';
import { Badge, Button, Card, Input } from '@/components/ui';

const statusLabel: Record<string, string> = { OPEN: 'Aberto', INVESTIGATING: 'Investigando', CONTAINED: 'Contido', RESOLVED: 'Resolvido', CLOSED: 'Encerrado' };
const severityTone = (severity: string): 'danger' | 'warning' | 'neutral' => severity === 'CRITICAL' || severity === 'HIGH' ? 'danger' : severity === 'MEDIUM' ? 'warning' : 'neutral';

export default async function SecuritySettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const { tenant } = await requireTenantPermission('security.manage');
  const policy = await ensureTenantSecurityPolicy(tenant.id);
  const incidents = await db.securityIncident.findMany({ where: { tenantId: tenant.id }, include: { owner: { select: { name: true } } }, orderBy: [{ status: 'asc' }, { detectedAt: 'desc' }], take: 50 });

  return <div className="max-w-7xl">
    <h1 className="text-3xl font-bold">Segurança, retenção e incidentes</h1>
    <p className="text-slate-500">Políticas operacionais, retenção mínima, preservação legal e registro de incidentes.</p>
    {(query.saved || query.retention || query.incident) && <Card className="mt-5 border-emerald-200 bg-emerald-50"><p className="text-sm font-medium text-emerald-800">Alteração registrada com sucesso.</p></Card>}

    <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <Card><h2 className="font-bold">Política de retenção</h2><p className="mt-1 text-sm text-slate-500">Dados técnicos e documentos não são apagados por esta rotina. A limpeza automática atua somente sobre dados operacionais temporários.</p>
        <form action="/api/settings/security-policy" method="post" className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium">Notificações lidas (dias)<Input name="notificationRetentionDays" type="number" min="30" max="3650" defaultValue={policy.notificationRetentionDays} className="mt-1" /></label>
          <label className="block text-sm font-medium">Jobs concluídos (dias)<Input name="jobRetentionDays" type="number" min="7" max="3650" defaultValue={policy.jobRetentionDays} className="mt-1" /></label>
          <label className="block text-sm font-medium">Sessões expiradas (dias)<Input name="expiredSessionRetentionDays" type="number" min="1" max="365" defaultValue={policy.expiredSessionRetentionDays} className="mt-1" /></label>
          <label className="block text-sm font-medium">Convites expirados (dias)<Input name="inviteRetentionDays" type="number" min="1" max="365" defaultValue={policy.inviteRetentionDays} className="mt-1" /></label>
          <label className="block text-sm font-medium">Revisar ausência de backup após (dias)<Input name="backupReviewDays" type="number" min="1" max="365" defaultValue={policy.backupReviewDays} className="mt-1" /></label>
          <label className="block text-sm font-medium">Logs de auditoria (dias)<Input name="auditRetentionDays" type="number" min="365" max="36500" defaultValue={policy.auditRetentionDays} className="mt-1" /></label>
          <label className="flex items-start gap-3 rounded-xl border p-3 text-sm"><input name="legalHold" type="checkbox" defaultChecked={policy.legalHold} className="mt-1" /><span><strong>Preservação legal</strong><br /><span className="text-slate-500">Suspende toda limpeza automática enquanto houver litígio, fiscalização ou investigação.</span></span></label>
          <label className="flex items-start gap-3 rounded-xl border p-3 text-sm"><input name="auditDeletionEnabled" type="checkbox" defaultChecked={policy.auditDeletionEnabled} disabled={policy.legalHold} className="mt-1" /><span><strong>Permitir limpeza de auditoria</strong><br /><span className="text-slate-500">Desativado por padrão. Nunca reduza o prazo sem avaliação jurídica.</span></span></label>
          <div className="md:col-span-2 flex flex-wrap gap-3"><Button>Salvar política</Button></div>
        </form>
        <form action="/api/settings/security-policy" method="post" className="mt-3"><input type="hidden" name="operation" value="run_retention" /><Button variant="secondary">Executar limpeza operacional agora</Button></form>
        <p className="mt-3 text-xs text-slate-500">Última execução: {policy.lastRetentionRunAt?.toLocaleString('pt-BR') ?? 'ainda não executada'}.</p>
      </Card>

      <Card><h2 className="font-bold">Registrar incidente</h2><form action="/api/settings/incidents" method="post" className="mt-4 space-y-4">
        <label className="block text-sm font-medium">Título<Input name="title" required minLength={3} maxLength={180} className="mt-1" /></label>
        <label className="block text-sm font-medium">Gravidade<select name="severity" className="mt-1 w-full rounded-xl border border-slate-300 p-2.5"><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option><option value="CRITICAL">Crítica</option></select></label>
        <label className="block text-sm font-medium">Descrição<textarea name="description" required minLength={5} maxLength={10000} rows={7} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
        <Button className="w-full">Registrar incidente</Button>
      </form></Card>
    </div>

    <Card className="mt-6"><h2 className="font-bold">Registro de incidentes</h2><div className="mt-3 divide-y">{incidents.map((incident) => <div key={incident.id} className="py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{incident.title}</p><p className="mt-1 max-w-3xl whitespace-pre-wrap text-sm text-slate-600">{incident.description}</p><p className="mt-1 text-xs text-slate-500">Detectado em {incident.detectedAt.toLocaleString('pt-BR')} · responsável: {incident.owner?.name ?? 'não definido'}</p></div><div className="flex gap-2"><Badge tone={severityTone(incident.severity)}>{incident.severity}</Badge><Badge tone={['RESOLVED','CLOSED'].includes(incident.status) ? 'success' : 'warning'}>{statusLabel[incident.status] ?? incident.status}</Badge></div></div>
          <form action={`/api/settings/incidents/${incident.id}`} method="post" className="mt-4 grid gap-3 md:grid-cols-[160px_160px_1fr_auto]"><select name="severity" defaultValue={incident.severity} className="rounded-xl border p-2.5"><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option><option value="CRITICAL">Crítica</option></select><select name="status" defaultValue={incident.status} className="rounded-xl border p-2.5"><option value="OPEN">Aberto</option><option value="INVESTIGATING">Investigando</option><option value="CONTAINED">Contido</option><option value="RESOLVED">Resolvido</option><option value="CLOSED">Encerrado</option></select><Input name="note" placeholder="Ação tomada ou observação" maxLength={4000} /><Button>Atualizar</Button></form>
        </div>)}{!incidents.length && <p className="py-5 text-sm text-slate-500">Nenhum incidente registrado.</p>}</div></Card>
  </div>;
}
