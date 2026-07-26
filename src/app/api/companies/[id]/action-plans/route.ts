import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { optionalDate, optionalText, requiredText } from '@/domain/inspections/validation';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('action.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const company = await db.company.findFirst({ where: { id, tenantId: tenant.id, status: 'ACTIVE' } });
  if (!company) return new Response('Empresa não encontrada', { status: 404 });
  const form = await request.formData();
  try {
    const yearRaw = String(form.get('year') ?? '').trim();
    const year = yearRaw ? Number(yearRaw) : null;
    if (year !== null && (!Number.isInteger(year) || year < 2000 || year > 2200)) throw new Error('Ano inválido.');
    const plan = await db.actionPlan.create({ data: {
      companyId: id, name: requiredText(form.get('name'), 'Nome do plano', 200), year,
      status: optionalText(form.get('status'), 40) ?? 'ACTIVE', reviewDueAt: optionalDate(form.get('reviewDueAt')),
    } });
    await audit({ tenantId: tenant.id, companyId: id, userId: user.id, action: 'CREATE', entityType: 'ActionPlan', entityId: plan.id, after: plan });
    return NextResponse.redirect(publicAppUrl(`/companies/${id}/actions`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Plano inválido', { status: 400 });
  }
}
