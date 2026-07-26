import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { saveFile } from '@/lib/files';
import { optionalText } from '@/domain/inspections/validation';
import { notifyUsers } from '@/lib/notifications';
import { hasCompanyPermission } from '@/lib/rbac';
import { NextResponse } from 'next/server';

const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('action.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const item = await db.actionItem.findFirst({ where: { id, actionPlan: { company: { tenantId: tenant.id } } }, include: { actionPlan: true } });
  if (!item) return new Response('Ação não encontrada', { status: 404 });
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return new Response('Arquivo ausente', { status: 400 });
  if (file.size > 20 * 1024 * 1024) return new Response('Arquivo maior que 20 MB', { status: 413 });
  if (file.type && !allowed.has(file.type)) return new Response('Tipo de arquivo não permitido', { status: 415 });
  const saved = await saveFile({ tenantId: tenant.id, companyId: item.actionPlan.companyId, originalName: file.name, mimeType: file.type || 'application/octet-stream', data: Buffer.from(await file.arrayBuffer()), createdById: user.id, visibility: 'COMPANY' });
  const evidence = await db.actionEvidence.create({ data: { actionItemId: id, fileId: saved.id, description: optionalText(form.get('description'), 1000), submittedById: user.id } });
  await db.actionItem.update({ where: { id }, data: { status: 'WAITING_VALIDATION' } });
  const accesses = await db.companyAccess.findMany({ where: { companyId: item.actionPlan.companyId, active: true, user: { active: true } }, select: { userId: true, role: true, permissions: true } });
  await notifyUsers(accesses.filter((access) => hasCompanyPermission(access.role, 'evidence.read', access.permissions)).map((access) => access.userId), { type: 'EVIDENCE', title: `Nova evidência: ${item.code}`, body: evidence.description ?? item.action, href: `/portal/company/${item.actionPlan.companyId}`, companyId: item.actionPlan.companyId, metadata: { actionItemId: id, evidenceId: evidence.id } });
  await audit({ tenantId: tenant.id, companyId: item.actionPlan.companyId, userId: user.id, action: 'CREATE', entityType: 'ActionEvidence', entityId: evidence.id, after: evidence });
  return NextResponse.redirect(publicAppUrl(`/companies/${item.actionPlan.companyId}/actions`), 303);
}
