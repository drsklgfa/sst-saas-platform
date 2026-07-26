import { publicAppUrl } from '@/lib/public-url';
import { getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { saveFile } from '@/lib/files';
import { hasCompanyPermission } from '@/lib/rbac';
import { notifyTenantPermission } from '@/lib/notifications';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response('Não autenticado', { status: 401 });

  const item = await db.actionItem.findUnique({
    where: { id },
    include: { actionPlan: { include: { company: true } } },
  });
  if (!item) return new Response('Ação não encontrada', { status: 404 });
  const access = user.companyAccesses.find((candidate) => candidate.companyId === item.actionPlan.companyId);
  if (!access || !hasCompanyPermission(access.role, 'action.evidence', access.permissions)) {
    return new Response('Acesso negado', { status: 403 });
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return new Response('Arquivo ausente', { status: 400 });
  if (file.size > 20 * 1024 * 1024) return new Response('Arquivo maior que 20 MB', { status: 413 });
  const allowed = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]);
  if (file.type && !allowed.has(file.type)) return new Response('Tipo de arquivo não permitido', { status: 415 });

  const saved = await saveFile({
    tenantId: item.actionPlan.company.tenantId,
    companyId: item.actionPlan.companyId,
    originalName: file.name,
    mimeType: file.type || 'application/octet-stream',
    data: Buffer.from(await file.arrayBuffer()),
    createdById: user.id,
    visibility: 'COMPANY',
  });
  const evidence = await db.$transaction(async (tx) => {
    const created = await tx.actionEvidence.create({
      data: {
        actionItemId: item.id,
        fileId: saved.id,
        description: String(form.get('description') ?? '').trim() || null,
        submittedById: user.id,
      },
    });
    await tx.actionItem.update({ where: { id: item.id }, data: { status: 'WAITING_VALIDATION' } });
    return created;
  });
  await notifyTenantPermission(item.actionPlan.company.tenantId, 'action.manage', { type: 'EVIDENCE', title: `Nova evidência: ${item.code}`, body: item.action, href: `/companies/${item.actionPlan.companyId}/actions`, companyId: item.actionPlan.companyId, metadata: { actionItemId: item.id, evidenceId: evidence.id } }, [user.id]);
  await audit({ tenantId: item.actionPlan.company.tenantId, companyId: item.actionPlan.companyId, userId: user.id, action: 'CLIENT_EVIDENCE', entityType: 'ActionEvidence', entityId: evidence.id, after: evidence });
  return NextResponse.redirect(publicAppUrl(`/portal/company/${item.actionPlan.companyId}`), 303);
}
