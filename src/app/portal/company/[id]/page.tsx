import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Card, Badge, Button, Input, Textarea } from '@/components/ui';
import { storage } from '@/lib/storage';
import { hasCompanyPermission } from '@/lib/rbac';

export default async function CompanyPortal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const access = user.companyAccesses.find((candidate) => candidate.companyId === id);
  if (!access) notFound();

  const canDashboard = hasCompanyPermission(access.role, 'portal.dashboard', access.permissions);
  const canDocuments = hasCompanyPermission(access.role, 'document.read', access.permissions);
  const canActions = hasCompanyPermission(access.role, 'action.read', access.permissions);
  const canUpdateActions = hasCompanyPermission(access.role, 'action.update', access.permissions);
  const canUploadEvidence = hasCompanyPermission(access.role, 'action.evidence', access.permissions);
  const canMessages = hasCompanyPermission(access.role, 'message.read', access.permissions);
  const canComment = hasCompanyPermission(access.role, 'message.reply', access.permissions);

  const [campaigns, documents, plans, conversationCount, unreadNotifications] = await Promise.all([
    canDashboard
      ? db.campaign.findMany({
          where: { companyId: id, status: { in: ['ACTIVE', 'REOPENED'] } },
          include: { responseSessions: { where: { status: 'SUBMITTED' }, select: { id: true } } },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
    canDocuments
      ? db.document.findMany({
          where: { companyId: id, releasedToCompany: true, status: { in: ['ISSUED_UNSIGNED', 'ISSUED_SIGNED'] } },
          include: { documentType: true, files: { where: { official: true }, orderBy: { createdAt: 'desc' } } },
          orderBy: { releasedAt: 'desc' },
        })
      : Promise.resolve([]),
    canActions
      ? db.actionPlan.findMany({
          where: { companyId: id, status: 'ACTIVE' },
          include: { items: { include: { evidences: { include: { file: true }, orderBy: { createdAt: 'desc' } } }, orderBy: [{ dueDate: 'asc' }, { code: 'asc' }] } },
          orderBy: { updatedAt: 'desc' },
        })
      : Promise.resolve([]),
    canMessages
      ? db.conversation.count({ where: { companyId: id, participants: { some: { userId: user.id } } } })
      : Promise.resolve(0),
    db.notification.count({ where: { userId: user.id, readAt: null, OR: [{ companyId: id }, { companyId: null }] } }),
  ]);

  const docs = await Promise.all(documents.map(async (document) => {
    const releasedVersion = document.releasedVersion;
    const official = document.files.find((file) => file.versionNumber === releasedVersion && file.format === 'PDF_SIGNED')
      ?? document.files.find((file) => file.versionNumber === releasedVersion && file.format === 'PDF');
    if (!official) return { ...document, url: null };
    const object = await db.fileObject.findUnique({ where: { id: official.fileObjectId } });
    return { ...document, url: object ? await storage.signedUrl(object.storageKey, 300) : null };
  }));
  const actions = plans.flatMap((plan) => plan.items);
  const comments = canMessages && (actions.length || docs.length) ? await db.entityComment.findMany({ where: { companyId: id, internal: false, OR: [{ entityType: 'ACTION', entityId: { in: actions.map((item) => item.id) } }, { entityType: 'DOCUMENT', entityId: { in: docs.map((document) => document.id) } }] }, include: { user: true, attachments: { include: { file: true } } }, orderBy: { createdAt: 'asc' } }) : [];
  const commentsByAction = new Map<string, typeof comments>();
  const commentsByDocument = new Map<string, typeof comments>();
  for (const comment of comments) {
    const target = comment.entityType === 'DOCUMENT' ? commentsByDocument : commentsByAction;
    target.set(comment.entityId, [...(target.get(comment.entityId) ?? []), comment]);
  }

  return (
    <main className="shell min-h-screen p-6"><div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm text-brand-700">Portal do cliente</p><h1 className="text-3xl font-bold">{access.company.tradeName ?? access.company.legalName}</h1><p className="text-slate-500">Perfil: {access.role}</p></div>
        <div className="flex gap-2"><Link href="/portal/notifications" className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold">Notificações{unreadNotifications ? ` (${unreadNotifications})` : ''}</Link>{canMessages && <Link href={`/portal/company/${id}/messages`} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold">Mensagens ({conversationCount})</Link>}<form action="/api/auth/logout" method="post"><Button className="bg-slate-900 hover:bg-slate-800">Sair</Button></form></div>
      </div>

      {(canDashboard || canDocuments) && <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {canDashboard && <Card><h2 className="font-bold">Campanhas em andamento</h2>{campaigns.map((campaign) => { const percentage = campaign.expectedResponses ? Math.min(100, campaign.responseSessions.length / campaign.expectedResponses * 100) : 0; return <div key={campaign.id} className="mt-3 rounded-xl border p-3"><div className="flex justify-between"><span>{campaign.name}</span><Badge tone="success">{campaign.responseSessions.length}/{campaign.expectedResponses}</Badge></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-brand-600" style={{ width: `${percentage}%` }} /></div><p className="mt-2 text-xs text-slate-500">Somente a adesão agregada é exibida. Respostas individuais permanecem restritas à consultoria.</p></div>; })}{!campaigns.length && <p className="mt-4 text-sm text-slate-500">Nenhuma campanha ativa.</p>}</Card>}
        {canDocuments && <Card><h2 className="font-bold">Documentos liberados</h2><div className="mt-3 divide-y">{docs.map((document) => <div key={document.id} className="py-3"><div className="flex justify-between gap-3"><div><p className="font-medium">{document.title}</p><p className="text-xs text-slate-500">{document.documentType.name} · revisão {document.releasedVersion}</p></div>{document.url && <a href={document.url} className="text-sm font-semibold text-brand-700">Baixar PDF</a>}</div>{canMessages && <details className="mt-2 rounded-xl border p-3"><summary className="cursor-pointer text-sm font-semibold">Comentários ({(commentsByDocument.get(document.id) ?? []).length})</summary><div className="mt-2 space-y-2">{(commentsByDocument.get(document.id) ?? []).map((comment) => <div key={comment.id} className="rounded-lg bg-slate-50 p-2.5 text-sm"><p className="text-xs text-slate-500">{comment.user?.name ?? 'Consultoria'}</p><p className="whitespace-pre-wrap">{comment.body}</p>{comment.attachments.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{comment.attachments.map((attachment) => <a key={attachment.id} href={`/api/files/local?key=${encodeURIComponent(attachment.file.storageKey)}`} target="_blank" className="text-xs font-semibold text-brand-700">{attachment.file.originalName}</a>)}</div>}</div>)}{!(commentsByDocument.get(document.id) ?? []).length && <p className="text-xs text-slate-500">Nenhum comentário.</p>}</div>{canComment && <form action={`/api/portal/companies/${id}/comments`} method="post" encType="multipart/form-data" className="mt-3 grid gap-2"><input type="hidden" name="entityType" value="DOCUMENT"/><input type="hidden" name="entityId" value={document.id}/><input type="hidden" name="returnTo" value={`/portal/company/${id}`}/><Textarea name="body" required maxLength={5000} rows={2} placeholder="Comentar sobre este documento"/><Input name="attachments" type="file" multiple/><Button>Comentar</Button></form>}</details>}</div>)}{!docs.length && <p className="py-4 text-sm text-slate-500">Nenhum documento liberado.</p>}</div></Card>}
      </div>}

      {canActions && <Card className="mt-6"><div className="flex justify-between"><div><h2 className="font-bold">Plano de ação 5W2H</h2><p className="text-sm text-slate-500">Acompanhe o andamento e, quando permitido, envie atualizações e evidências.</p></div><Badge>{actions.length} ações</Badge></div><div className="mt-4 space-y-4">{actions.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-3"><div className="max-w-3xl"><p className="text-xs text-slate-500">{item.code} · {item.priority ?? 'Sem prioridade'}</p><p className="font-semibold">{item.action}</p><p className="mt-1 text-sm text-slate-500">Responsável: {item.responsible ?? 'Não definido'} · Evidências: {item.evidences.length}</p></div><Badge tone={item.status === 'COMPLETED' ? 'success' : item.status === 'OVERDUE' ? 'danger' : 'neutral'}>{item.status}</Badge></div>{item.evidences.length > 0 && <div className="mt-4 space-y-2"><p className="text-sm font-semibold">Evidências enviadas</p>{item.evidences.map((evidence) => <div key={evidence.id} className="rounded-xl bg-slate-50 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><div>{evidence.file && <a href={`/api/files/local?key=${encodeURIComponent(evidence.file.storageKey)}`} target="_blank" className="font-semibold text-brand-700">{evidence.file.originalName}</a>}<p className="text-xs text-slate-500">{evidence.description ?? 'Sem descrição'}{evidence.reviewNotes ? ` · Parecer: ${evidence.reviewNotes}` : ''}</p></div><Badge tone={evidence.status === 'APPROVED' ? 'success' : evidence.status === 'REJECTED' ? 'danger' : 'warning'}>{evidence.status}</Badge></div></div>)}</div>}{(canUpdateActions || canUploadEvidence) && <div className="mt-4 grid gap-3 md:grid-cols-2">{canUpdateActions && <form action={`/api/portal/actions/${item.id}/status`} method="post" className="grid gap-2 sm:grid-cols-[1fr_100px_1fr_auto]"><select name="status" defaultValue={item.status} className="min-w-0 flex-1 rounded-xl border border-slate-300 p-2.5 text-sm"><option value="NOT_STARTED">Não iniciado</option><option value="IN_PROGRESS">Em andamento</option><option value="WAITING_EVIDENCE">Aguardando evidência</option><option value="WAITING_VALIDATION">Aguardando validação</option><option value="PARTIAL">Concluído parcialmente</option><option value="COMPLETED">Concluído</option></select><Input name="progress" type="number" min="0" max="100" defaultValue={item.progress} aria-label="Progresso" /><Input name="updateNote" maxLength={1500} placeholder="Observação da atualização" /><Button>Atualizar</Button></form>}{canUploadEvidence && <form action={`/api/portal/actions/${item.id}/evidence`} method="post" encType="multipart/form-data" className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><Input name="file" type="file" required className="min-w-0" /><Input name="description" placeholder="Descrição da evidência" /><Button>Anexar</Button></form>}</div>}{canMessages && <div className="mt-4 rounded-xl border p-3"><p className="text-sm font-semibold">Comentários</p><div className="mt-2 space-y-2">{(commentsByAction.get(item.id) ?? []).map((comment) => <div key={comment.id} className="rounded-lg bg-slate-50 p-2.5 text-sm"><p className="text-xs text-slate-500">{comment.user?.name ?? 'Consultoria'}</p><p className="whitespace-pre-wrap">{comment.body}</p>{comment.attachments.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{comment.attachments.map((attachment) => <a key={attachment.id} href={`/api/files/local?key=${encodeURIComponent(attachment.file.storageKey)}`} target="_blank" className="text-xs font-semibold text-brand-700">{attachment.file.originalName}</a>)}</div>}</div>)}{!(commentsByAction.get(item.id) ?? []).length && <p className="text-xs text-slate-500">Nenhum comentário.</p>}</div>{canComment && <form action={`/api/portal/companies/${id}/comments`} method="post" encType="multipart/form-data" className="mt-3 grid gap-2"><input type="hidden" name="entityType" value="ACTION"/><input type="hidden" name="entityId" value={item.id}/><input type="hidden" name="returnTo" value={`/portal/company/${id}`}/><Textarea name="body" required maxLength={5000} rows={2} placeholder="Adicionar comentário para a consultoria"/><Input name="attachments" type="file" multiple/><Button>Comentar</Button></form>}</div>}</div>)}{!actions.length && <p className="py-4 text-sm text-slate-500">Nenhuma ação liberada.</p>}</div></Card>}
    </div></main>
  );
}
