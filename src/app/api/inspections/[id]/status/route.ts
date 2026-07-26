import { publicAppUrl } from '@/lib/public-url';
import type { InspectionStatus } from '@prisma/client';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { inspectionStatuses, optionalText } from '@/domain/inspections/validation';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('inspection.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const before = await db.inspection.findFirst({ where: { id, company: { tenantId: tenant.id } }, include: { items: true } });
  if (!before) return new Response('Vistoria não encontrada', { status: 404 });
  const form = await request.formData();
  const status = String(form.get('status')) as InspectionStatus;
  if (!inspectionStatuses.has(status)) return new Response('Status inválido', { status: 400 });
  if ((status === 'COMPLETED' || status === 'REVIEWED') && before.items.length === 0) return new Response('Inclua ao menos um item técnico antes de concluir.', { status: 409 });
  const reason = optionalText(form.get('reason'), 1000);
  if (before.status === 'REVIEWED' && status !== 'REVIEWED' && !reason) return new Response('Informe a justificativa para reabrir uma vistoria revisada.', { status: 400 });
  const updated = await db.inspection.update({ where: { id }, data: { status } });
  await audit({ tenantId: tenant.id, companyId: before.companyId, userId: user.id, action: 'STATUS_CHANGE', entityType: 'Inspection', entityId: id, before: { status: before.status }, after: { status }, metadata: { reason } });
  return NextResponse.redirect(publicAppUrl(`/inspections/${id}`), 303);
}
