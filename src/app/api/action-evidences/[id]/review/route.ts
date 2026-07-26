import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { evidenceReviewStatuses } from '@/domain/actions/validation';
import { optionalText } from '@/domain/inspections/validation';
import { notifyUsers } from '@/lib/notifications';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('action.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const before = await db.actionEvidence.findFirst({ where: { id, actionItem: { actionPlan: { company: { tenantId: tenant.id } } } }, include: { actionItem: { include: { actionPlan: true } } } });
  if (!before) return new Response('Evidência não encontrada', { status: 404 });
  const form = await request.formData();
  const status = String(form.get('status'));
  if (!evidenceReviewStatuses.has(status)) return new Response('Status inválido', { status: 400 });
  const reviewNotes = optionalText(form.get('reviewNotes'), 2000);
  if (status === 'REJECTED' && !reviewNotes) return new Response('Informe o motivo da rejeição', { status: 400 });
  const evidence = await db.actionEvidence.update({ where: { id }, data: { status, reviewedById: user.id, reviewedAt: new Date(), reviewNotes } });
  await db.actionItem.update({ where: { id: before.actionItemId }, data: { status: status === 'APPROVED' ? 'COMPLETED' : status === 'REJECTED' ? 'REJECTED' : 'WAITING_VALIDATION', ...(status === 'APPROVED' ? { progress: 100, completedAt: new Date() } : {}) } });
  if (before.submittedById) await notifyUsers([before.submittedById], { type: 'EVIDENCE', title: `Evidência ${status === 'APPROVED' ? 'aprovada' : status === 'REJECTED' ? 'rejeitada' : 'revisada'}`, body: reviewNotes ?? before.actionItem.code, href: `/portal/company/${before.actionItem.actionPlan.companyId}`, companyId: before.actionItem.actionPlan.companyId, metadata: { evidenceId: id, actionItemId: before.actionItemId, status } });
  await audit({ tenantId: tenant.id, companyId: before.actionItem.actionPlan.companyId, userId: user.id, action: 'REVIEW', entityType: 'ActionEvidence', entityId: id, before, after: evidence });
  return NextResponse.redirect(publicAppUrl(`/companies/${before.actionItem.actionPlan.companyId}/actions`), 303);
}
