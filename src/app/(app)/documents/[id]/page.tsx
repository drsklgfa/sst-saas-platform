import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenant } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, Button, Badge, Textarea, Input } from '@/components/ui';
import { storage } from '@/lib/storage';
import { hasTenantPermission } from '@/lib/rbac';
import { sanitizeReportHtml } from '@/domain/reports/sanitize';

const terminalStatuses = ['ISSUED_SIGNED', 'ISSUED_UNSIGNED', 'REPLACED', 'CANCELLED', 'ARCHIVED'];

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant, membership } = await requireTenant();
  const canEdit = hasTenantPermission(membership.role, 'document.edit', membership.permissions);
  const canIssue = hasTenantPermission(membership.role, 'document.issue', membership.permissions);
  const canSign = hasTenantPermission(membership.role, 'document.sign', membership.permissions);
  const canMessage = hasTenantPermission(membership.role, 'message.manage', membership.permissions);
  if (!canEdit && !canIssue && !canSign) notFound();

  const document = await db.document.findFirst({
    where: { id, company: { tenantId: tenant.id } },
    include: {
      company: true,
      documentType: true,
      files: { include: { fileObject: true }, orderBy: { createdAt: 'desc' } },
      versions: { include: { sections: { orderBy: { position: 'asc' } }, snapshot: true, signatures: { orderBy: { createdAt: 'desc' } }, auditRuns: { orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: { version: 'desc' } },
    },
  });
  if (!document) notFound();
  const latest = document.versions.find((version) => version.version === document.currentVersion);
  if (!latest) notFound();
  const editable = canEdit && !latest.snapshot && ['DRAFT', 'REVIEW'].includes(latest.status);
  const frozen = Boolean(latest.snapshot);
  const ended = terminalStatuses.includes(latest.status);
  const latestAudit = latest.auditRuns[0];
  const auditChecks = Array.isArray(latestAudit?.results) ? latestAudit.results as Array<{ code: string; title: string; severity: string; message: string }> : [];
  const warnings = Array.isArray(latest.warnings) ? latest.warnings.filter((item): item is string => typeof item === 'string') : [];
  const fileRows = await Promise.all(document.files.map(async (file) => ({ ...file, url: await storage.signedUrl(file.fileObject.storageKey), name: file.fileObject.originalName })));
  const comments = canMessage ? await db.entityComment.findMany({ where: { companyId: document.companyId, entityType: 'DOCUMENT', entityId: document.id }, include: { user: true, attachments: { include: { file: true } } }, orderBy: { createdAt: 'asc' } }) : [];

  return <div>
    <div className="flex flex-wrap justify-between gap-3"><div><p className="text-brand-700">{document.documentType.name}</p><h1 className="text-3xl font-bold">{document.title}</h1><p className="text-slate-500">{document.company.legalName} · revisão atual {document.currentVersion}{document.releasedVersion ? ` · revisão liberada ${document.releasedVersion}` : ''}</p></div><Badge>{document.status}</Badge></div>

    {warnings.length > 0 && <Card className="mt-5 border-amber-200 bg-amber-50"><h2 className="font-bold text-amber-900">Avisos da revisão</h2><ul className="mt-2 list-disc pl-5 text-sm text-amber-800">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul><p className="mt-2 text-xs text-amber-700">Avisos orientam. Pendências críticas exigem justificativa técnica para emissão.</p></Card>}

    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <Card><div className="flex items-center justify-between"><div><h2 className="font-bold">Conteúdo da revisão {latest.version}</h2><p className="text-xs text-slate-500">{editable ? 'Rascunho editável' : 'Snapshot congelado e imutável'}</p></div>{latest.snapshot && <Badge>{latest.snapshot.dataHash.slice(0, 12)}…</Badge>}</div>
          {editable ? <form action={`/api/documents/${document.id}/sections`} method="post" className="mt-4 space-y-5">{latest.sections.map((section) => <div key={section.id} className="rounded-xl border border-slate-200 p-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name={`enabled_${section.id}`} defaultChecked={section.enabled} /> Incluir no documento</label><Input name={`title_${section.id}`} defaultValue={section.title} className="mt-3 font-semibold" /><Textarea name={`html_${section.id}`} rows={7} defaultValue={String((section.content as any).html ?? '')} className="mt-3 font-mono text-xs" /></div>)}<Button>Salvar alterações</Button></form> : <div className="mt-4 space-y-3">{latest.sections.map((section) => <div key={section.id} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between"><strong>{section.title}</strong><Badge>{section.enabled ? 'Incluída' : 'Desativada'}</Badge></div><div className="mt-2 text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: sanitizeReportHtml(String((section.content as any).html ?? '')) }} /></div>)}</div>}
        </Card>

        {canMessage && <Card><h2 className="font-bold">Comentários do documento</h2><div className="mt-3 space-y-2">{comments.map((comment) => <div key={comment.id} className={`rounded-xl p-3 text-sm ${comment.internal ? 'border border-amber-200 bg-amber-50' : 'bg-slate-50'}`}><p className="text-xs text-slate-500">{comment.user?.name ?? 'Usuário removido'}{comment.internal ? ' · interno' : ' · visível ao cliente'}</p><p className="whitespace-pre-wrap">{comment.body}</p>{comment.attachments.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{comment.attachments.map((attachment) => <a key={attachment.id} href={`/api/files/local?key=${encodeURIComponent(attachment.file.storageKey)}`} target="_blank" className="text-xs font-semibold text-brand-700">{attachment.file.originalName}</a>)}</div>}</div>)}{!comments.length && <p className="text-sm text-slate-500">Nenhum comentário registrado.</p>}</div><form action={`/api/companies/${document.companyId}/comments`} method="post" encType="multipart/form-data" className="mt-4 grid gap-2"><input type="hidden" name="entityType" value="DOCUMENT"/><input type="hidden" name="entityId" value={document.id}/><input type="hidden" name="returnTo" value={`/documents/${document.id}`}/><Textarea name="body" required maxLength={5000} rows={3} placeholder="Registrar comentário sobre o documento"/><Input name="attachments" type="file" multiple/><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="internal" value="true"/> Comentário interno</label><Button>Adicionar comentário</Button></form></Card>}

        <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Histórico de revisões</h2><p className="text-sm text-slate-500">Cada revisão congelada preserva conteúdo, dados, auditoria, arquivos e assinaturas.</p></div>{frozen && canEdit && <form action={`/api/documents/${document.id}/revisions`} method="post"><input type="hidden" name="justification" value="Nova revisão para atualização do documento" /><Button>Criar nova revisão</Button></form>}</div><div className="mt-3 divide-y">{document.versions.map((version) => <div key={version.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><div><strong>Revisão {version.version}</strong><p className="text-xs text-slate-500">Criada em {new Date(version.createdAt).toLocaleString('pt-BR')}{version.lockedAt ? ` · congelada em ${new Date(version.lockedAt).toLocaleString('pt-BR')}` : ''}</p></div><Badge>{version.status}</Badge></div>)}</div></Card>
      </div>

      <div className="space-y-4">
        <Card><h2 className="font-bold">Prévia e emissão</h2>{editable && canEdit && <form action={`/api/documents/${document.id}/generate`} method="post" className="mt-3"><Button className="w-full">Congelar e gerar prévia</Button></form>}{frozen && !ended && canEdit && <form action={`/api/documents/${document.id}/generate`} method="post" className="mt-3"><Button className="w-full">Regenerar prévia</Button></form>}{frozen && <form action={`/api/documents/${document.id}/audit`} method="post" className="mt-2"><Button className="w-full bg-slate-700 hover:bg-slate-800">Executar auditoria</Button></form>}{frozen && !ended && canIssue && <form action={`/api/documents/${document.id}/release`} method="post" className="mt-3 space-y-2"><Textarea name="justification" rows={3} placeholder="Justificativa técnica, obrigatória apenas se houver pendências críticas" /><Button className="w-full bg-slate-900 hover:bg-slate-800">Emitir e liberar ao RH</Button></form>}<p className="mt-3 text-xs text-slate-500">O PDF oficial é gerado pelo Worker e liberado somente após conferir hash e assinaturas da revisão.</p></Card>

        <Card><h2 className="font-bold">Auditoria pré-emissão</h2>{latestAudit ? <><div className="mt-2 flex gap-2"><Badge>{latestAudit.status}</Badge><span className="text-xs text-slate-500">{latestAudit.errorCount} críticas · {latestAudit.warningCount} avisos</span></div><div className="mt-3 space-y-2">{auditChecks.map((item) => <div key={`${item.code}-${item.severity}`} className="rounded-lg border p-2 text-xs"><strong>{item.title}</strong><br /><span className={item.severity === 'ERROR' ? 'text-red-700' : item.severity === 'WARNING' ? 'text-amber-700' : 'text-emerald-700'}>{item.severity}: {item.message}</span></div>)}</div></> : <p className="mt-3 text-sm text-slate-500">A auditoria será criada ao gerar a primeira prévia.</p>}</Card>

        {frozen && !ended && canSign && <Card><h2 className="font-bold">Aprovação interna</h2><form action={`/api/documents/${document.id}/signatures`} method="post" className="mt-3 space-y-3"><Input name="signerName" required placeholder="Nome do responsável técnico" /><Input name="registration" placeholder="CREA/registro profissional" /><select name="signatureRole" className="w-full rounded-xl border border-slate-300 p-2.5 text-sm"><option value="RESPONSIBLE_TECH">Responsável técnico</option><option value="REVIEWER">Revisor</option><option value="COMPANY_ACKNOWLEDGEMENT">Ciência da empresa</option></select><Button className="w-full">Registrar aprovação do snapshot</Button></form><div className="mt-3 space-y-2">{latest.signatures.map((signature) => <div key={signature.id} className="rounded-lg bg-slate-50 p-2 text-xs"><strong>{signature.signerName}</strong><br />{signature.signerRegistration ?? 'Sem registro'} · {signature.method} · {signature.signedAt ? new Date(signature.signedAt).toLocaleString('pt-BR') : 'Pendente'}</div>)}</div></Card>}

        {frozen && !ended && canSign && <Card><h2 className="font-bold">PDF assinado externamente</h2><form action={`/api/documents/${document.id}/signed-upload`} method="post" encType="multipart/form-data" className="mt-3 space-y-3"><Input name="signerName" placeholder="Nome do assinante" /><Input name="registration" placeholder="Registro profissional" /><Input name="file" type="file" accept="application/pdf" required /><Button className="w-full">Anexar PDF assinado</Button></form></Card>}

        <Card><h2 className="font-bold">Arquivos</h2><div className="mt-3 space-y-2">{fileRows.map((file) => <a key={file.id} href={file.url} className="block rounded-lg border p-2 text-sm text-brand-700"><span className="font-semibold">{file.format}</span> · r{file.versionNumber}{file.official ? ' · OFICIAL' : ''}<br /><span className="text-xs text-slate-500">{file.name}</span></a>)}{!fileRows.length && <p className="text-sm text-slate-500">Nenhum arquivo gerado.</p>}</div></Card>

        {document.releasedVersion && <Card><h2 className="font-bold">Verificação pública</h2><p className="mt-2 text-sm text-slate-500">A página não expõe o conteúdo técnico.</p><Link href={`/verify/${document.verificationCode}`} target="_blank" className="mt-3 block text-sm font-semibold text-brand-700">Abrir verificação da revisão liberada</Link></Card>}
      </div>
    </div>
  </div>;
}
