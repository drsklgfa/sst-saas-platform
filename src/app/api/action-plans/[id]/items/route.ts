import { publicAppUrl } from '@/lib/public-url';
import type { ActionStatus, RiskLevel } from '@prisma/client';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { optionalDate, optionalText, requiredText } from '@/domain/inspections/validation';
import { actionStatuses, optionalMoney, progressValue, residualLevels } from '@/domain/actions/validation';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('action.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const plan = await db.actionPlan.findFirst({ where: { id, company: { tenantId: tenant.id } }, include: { company: true } });
  if (!plan) return new Response('Plano não encontrado', { status: 404 });
  const form = await request.formData();
  const riskId = String(form.get('riskId') ?? '').trim() || null;
  if (riskId && !await db.risk.findFirst({ where: { id: riskId, companyId: plan.companyId } })) return new Response('Risco inválido', { status: 400 });
  try {
    const status = String(form.get('status') ?? 'NOT_STARTED') as ActionStatus;
    if (!actionStatuses.has(status)) throw new Error('Status inválido.');
    const residualLevelRaw = String(form.get('residualLevel') ?? '').trim();
    const residualLevel = residualLevelRaw ? residualLevelRaw as RiskLevel : null;
    if (residualLevel && !residualLevels.has(residualLevel)) throw new Error('Nível residual inválido.');
    const residualScoreRaw = String(form.get('residualScore') ?? '').trim();
    const residualScore = residualScoreRaw ? Number(residualScoreRaw) : null;
    if (residualScore !== null && (!Number.isFinite(residualScore) || residualScore < 0)) throw new Error('Pontuação residual inválida.');
    const item = await db.actionItem.create({ data: {
      actionPlanId: id, riskId, code: requiredText(form.get('code'), 'Código', 60).toUpperCase(), action: requiredText(form.get('action'), 'Ação', 3000),
      responsible: optionalText(form.get('responsible'), 300), verifier: optionalText(form.get('verifier'), 300), dueDate: optionalDate(form.get('dueDate')),
      location: optionalText(form.get('location'), 500), reason: optionalText(form.get('reason'), 2000), method: optionalText(form.get('method'), 2000),
      estimatedCost: optionalMoney(form.get('estimatedCost')), actualCost: optionalMoney(form.get('actualCost')), priority: optionalText(form.get('priority'), 80),
      status, progress: progressValue(form.get('progress'), status === 'COMPLETED' ? 100 : 0), effectivenessStatus: optionalText(form.get('effectivenessStatus'), 80),
      effectivenessNotes: optionalText(form.get('effectivenessNotes'), 3000), residualScore, residualLevel, delayReason: optionalText(form.get('delayReason'), 1500),
      nextReviewAt: optionalDate(form.get('nextReviewAt')), completedAt: status === 'COMPLETED' || status === 'EFFECTIVENESS_VERIFIED' ? new Date() : null,
    } });
    await audit({ tenantId: tenant.id, companyId: plan.companyId, userId: user.id, action: 'CREATE', entityType: 'ActionItem', entityId: item.id, after: item });
    return NextResponse.redirect(publicAppUrl(`/companies/${plan.companyId}/actions`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Ação inválida', { status: 400 });
  }
}
