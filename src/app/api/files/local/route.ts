import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasCompanyPermission, hasTenantPermission } from '@/lib/rbac';
import { storage } from '@/lib/storage';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Não autenticado', { status: 401 });
  const key = new URL(request.url).searchParams.get('key');
  if (!key) return new Response('Chave ausente', { status: 400 });

  const file = await db.fileObject.findUnique({ where: { storageKey: key } });
  if (!file) return new Response('Não encontrado', { status: 404 });

  const membership = user.memberships.find((candidate) => candidate.tenantId === file.tenantId);
  const companyAccess = file.companyId ? user.companyAccesses.find((candidate) => candidate.companyId === file.companyId) : undefined;
  let authorized = false;

  const [backup, internalMessageAttachment, internalCommentAttachment] = await Promise.all([
    db.backupExport.findFirst({ where: { fileObjectId: file.id }, select: { id: true } }),
    db.messageAttachment.findFirst({ where: { fileId: file.id, message: { internal: true } }, select: { id: true } }),
    db.commentAttachment.findFirst({ where: { fileId: file.id, comment: { internal: true } }, select: { id: true } }),
  ]);
  if (membership) {
    authorized = backup
      ? hasTenantPermission(membership.role, 'backup.manage', membership.permissions)
      : internalMessageAttachment || internalCommentAttachment
        ? hasTenantPermission(membership.role, 'message.manage', membership.permissions)
        : hasTenantPermission(membership.role, 'company.read', membership.permissions);
  }

  if (!authorized && companyAccess && file.visibility === 'COMPANY') {
    const [releasedDocument, evidence, messageAttachment, commentAttachment] = await Promise.all([
      db.documentFile.findFirst({
        where: {
          fileObjectId: file.id,
          official: true,
          document: { companyId: companyAccess.companyId, releasedToCompany: true },
        },
        select: { id: true, versionNumber: true, document: { select: { releasedVersion: true } } },
      }),
      db.actionEvidence.findFirst({
        where: { fileId: file.id, actionItem: { actionPlan: { companyId: companyAccess.companyId } } },
        select: { id: true },
      }),
      db.messageAttachment.findFirst({
        where: {
          fileId: file.id,
          message: { internal: false, conversation: { companyId: companyAccess.companyId, participants: { some: { userId: user.id } } } },
        },
        select: { id: true },
      }),
      db.commentAttachment.findFirst({
        where: { fileId: file.id, comment: { companyId: companyAccess.companyId, internal: false } },
        select: { id: true },
      }),
    ]);
    authorized = Boolean(
      (releasedDocument && releasedDocument.versionNumber === releasedDocument.document.releasedVersion && hasCompanyPermission(companyAccess.role, 'document.read', companyAccess.permissions))
      || (evidence && hasCompanyPermission(companyAccess.role, 'evidence.read', companyAccess.permissions))
      || (messageAttachment && hasCompanyPermission(companyAccess.role, 'message.read', companyAccess.permissions))
      || (commentAttachment && (hasCompanyPermission(companyAccess.role, 'message.read', companyAccess.permissions) || hasCompanyPermission(companyAccess.role, 'evidence.read', companyAccess.permissions))),
    );
  }

  if (!authorized) return new Response('Acesso negado', { status: 403 });

  try {
    return new Response(await storage.get(key), {
      headers: {
        'content-type': file.mimeType,
        'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch {
    return new Response('Não encontrado', { status: 404 });
  }
}
