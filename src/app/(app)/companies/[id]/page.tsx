import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { whatsappUrl } from '@/lib/phone';
import { hasTenantPermission } from '@/lib/rbac';

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant, membership } = await requireTenantPermission('company.read');
  const canWrite = hasTenantPermission(membership.role, 'company.write', membership.permissions);
  const canManageAccess = hasTenantPermission(membership.role, 'access.manage', membership.permissions);
  const canCampaign = hasTenantPermission(membership.role, 'campaign.manage', membership.permissions);
  const canInspect = hasTenantPermission(membership.role, 'inspection.manage', membership.permissions);
  const canDocument = hasTenantPermission(membership.role, 'document.edit', membership.permissions);
  const canMessage = hasTenantPermission(membership.role, 'message.manage', membership.permissions);

  const company = await db.company.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      contacts: { where: { active: true }, orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] },
      establishments: { include: { sectors: { include: { ghes: true } } } },
      campaigns: { include: { responseSessions: { where: { status: 'SUBMITTED' } } }, orderBy: { createdAt: 'desc' } },
      inspections: { orderBy: { createdAt: 'desc' }, take: 8 },
      documents: { include: { documentType: true }, orderBy: { updatedAt: 'desc' } },
      actionPlans: { include: { items: true } },
      risks: { where: { status: 'ACTIVE' } },
      services: { where: { active: true }, orderBy: { dueAt: 'asc' } },
    },
  });
  if (!company) notFound();
  const ghes = company.establishments.filter((establishment) => establishment.active).flatMap((establishment) => establishment.sectors.filter((sector) => sector.active).flatMap((sector) => sector.ghes.filter((ghe) => ghe.active)));
  const primary = company.contacts[0];
  const conversations = canMessage ? await db.conversation.findMany({ where: { companyId: company.id, tenantId: tenant.id }, orderBy: { lastMessageAt: 'desc' }, take: 5 }) : [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm text-brand-700">Empresa</p><h1 className="text-3xl font-bold">{company.tradeName ?? company.legalName}</h1><p className="text-slate-500">{company.legalName}{company.cnpj ? ` · ${company.cnpj}` : ''}</p></div>
        <div className="flex flex-wrap gap-2">
          {canWrite && <Link href={`/companies/${company.id}/profile`} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold">Dados</Link>}
          {canWrite && <Link href={`/companies/${company.id}/structure`} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold">Estrutura</Link>}
          {canWrite && <Link href={`/companies/${company.id}/contacts`} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold">Contatos</Link>}
          {canWrite && <Link href={`/companies/${company.id}/services`} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold">Serviços</Link>}
          {canManageAccess && <Link href={`/companies/${company.id}/accesses`} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold">Acessos RH</Link>}
          {canInspect && <Link href={`/companies/${company.id}/risks`} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold">Inventário</Link>}
          {hasTenantPermission(membership.role, 'action.manage', membership.permissions) && <Link href={`/companies/${company.id}/actions`} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold">Plano 5W2H</Link>}
          {canInspect && <Link href={`/companies/${company.id}/inspections/new`} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold">Nova vistoria</Link>}
          {canCampaign && <Link href={`/companies/${company.id}/campaigns/new`} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold">Nova campanha</Link>}
          {canDocument && <Link href={`/companies/${company.id}/documents/new`} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">Novo documento</Link>}
        </div>
      </div>

      {primary && <Card className="mt-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-slate-500">Contato principal</p><p className="font-semibold">{primary.name}{primary.role ? ` · ${primary.role}` : ''}</p><p className="text-sm text-slate-500">{primary.email ?? ''}{primary.phoneDisplay ? ` · ${primary.phoneDisplay}` : ''}</p></div>{primary.hasWhatsapp && primary.phoneE164 && <a href={whatsappUrl(primary.phoneE164, `Olá, ${primary.name}. Estou entrando em contato sobre os serviços de SST da ${company.tradeName ?? company.legalName}.`)} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">Abrir WhatsApp</a>}</Card>}

      <div className="mt-6 grid gap-4 md:grid-cols-4 xl:grid-cols-7">
        <Card><p className="text-sm text-slate-500">GHEs</p><p className="text-3xl font-bold">{ghes.length}</p></Card>
        <Card><p className="text-sm text-slate-500">Campanhas</p><p className="text-3xl font-bold">{company.campaigns.length}</p></Card>
        <Card><p className="text-sm text-slate-500">Vistorias</p><p className="text-3xl font-bold">{company.inspections.length}</p></Card>
        <Card><p className="text-sm text-slate-500">Documentos</p><p className="text-3xl font-bold">{company.documents.length}</p></Card>
        <Card><p className="text-sm text-slate-500">Riscos ativos</p><p className="text-3xl font-bold">{company.risks.length}</p></Card>
        <Card><p className="text-sm text-slate-500">Ações</p><p className="text-3xl font-bold">{company.actionPlans.reduce((sum, plan) => sum + plan.items.length, 0)}</p></Card>
        <Card><p className="text-sm text-slate-500">Serviços ativos</p><p className="text-3xl font-bold">{company.services.length}</p></Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><h2 className="font-bold">Campanhas</h2><div className="mt-3 divide-y">{company.campaigns.map((campaign) => <div key={campaign.id} className="py-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><Link href={`/campaigns/${campaign.id}`} className="font-medium text-brand-800 hover:underline">{campaign.name}</Link><p className="text-xs text-slate-500">{campaign.responseSessions.length}/{campaign.expectedResponses} respostas · criada em {formatDate(campaign.createdAt)}</p></div><Badge tone={['ACTIVE', 'REOPENED'].includes(campaign.status) ? 'success' : 'neutral'}>{campaign.status}</Badge></div>{canCampaign && <div className="mt-2 flex flex-wrap gap-3 text-sm"><Link href={`/campaigns/${campaign.id}`} className="text-brand-700">Gerenciar</Link><Link href={`/p/${campaign.publicToken}`} target="_blank" className="text-brand-700">Abrir pesquisa</Link><a href={`/api/campaigns/${campaign.id}/qr`} className="text-brand-700">Baixar QR Code</a>{['ACTIVE', 'REOPENED'].includes(campaign.status) ? <form action={`/api/campaigns/${campaign.id}/status`} method="post"><input type="hidden" name="status" value="CLOSED" /><button className="text-rose-700">Encerrar</button></form> : <form action={`/api/campaigns/${campaign.id}/status`} method="post"><input type="hidden" name="status" value="REOPENED" /><button className="text-brand-700">Reabrir</button></form>}</div>}</div>)}{!company.campaigns.length && <p className="py-4 text-sm text-slate-500">Nenhuma campanha.</p>}</div></Card>
        <Card><h2 className="font-bold">Documentos</h2><div className="mt-3 divide-y">{company.documents.map((document) => canDocument ? <Link key={document.id} href={`/documents/${document.id}`} className="flex justify-between py-3"><div><p className="font-medium">{document.title}</p><p className="text-xs text-slate-500">{document.documentType.name} · revisão {document.currentVersion}</p></div><Badge>{document.status}</Badge></Link> : <div key={document.id} className="flex justify-between py-3"><div><p className="font-medium">{document.title}</p><p className="text-xs text-slate-500">{document.documentType.name} · revisão {document.currentVersion}</p></div><Badge>{document.status}</Badge></div>)}{!company.documents.length && <p className="py-4 text-sm text-slate-500">Nenhum documento.</p>}</div></Card>
        <Card><h2 className="font-bold">Vistorias</h2><div className="mt-3 divide-y">{company.inspections.map((inspection) => canInspect ? <Link key={inspection.id} href={`/inspections/${inspection.id}`} className="flex justify-between py-3"><div><p className="font-medium">{inspection.title}</p><p className="text-xs text-slate-500">{formatDate(inspection.performedAt ?? inspection.createdAt)}</p></div><Badge>{inspection.status}</Badge></Link> : <div key={inspection.id} className="flex justify-between py-3"><div><p className="font-medium">{inspection.title}</p><p className="text-xs text-slate-500">{formatDate(inspection.performedAt ?? inspection.createdAt)}</p></div><Badge>{inspection.status}</Badge></div>)}{!company.inspections.length && <p className="py-4 text-sm text-slate-500">Nenhuma vistoria.</p>}</div></Card>
        <Card><h2 className="font-bold">Serviços contratados</h2><div className="mt-3 divide-y">{company.services.slice(0, 6).map((service) => <div key={service.id} className="flex justify-between gap-3 py-3"><div><p className="font-medium">{service.code} · {service.name}</p><p className="text-xs text-slate-500">Prazo: {formatDate(service.dueAt)} · renovação: {formatDate(service.renewalAt)}</p></div><Badge tone={service.status === 'COMPLETED' || service.status === 'DELIVERED' ? 'success' : service.status === 'CANCELLED' || service.status === 'EXPIRED' ? 'danger' : 'neutral'}>{service.status}</Badge></div>)}{!company.services.length && <p className="py-4 text-sm text-slate-500">Nenhum serviço cadastrado.</p>}</div></Card>
        {canMessage && <Card><h2 className="font-bold">Conversas recentes</h2><div className="mt-3 divide-y">{conversations.map((conversation) => <Link key={conversation.id} href={`/messages/${conversation.id}`} className="flex justify-between py-3"><span>{conversation.subject}</span><Badge>{conversation.status}</Badge></Link>)}{!conversations.length && <p className="py-4 text-sm text-slate-500">Nenhuma conversa.</p>}</div></Card>}
      </div>
    </div>
  );
}
