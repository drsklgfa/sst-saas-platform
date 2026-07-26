import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { toPrismaJson } from '@/lib/prisma-json';
import { optionalDate, optionalText, requiredText, stringList } from '@/domain/inspections/validation';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('inspection.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const before = await db.inspection.findFirst({ where: { id, company: { tenantId: tenant.id } } });
  if (!before) return new Response('Vistoria não encontrada', { status: 404 });
  const form = await request.formData();
  const gheId = String(form.get('gheId') ?? '').trim() || null;
  if (gheId) {
    const ghe = await db.gHE.findFirst({ where: { id: gheId, active: true, sector: { establishment: { companyId: before.companyId } } } });
    if (!ghe) return new Response('GHE inválido para esta empresa', { status: 400 });
  }
  try {
    const metadata = {
      activity: optionalText(form.get('activity'), 3000),
      environment: optionalText(form.get('environment'), 3000),
      workOrganization: optionalText(form.get('workOrganization'), 3000),
      observedWorkers: Number(String(form.get('observedWorkers') ?? '0')) || 0,
      participants: stringList(form.get('participants'), 30),
    };
    const updated = await db.inspection.update({
      where: { id },
      data: {
        title: requiredText(form.get('title'), 'Título', 200), gheId,
        performedAt: optionalDate(form.get('performedAt')) ?? before.performedAt,
        notes: optionalText(form.get('notes'), 8000),
        metadata: toPrismaJson(metadata),
      },
    });
    await audit({ tenantId: tenant.id, companyId: before.companyId, userId: user.id, action: 'UPDATE', entityType: 'Inspection', entityId: id, before, after: updated });
    return NextResponse.redirect(publicAppUrl(`/inspections/${id}`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Dados inválidos', { status: 400 });
  }
}
