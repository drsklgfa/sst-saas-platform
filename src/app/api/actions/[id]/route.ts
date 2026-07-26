import { publicAppUrl } from '@/lib/public-url';
import type { ActionStatus, RiskLevel } from '@prisma/client';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { optionalDate, optionalText, requiredText } from '@/domain/inspections/validation';
import { actionStatuses, optionalMoney, progressValue, residualLevels } from '@/domain/actions/validation';
import { notifyUsers } from '@/lib/notifications';
import { hasCompanyPermission } from '@/lib/rbac';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('action.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const before = await db.actionItem.findFirst({ where: { id, actionPlan: { company: { tenantId: tenant.id } } }, include: { actionPlan: true } });
  if (!before) return new Response('Ação não encontrada', { status: 404 });
  const form = await request.formData();
  try {
    const status = String(form.get('status') ?? before.status) as ActionStatus;
    if (!actionStatuses.has(status)) throw new Error('Status inválido.');
    const residualLevelRaw = String(form.get('residualLevel') ?? '').trim();
    const residualLevel = residualLevelRaw ? residualLevelRaw as RiskLevel : null;
    if (residualLevel && !residualLevels.has(residualLevel)) throw new Error('Nível residual inválido.');
    const progress = progressValue(form.get('progress'), before.progress);
    const effectivenessStatus = optionalText(form.get('effectivenessStatus'), 80);
    if (status === 'EFFECTIVENESS_VERIFIED' && !effectivenessStatus) throw new Error('Informe o resultado da verificação de eficácia.');
    const updated = await db.actionItem.update({ where: { id }, data: {
      action: requiredText(form.get('action'), 'Ação', 3000), responsible: optionalText(form.get('responsible'), 300), verifier: optionalText(form.get('verifier'), 300),
      dueDate: optionalDate(form.get('dueDate')), location: optionalText(form.get('location'), 500), reason: optionalText(form.get('reason'), 2000), method: optionalText(form.get('method'), 2000),
      estimatedCost: optionalMoney(form.get('estimatedCost')), actualCost: optionalMoney(form.get('actualCost')), priority: optionalText(form.get('priority'), 80), status,
      progress: status === 'COMPLETED' || status === 'EFFECTIVENESS_VERIFIED' ? 100 : progress,
      completedAt: status === 'COMPLETED' || status === 'EFFECTIVENESS_VERIFIED' ? before.completedAt ?? new Date() : null,
      verifiedAt: status === 'EFFECTIVENESS_VERIFIED' ? new Date() : null, effectivenessStatus, effectivenessNotes: optionalText(form.get('effectivenessNotes'), 3000),
      residualScore: String(form.get('residualScore') ?? '').trim() ? Number(form.get('residualScore')) : null, residualLevel,
      delayReason: optionalText(form.get('delayReason'), 1500), nextReviewAt: optionalDate(form.get('nextReviewAt')),
    } });
    if (updated.status !== before.status || updated.progress !== before.progress || updated.dueDate?.getTime() !== before.dueDate?.getTime()) {
      const accesses = await db.companyAccess.findMany({ where: { companyId: before.actionPlan.companyId, active: true, user: { active: true } }, select: { userId: true, role: true, permissions: true } });
      await notifyUsers(accesses.filter((access) => hasCompanyPermission(access.role, 'action.read', access.permissions)).map((access) => access.userId), { type: 'ACTION', title: `Ação atualizada: ${before.code}`, body: `${updated.status} · ${updated.progress}%`, href: `/portal/company/${before.actionPlan.companyId}`, companyId: before.actionPlan.companyId, metadata: { actionItemId: id } });
    }
    await audit({ tenantId: tenant.id, companyId: before.actionPlan.companyId, userId: user.id, action: 'UPDATE', entityType: 'ActionItem', entityId: id, before, after: updated });
    return NextResponse.redirect(publicAppUrl(`/companies/${before.actionPlan.companyId}/actions`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Ação inválida', { status: 400 });
  }
}
