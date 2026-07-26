import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { storage } from '@/lib/storage';
import { Card, Button, Input, Badge } from '@/components/ui';

export default async function Backups() {
  const { tenant } = await requireTenantPermission('backup.manage');
  const companies = await db.company.findMany({ where: { tenantId: tenant.id, status: 'ACTIVE' }, orderBy: { legalName: 'asc' } });
  const backups = await db.backupExport.findMany({ where: { tenantId: tenant.id }, include: { recoveryTests: { orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' }, take: 30 });
  const rows = await Promise.all(backups.map(async (backup) => {
    if (!backup.fileObjectId) return { ...backup, url: null, name: null };
    const object = await db.fileObject.findUnique({ where: { id: backup.fileObjectId } });
    return { ...backup, url: object ? await storage.signedUrl(object.storageKey, 3600) : null, name: object?.originalName ?? null };
  }));
  return <div><h1 className="text-3xl font-bold">Backup e portabilidade</h1><p className="text-slate-500">Exporte uma empresa ou toda a plataforma, guarde no computador e restaure em outra instalação.</p>
    <div className="mt-6 grid gap-6 xl:grid-cols-3">
      <Card><h2 className="font-bold">Backup de empresa</h2><form action="/api/backups" method="post" className="mt-4 space-y-4"><select name="companyId" required className="w-full rounded-xl border p-2.5">{companies.map((company) => <option key={company.id} value={company.id}>{company.legalName}</option>)}</select><label className="block text-sm font-medium">Senha opcional<Input name="password" type="password" className="mt-1" minLength={8} /></label><Button className="w-full">Gerar empresa</Button></form></Card>
      <Card><h2 className="font-bold">Backup completo</h2><p className="mt-2 text-sm text-slate-500">Inclui todas as empresas em pacotes restauráveis, modelos e configurações portáveis.</p><form action="/api/backups/platform" method="post" className="mt-4 space-y-4"><label className="block text-sm font-medium">Senha opcional<Input name="password" type="password" className="mt-1" minLength={8} /></label><Button className="w-full">Gerar plataforma completa</Button></form></Card>
      <Card><h2 className="font-bold">Restaurar backup</h2><form action="/api/backups/import" method="post" encType="multipart/form-data" className="mt-4 space-y-4"><Input name="file" type="file" accept=".zip,.sstbackup" required /><Input name="password" type="password" placeholder="Senha, quando houver" /><Button className="w-full">Validar e restaurar</Button></form><p className="mt-3 text-xs text-slate-500">A restauração cria empresas novas, preservando a instalação atual.</p></Card>
    </div>
    <Card className="mt-6"><h2 className="font-bold">Histórico</h2><div className="mt-3 divide-y">{rows.map((backup) => <div key={backup.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{backup.name ?? backup.type}</p><p className="text-xs text-slate-500">{backup.type} · {backup.createdAt.toLocaleString('pt-BR')} · {backup.encrypted ? 'Criptografado' : 'Sem senha'}</p></div><div className="flex flex-wrap items-center gap-3"><Badge tone={backup.status === 'SUCCEEDED' ? 'success' : backup.status === 'FAILED' ? 'danger' : 'neutral'}>{backup.status}</Badge>{backup.recoveryTests[0] && <Badge tone={backup.recoveryTests[0].status === 'PASSED' ? 'success' : backup.recoveryTests[0].status === 'FAILED' ? 'danger' : 'warning'}>Integridade: {backup.recoveryTests[0].status}</Badge>}{backup.url && <a href={backup.url} className="text-sm font-semibold text-brand-700">Baixar</a>}{backup.status === 'SUCCEEDED' && <form action={`/api/backups/${backup.id}/integrity`} method="post" className="flex items-center gap-2">{backup.encrypted && <Input name="password" type="password" placeholder="Senha do backup" className="h-9 w-40" />}<button className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold">Testar integridade</button></form>}</div></div>)}{!rows.length && <p className="py-4 text-sm text-slate-500">Nenhum backup gerado.</p>}</div></Card>
  </div>;
}
