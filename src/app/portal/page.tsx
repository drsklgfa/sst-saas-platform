import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import { Card, Badge } from '@/components/ui';
import { hasCompanyPermission } from '@/lib/rbac';

export default async function Portal() {
  const user = await requireUser();
  const [accesses, unreadNotifications] = await Promise.all([db.companyAccess.findMany({
    where: { userId: user.id, active: true, company: { status: 'ACTIVE' } },
    include: { company: true },
    orderBy: { createdAt: 'asc' },
  }), db.notification.count({ where: { userId: user.id, readAt: null } })]);

  if (!accesses.length) {
    return (
      <main className="shell min-h-screen p-8">
        <Card className="mx-auto max-w-xl"><h1 className="text-2xl font-bold">Sem acesso empresarial</h1><p className="mt-2 text-slate-500">Sua conta ainda não foi vinculada a uma empresa.</p></Card>
      </main>
    );
  }

  const rows = await Promise.all(accesses.map(async (access) => {
    const canDocuments = hasCompanyPermission(access.role, 'document.read', access.permissions);
    const canActions = hasCompanyPermission(access.role, 'action.read', access.permissions);
    const canDashboard = hasCompanyPermission(access.role, 'portal.dashboard', access.permissions);
    const [documents, actions, campaigns] = await Promise.all([
      canDocuments ? db.document.count({ where: { companyId: access.companyId, releasedToCompany: true } }) : Promise.resolve(0),
      canActions ? db.actionItem.count({ where: { actionPlan: { companyId: access.companyId } } }) : Promise.resolve(0),
      canDashboard ? db.campaign.count({ where: { companyId: access.companyId, status: { in: ['ACTIVE', 'REOPENED'] } } }) : Promise.resolve(0),
    ]);
    return { access, documents, actions, campaigns };
  }));

  return (
    <main className="shell min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3"><h1 className="text-3xl font-bold">Portal da empresa</h1><div className="flex items-center gap-3"><Link href="/portal/notifications" className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold">Notificações{unreadNotifications ? ` (${unreadNotifications})` : ''}</Link><form action="/api/auth/logout" method="post"><button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Sair</button></form></div></div>
        <div className="mt-6 grid gap-5">
          {rows.map(({ access, documents, actions, campaigns }) => (
            <Card key={access.id}>
              <div className="flex justify-between"><div><h2 className="text-xl font-bold">{access.company.tradeName ?? access.company.legalName}</h2><p className="text-sm text-slate-500">Perfil: {access.role}</p></div><Badge tone="success">Acesso ativo</Badge></div>
              <div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-sm text-slate-500">Documentos liberados</p><p className="text-2xl font-bold">{documents}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-sm text-slate-500">Ações</p><p className="text-2xl font-bold">{actions}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-sm text-slate-500">Campanhas ativas</p><p className="text-2xl font-bold">{campaigns}</p></div></div>
              <div className="mt-4"><Link href={`/portal/company/${access.company.id}`} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Abrir empresa</Link></div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
