import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { getTenantSystemStatus } from '@/domain/system-status';
import { Card, Badge } from '@/components/ui';

const tone = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => status === 'OK' ? 'success' : status === 'STALE' || status === 'UNKNOWN' || status === 'EMPTY' ? 'warning' : 'danger';

export default async function SystemPage() {
  const { tenant } = await requireTenantPermission('system.read');
  const [status, recentJobs, tests] = await Promise.all([
    getTenantSystemStatus(tenant.id),
    db.job.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
    db.recoveryTest.findMany({ where: { tenantId: tenant.id }, include: { backupExport: { select: { type: true, createdAt: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);
  return <div className="max-w-7xl"><h1 className="text-3xl font-bold">Saúde do sistema</h1><p className="text-slate-500">Banco, Worker, armazenamento, filas, backups e testes de recuperação.</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Card><p className="text-sm text-slate-500">Banco de dados</p><Badge tone={tone(status.database)}>{status.database}</Badge></Card><Card><p className="text-sm text-slate-500">Worker</p><Badge tone={tone(status.worker.status)}>{status.worker.status}</Badge><p className="mt-2 text-xs text-slate-500">{status.worker.lastSeenAt?.toLocaleString('pt-BR') ?? 'sem heartbeat'}</p></Card><Card><p className="text-sm text-slate-500">Armazenamento</p><Badge tone={tone(status.storage)}>{status.storage}</Badge></Card><Card><p className="text-sm text-slate-500">Incidentes em aberto</p><p className="mt-1 text-2xl font-bold">{status.incidentsOpen}</p></Card></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2"><Card><h2 className="font-bold">Fila de processamento</h2><div className="mt-4 grid grid-cols-3 gap-3 text-center"><div className="rounded-xl bg-slate-50 p-3"><p className="text-2xl font-bold">{status.jobs.queued}</p><p className="text-xs text-slate-500">Aguardando</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-2xl font-bold">{status.jobs.running}</p><p className="text-xs text-slate-500">Executando</p></div><div className="rounded-xl bg-rose-50 p-3"><p className="text-2xl font-bold text-rose-700">{status.jobs.failed}</p><p className="text-xs text-slate-500">Falharam</p></div></div><p className="mt-4 text-sm text-slate-500">Sessões expiradas aguardando retenção: {status.expiredSessions}</p><p className="mt-1 text-sm text-slate-500">Último backup aprovado: {status.latestBackup?.completedAt?.toLocaleString('pt-BR') ?? 'nenhum'}</p></Card>
      <Card><h2 className="font-bold">Testes de recuperação</h2><div className="mt-3 divide-y">{tests.map((test) => <div key={test.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{test.backupExport.type}</p><p className="text-xs text-slate-500">{test.createdAt.toLocaleString('pt-BR')}{test.error ? ` · ${test.error}` : ''}</p></div><Badge tone={test.status === 'PASSED' ? 'success' : test.status === 'FAILED' ? 'danger' : 'warning'}>{test.status}</Badge></div>)}{!tests.length && <p className="py-4 text-sm text-slate-500">Nenhum teste executado.</p>}</div></Card></div>
    <Card className="mt-6"><h2 className="font-bold">Jobs recentes</h2><div className="mt-3 divide-y">{recentJobs.map((job) => <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{job.type}</p><p className="text-xs text-slate-500">{job.createdAt.toLocaleString('pt-BR')} · tentativas {job.attempts}/{job.maxAttempts}{job.error ? ` · ${job.error.slice(0, 180)}` : ''}</p></div><Badge tone={job.status === 'SUCCEEDED' ? 'success' : job.status === 'FAILED' ? 'danger' : 'warning'}>{job.status}</Badge></div>)}</div></Card>
  </div>;
}
