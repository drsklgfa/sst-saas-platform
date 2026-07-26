import { publicAppUrl } from '@/lib/public-url';
import { getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { hasCompanyPermission } from '@/lib/rbac';
import { notifyTenantPermission } from '@/lib/notifications';
import { progressValue } from '@/domain/actions/validation';
import { optionalText } from '@/domain/inspections/validation';
import { NextResponse } from 'next/server';
import type { ActionStatus } from '@prisma/client';

const allowed = new Set<ActionStatus>(['NOT_STARTED', 'IN_PROGRESS', 'WAITING_EVIDENCE', 'WAITING_VALIDATION', 'COMPLETED', 'PARTIAL']);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response('Não autenticado', { status: 401 });
  const form = await request.formData();
  const status = String(form.get('status')) as ActionStatus;
  if (!allowed.has(status)) return new Response('Status inválido', { status: 400 });
  const item = await db.actionItem.findUnique({ where: { id }, include: { actionPlan: { include: { company: true } } } });
  if (!item) return new Response('Ação não encontrada', { status: 404 });
  const access = user.companyAccesses.find((candidate) => candidate.companyId === item.actionPlan.companyId);
  if (!access || !hasCompanyPermission(access.role, 'action.update', access.permissions)) return new Response('Acesso negado', { status: 403 });
  try {
    const progress = status === 'COMPLETED' ? 100 : progressValue(form.get('progress'), status === 'IN_PROGRESS' ? Math.max(item.progress, 10) : item.progress);
    const updateNote = optionalText(form.get('updateNote'), 1500);
    const updated = await db.actionItem.update({ where: { id }, data: { status, progress, completedAt: status === 'COMPLETED' ? item.completedAt ?? new Date() : item.completedAt } });
    await notifyTenantPermission(item.actionPlan.company.tenantId, 'action.manage', { type: 'ACTION', title: `Ação atualizada: ${item.code}`, body: `${status} · ${progress}%${updateNote ? ` · ${updateNote}` : ''}`, href: `/companies/${item.actionPlan.companyId}/actions`, companyId: item.actionPlan.companyId, metadata: { actionItemId: id, status, progress } }, [user.id]);
    await audit({ tenantId: item.actionPlan.company.tenantId, companyId: item.actionPlan.companyId, userId: user.id, action: 'CLIENT_UPDATE', entityType: 'ActionItem', entityId: id, before: item, after: updated, metadata: { updateNote } });
    return NextResponse.redirect(publicAppUrl(`/portal/company/${item.actionPlan.companyId}`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Atualização inválida', { status: 400 });
  }
}
