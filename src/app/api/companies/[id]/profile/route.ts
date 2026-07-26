import { publicAppUrl } from '@/lib/public-url';
import { CompanyStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { digits, nonNegativeInteger, optionalText, requiredText } from '@/domain/companies/validation';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('company.write');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const before = await db.company.findFirst({ where: { id, tenantId: tenant.id } });
  if (!before) return new Response('Empresa não encontrada', { status: 404 });

  try {
    const form = await request.formData();
    const legalName = requiredText(form.get('legalName'), 'Razão social');
    const cnpj = digits(form.get('cnpj'), 14);
    if (cnpj && cnpj.length !== 14) return new Response('CNPJ deve conter 14 dígitos', { status: 400 });
    const riskText = String(form.get('riskGrade') ?? '').trim();
    const riskGrade = riskText ? Number(riskText) : null;
    if (riskGrade !== null && ![1, 2, 3, 4].includes(riskGrade)) return new Response('Grau de risco inválido', { status: 400 });
    const statusValue = String(form.get('status') ?? 'ACTIVE');
    if (!Object.values(CompanyStatus).includes(statusValue as CompanyStatus)) return new Response('Situação inválida', { status: 400 });
    if (cnpj) {
      const duplicate = await db.company.findFirst({ where: { tenantId: tenant.id, cnpj, id: { not: id } }, select: { id: true } });
      if (duplicate) return new Response('CNPJ já cadastrado em outra empresa', { status: 409 });
    }

    const company = await db.company.update({
      where: { id },
      data: {
        legalName,
        tradeName: optionalText(form.get('tradeName'), 200),
        cnpj,
        primaryCnae: optionalText(form.get('primaryCnae'), 30),
        riskGrade,
        employeeCount: nonNegativeInteger(form.get('employeeCount')),
        managerName: optionalText(form.get('managerName'), 200),
        status: statusValue as CompanyStatus,
      },
    });
    await audit({ tenantId: tenant.id, companyId: id, userId: user.id, action: 'UPDATE', entityType: 'Company', entityId: id, before, after: company });
    return NextResponse.redirect(publicAppUrl(`/companies/${id}/profile?saved=1`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Dados inválidos', { status: 400 });
  }
}
