import { notFound } from 'next/navigation';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, Button, Input, Badge } from '@/components/ui';

export default async function AccessesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ invite?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const { tenant } = await requireTenantPermission('access.manage');
  const company = await db.company.findFirst({
    where: { id, tenantId: tenant.id },
    include: { accesses: { include: { user: true }, orderBy: { createdAt: 'asc' } } },
  });
  if (!company) notFound();

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold">Acessos do cliente</h1>
      <p className="text-slate-500">{company.tradeName ?? company.legalName}</p>
      {query.invite && <Card className="mt-6 border-brand-200 bg-brand-50"><h2 className="font-bold text-brand-800">Convite criado</h2><p className="mt-1 text-sm text-brand-700">Copie e envie este link manualmente ao responsável da empresa. Ele expira em 72 horas.</p><code className="mt-3 block break-all rounded-xl bg-white p-3 text-sm">{query.invite}</code></Card>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card><h2 className="font-bold">Novo acesso</h2><form action={`/api/companies/${company.id}/accesses`} method="post" className="mt-4 space-y-4"><input type="hidden" name="operation" value="create" /><label className="block text-sm font-medium">Nome<Input name="name" required maxLength={150} className="mt-1" /></label><label className="block text-sm font-medium">E-mail<Input name="email" type="email" required className="mt-1" /></label><label className="block text-sm font-medium">Perfil<select name="role" className="mt-1 w-full rounded-xl border border-slate-300 p-2.5"><option value="RH_ADMIN">RH administrador</option><option value="SST">SST</option><option value="MANAGER">Gestor</option><option value="ACTION_OWNER">Responsável por ações</option><option value="DIRECTOR">Diretoria</option><option value="READER">Leitor</option><option value="AUDITOR">Auditor temporário</option></select></label><Button className="w-full">Gerar convite</Button></form></Card>
        <Card><h2 className="font-bold">Usuários vinculados</h2><div className="mt-3 divide-y">{company.accesses.map((access) => <div key={access.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{access.user.name}</p><p className="text-sm text-slate-500">{access.user.email} · {access.role}</p></div><div className="flex items-center gap-2"><Badge tone={access.active ? 'success' : 'neutral'}>{access.active ? 'Ativo' : 'Suspenso'}</Badge><form action={`/api/companies/${company.id}/accesses`} method="post"><input type="hidden" name="accessId" value={access.id} /><input type="hidden" name="operation" value={access.active ? 'suspend' : 'reactivate'} /><button className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${access.active ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{access.active ? 'Suspender' : 'Reativar'}</button></form>{access.active && <form action={`/api/companies/${company.id}/accesses`} method="post"><input type="hidden" name="accessId" value={access.id} /><input type="hidden" name="operation" value="reinvite" /><button className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold">Novo convite</button></form>}</div></div>)}{!company.accesses.length && <p className="py-4 text-sm text-slate-500">Nenhum acesso cadastrado.</p>}</div></Card>
      </div>
    </div>
  );
}
