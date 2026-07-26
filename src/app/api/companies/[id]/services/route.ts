import { publicAppUrl } from '@/lib/public-url';
import { ServiceStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { nonNegativeInteger, optionalDate, optionalMoney, optionalText, requiredText } from '@/domain/companies/validation';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const authorization = await authorizeTenantApi('company.write');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const company = await db.company.findFirst({ where: { id: companyId, tenantId: tenant.id }, select: { id: true } });
  if (!company) return new Response('Empresa não encontrada', { status: 404 });

  try {
    const form = await request.formData();
    const code = requiredText(form.get('code'), 'Código', 50).toUpperCase();
    const statusValue = String(form.get('status') ?? 'PROPOSAL');
    if (!Object.values(ServiceStatus).includes(statusValue as ServiceStatus)) return new Response('Situação inválida', { status: 400 });
    if (await db.serviceContract.findFirst({ where: { companyId, code }, select: { id: true } })) return new Response('Código de serviço já utilizado', { status: 409 });
    const dueAt = optionalDate(form.get('dueAt'));
    const startsAt = optionalDate(form.get('startsAt'));
    if (dueAt && startsAt && dueAt < startsAt) return new Response('O prazo não pode ser anterior ao início', { status: 400 });

    const service = await db.serviceContract.create({ data: {
      companyId,
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
    await audit({ tenantId: tenant.id, companyId, userId: user.id, action: 'CREATE', entityType: 'ServiceContract', entityId: service.id, after: service });
    return NextResponse.redirect(publicAppUrl(`/companies/${companyId}/services?created=1`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Dados inválidos', { status: 400 });
  }
}
