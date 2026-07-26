import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { audit } from '@/lib/audit';

export async function POST(request: Request) {
  const authorization = await authorizeTenantApi('company.write');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const form = await request.formData();
  const legalName = String(form.get('legalName') ?? '').trim();
  const tradeName = String(form.get('tradeName') ?? '').trim() || null;
  const cnpj = String(form.get('cnpj') ?? '').replace(/\D/g, '') || null;
  const riskGrade = Number(form.get('riskGrade')) || null;
  const employeeCount = Math.max(0, Number(form.get('employeeCount')) || 0);
  if (!legalName || legalName.length > 200) return new Response('Razão social inválida', { status: 400 });
  if (cnpj && cnpj.length !== 14) return new Response('CNPJ deve conter 14 dígitos', { status: 400 });
  if (riskGrade && ![1, 2, 3, 4].includes(riskGrade)) return new Response('Grau de risco inválido', { status: 400 });
  if (cnpj && await db.company.findFirst({ where: { tenantId: tenant.id, cnpj } })) return new Response('CNPJ já cadastrado', { status: 409 });

  const company = await db.company.create({
    data: {
      tenantId: tenant.id,
      legalName,
      tradeName,
      cnpj,
      primaryCnae: String(form.get('primaryCnae') ?? '').trim() || null,
      riskGrade,
      employeeCount,
    },
  });
  await audit({ tenantId: tenant.id, userId: user.id, companyId: company.id, action: 'CREATE', entityType: 'Company', entityId: company.id, after: company });
  return NextResponse.redirect(publicAppUrl(`/companies/${company.id}`), 303);
}
