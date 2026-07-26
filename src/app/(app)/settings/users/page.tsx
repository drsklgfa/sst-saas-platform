import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, Button, Input, Badge } from '@/components/ui';

export default async function TeamUsersPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const query = await searchParams;
  const { tenant, user } = await requireTenantPermission('settings.manage');
  const memberships = await db.membership.findMany({ where: { tenantId: tenant.id }, include: { user: true }, orderBy: { createdAt: 'asc' } });

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-bold">Equipe da consultoria</h1>
      <p className="text-slate-500">Perfis internos, convites, suspensão e revogação de sessões.</p>
      {query.invite && <Card className="mt-6 border-brand-200 bg-brand-50"><h2 className="font-bold text-brand-800">Convite interno criado</h2><p className="mt-1 text-sm text-brand-700">Envie o endereço abaixo ao integrante. O link expira em 72 horas.</p><code className="mt-3 block break-all rounded-xl bg-white p-3 text-sm">{query.invite}</code></Card>}
      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card><h2 className="font-bold">Adicionar integrante</h2><form action="/api/settings/users" method="post" className="mt-4 space-y-4"><input type="hidden" name="operation" value="create" /><label className="block text-sm font-medium">Nome<Input name="name" required maxLength={150} className="mt-1" /></label><label className="block text-sm font-medium">E-mail<Input name="email" type="email" required className="mt-1" /></label><label className="block text-sm font-medium">Perfil<select name="role" className="mt-1 w-full rounded-xl border border-slate-300 p-2.5"><option value="ADMIN">Administrador</option><option value="RESPONSIBLE_TECH">Responsável técnico</option><option value="CONSULTANT">Consultor</option><option value="ASSISTANT">Assistente</option><option value="REVIEWER">Revisor</option><option value="COMMERCIAL">Comercial</option><option value="FINANCE">Financeiro</option><option value="READER">Leitor</option><option value="OWNER">Proprietário</option></select></label><Button className="w-full">Gerar convite</Button></form></Card>
        <Card><h2 className="font-bold">Integrantes</h2><div className="mt-3 divide-y">{memberships.map((membership) => <div key={membership.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{membership.user.name}{membership.userId === user.id ? ' · você' : ''}</p><p className="text-sm text-slate-500">{membership.user.email} · {membership.role}</p></div><div className="flex items-center gap-2"><Badge tone={membership.active ? 'success' : 'neutral'}>{membership.active ? 'Ativo' : 'Suspenso'}</Badge>{membership.userId !== user.id && <form action="/api/settings/users" method="post"><input type="hidden" name="membershipId" value={membership.id} /><input type="hidden" name="operation" value={membership.active ? 'suspend' : 'reactivate'} /><button className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${membership.active ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{membership.active ? 'Suspender' : 'Reativar'}</button></form>}{membership.active && <form action="/api/settings/users" method="post"><input type="hidden" name="membershipId" value={membership.id} /><input type="hidden" name="operation" value="reinvite" /><button className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold">Novo convite</button></form>}</div></div>)}</div></Card>
      </div>
    </div>
  );
}
