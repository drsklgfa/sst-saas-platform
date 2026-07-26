import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { toPrismaJson } from '@/lib/prisma-json';
import { optionalText, requiredText } from '@/domain/inspections/validation';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('inspection.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const inspection = await db.inspection.findFirst({ where: { id, company: { tenantId: tenant.id } }, include: { items: true } });
  if (!inspection) return new Response('Vistoria não encontrada', { status: 404 });
  if (inspection.status === 'REVIEWED') return new Response('Vistoria revisada é imutável. Reabra antes de alterar.', { status: 409 });
  const form = await request.formData();
  try {
    const code = requiredText(form.get('code'), 'Código', 80).toUpperCase().replace(/[^A-Z0-9_-]+/g, '_');
    const value = {
      result: String(form.get('result') ?? 'NA'),
      observation: optionalText(form.get('observation'), 3000),
      recommendation: optionalText(form.get('recommendation'), 3000),
      critical: form.get('critical') === 'on',
    };
    const item = await db.inspectionItem.upsert({
      where: { inspectionId_code: { inspectionId: id, code } },
      update: { category: requiredText(form.get('category'), 'Categoria', 120), label: requiredText(form.get('label'), 'Item', 300), value: toPrismaJson(value) },
      create: { inspectionId: id, code, category: requiredText(form.get('category'), 'Categoria', 120), label: requiredText(form.get('label'), 'Item', 300), value: toPrismaJson(value), position: inspection.items.length + 1 },
    });
    await audit({ tenantId: tenant.id, companyId: inspection.companyId, userId: user.id, action: 'UPSERT', entityType: 'InspectionItem', entityId: item.id, after: item });
    return NextResponse.redirect(publicAppUrl(`/inspections/${id}`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Item inválido', { status: 400 });
  }
}
