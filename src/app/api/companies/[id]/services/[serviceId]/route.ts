import { publicAppUrl } from '@/lib/public-url';
import { ServiceStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { nonNegativeInteger, optionalDate, optionalMoney, optionalText, requiredText } from '@/domain/companies/validation';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; serviceId: string }> }) {
  const { id: companyId, serviceId } = await params;
  const authorization = await authorizeTenantApi('company.write');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const before = await db.serviceContract.findFirst({ where: { id: serviceId, companyId, company: { tenantId: tenant.id } } });
  if (!before) return new Response('Serviço não encontrado', { status: 404 });

  try {
    const form = await request.formData();
    const operation = String(form.get('operation') ?? 'update');
    if (!['update', 'archive', 'restore'].includes(operation)) return new Response('Operação inválida', { status: 400 });
    if (operation === 'archive' || operation === 'restore') {
      const after = await db.serviceContract.update({ where: { id: serviceId }, data: { active: operation === 'restore' } });
      await audit({ tenantId: tenant.id, companyId, userId: user.id, action: operation.toUpperCase(), entityType: 'ServiceContract', entityId: serviceId, before, after });
      return NextResponse.redirect(publicAppUrl(`/companies/${companyId}/services?updated=1`), 303);
    }

    const code = requiredText(form.get('code'), 'Código', 50).toUpperCase();
    const statusValue = String(form.get('status') ?? before.status);
    if (!Object.values(ServiceStatus).includes(statusValue as ServiceStatus)) return new Response('Situação inválida', { status: 400 });
    const duplicate = await db.serviceContract.findFirst({ where: { companyId, code, id: { not: serviceId } }, select: { id: true } });
    if (duplicate) return new Response('Código de serviço já utilizado', { status: 409 });
    const dueAt = optionalDate(form.get('dueAt'));
    const startsAt = optionalDate(form.get('startsAt'));
    if (dueAt && startsAt && dueAt < startsAt) return new Response('O prazo não pode ser anterior ao início', { status: 400 });

    const after = await db.serviceContract.update({ where: { id: serviceId }, data: {
      code,
      name: requiredText(form.get('name'), 'Serviço'),
      category: optionalText(form.get('category'), 100),
      description: optionalText(form.get('description'), 3000),
      status: statusValue as ServiceStatus,
      contractedValue: optionalMoney(form.get('contractedValue')),
      contractedAt: optionalDate(form.get('contractedAt')),
      startsAt,
      dueAt,
      deliveredAt: optionalDate(form.get('deliveredAt')),
      renewalAt: optionalDate(form.get('renewalAt')),
      renewalNoticeDays: Math.min(365, nonNegativeInteger(form.get('renewalNoticeDays'), 30)),
      responsibleName: optionalText(form.get('responsibleName'), 200),
      purchaseOrder: optionalText(form.get('purchaseOrder'), 100),
      notes: optionalText(form.get('notes'), 4000),
    } });
    await audit({ tenantId: tenant.id, companyId, userId: user.id, action: 'UPDATE', entityType: 'ServiceContract', entityId: serviceId, before, after });
    return NextResponse.redirect(publicAppUrl(`/companies/${companyId}/services?updated=1`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Dados inválidos', { status: 400 });
  }
}
