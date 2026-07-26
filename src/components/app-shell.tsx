import Link from 'next/link';
import { requireTenant } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasTenantPermission } from '@/lib/rbac';

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { user, membership } = await requireTenant();
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
  const canReadCompanies = hasTenantPermission(membership.role, 'company.read', membership.permissions);
  const canCampaign = hasTenantPermission(membership.role, 'campaign.manage', membership.permissions);
  const canMessage = hasTenantPermission(membership.role, 'message.manage', membership.permissions);
  const canBackup = hasTenantPermission(membership.role, 'backup.manage', membership.permissions);
  const canSettings = hasTenantPermission(membership.role, 'settings.manage', membership.permissions);
  const canAudit = hasTenantPermission(membership.role, 'audit.read', membership.permissions);
  const canSecurity = hasTenantPermission(membership.role, 'security.manage', membership.permissions);
  const canSystem = hasTenantPermission(membership.role, 'system.read', membership.permissions);

  return (
    <div className="shell">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
          <Link href="/dashboard" className="font-bold text-brand-700">Plataforma SST</Link>
          <nav className="flex items-center gap-4 text-sm">
            {canReadCompanies && <Link href="/dashboard">Painel</Link>}
            {canReadCompanies && <Link href="/companies">Empresas</Link>}
            {canCampaign && <Link href="/questionnaires">Questionários</Link>}
            {canMessage && <Link href="/messages">Mensagens</Link>}
            <Link href="/notifications">Notificações{unread ? ` (${unread})` : ''}</Link>
            {canBackup && <Link href="/backups">Backups</Link>}
            {canSettings && <Link href="/settings/users">Equipe</Link>}
            {canSettings && <Link href="/settings/templates">Modelos</Link>}
            {canAudit && <Link href="/settings/audit">Auditoria</Link>}
            {canSecurity && <Link href="/settings/security">Segurança</Link>}
            {canSystem && <Link href="/settings/system">Sistema</Link>}
            <span className="rounded-full bg-slate-100 px-3 py-1">{user.name}</span>
            <form action="/api/auth/logout" method="post"><button>Sair</button></form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-7">{children}</main>
    </div>
  );
}
